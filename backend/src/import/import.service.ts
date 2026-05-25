import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WordsService } from '../words/words.service';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { ImportRequestDto } from './dto/import-request.dto';
import { ImportPreviewResultDto, ImportPreviewRowDto } from './dto/import-preview-result.dto';
import { ImportExecuteResultDto, ImportErrorRowDto } from './dto/import-execute-result.dto';
import { ImportStatus } from './dto/import-status';

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_BATCH_SIZE = 500;
const NOTE_MAX_LENGTH = 1000;
const ENRICH_CONCURRENCY = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise a raw word for storage and deduplication.
 * Steps:
 *   1. NFKC Unicode normalisation — collapses compatibility equivalents (e.g. ﬁ → fi)
 *   2. Trim surrounding whitespace
 *   3. Collapse internal runs of whitespace to a single space
 *   4. Locale-aware lowercase (en) — consistent across server locales
 *
 * Must match frontend `normalizeWord()` in shared/lib/import/normalizeWord.ts.
 */
function normalizeWord(raw: string): string {
  return raw.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

/**
 * Run an array of async tasks in batches of `concurrency` at a time.
 * Returns an array of settled results (value or Error) in order.
 */
async function runInBatches<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<Array<{ ok: true; value: R } | { ok: false; error: Error }>> {
  const results: Array<{ ok: true; value: R } | { ok: false; error: Error }> = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map(fn));
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        results.push({ ok: true, value: s.value });
      } else {
        results.push({ ok: false, error: s.reason instanceof Error ? s.reason : new Error(String(s.reason)) });
      }
    }
  }
  return results;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly wordsService: WordsService,
    private readonly vocabularyService: VocabularyService,
    private readonly dataSource: DataSource,
  ) {}

  // ── POST /import/preview ───────────────────────────────────────────────────

  async preview(userId: string, dto: ImportRequestDto): Promise<ImportPreviewResultDto> {
    const rows: ImportPreviewRowDto[] = [];

    // Track: normalised word → line index (1-based) of first occurrence
    const seenWords = new Map<string, number>();

    // Normalise and detect within-batch duplicates
    const normalised: Array<{ original: string; text: string; lineNumber: number }> = [];
    for (let i = 0; i < dto.words.length; i++) {
      const original = dto.words[i].word;
      const text = normalizeWord(original);
      normalised.push({ original, text, lineNumber: i + 1 });
    }

    // Collect unique words to check against vocabulary
    const uniqueTexts: string[] = [];
    const firstOccurrence = new Map<string, number>();

    for (const { text, lineNumber } of normalised) {
      if (!firstOccurrence.has(text)) {
        firstOccurrence.set(text, lineNumber);
        uniqueTexts.push(text);
      }
    }

    // Check vocabulary duplicates server-side (no dictionary calls)
    const vocabSet = await this.getExistingVocabularySet(userId, uniqueTexts);

    // Note truncation warning set
    const noteTruncated = new Set<number>();
    for (let i = 0; i < dto.words.length; i++) {
      const notes = dto.words[i].notes;
      if (notes && notes.length > NOTE_MAX_LENGTH) {
        noteTruncated.add(i);
      }
    }

    // Build response rows
    for (let i = 0; i < normalised.length; i++) {
      const { text, lineNumber } = normalised[i];
      const firstLine = firstOccurrence.get(text)!;

      let row: ImportPreviewRowDto;

      if (firstLine !== lineNumber) {
        // Within-batch duplicate — subsequent occurrence
        row = {
          word: text,
          status: 'duplicate_within_batch',
          reason: `Already in this list (line ${firstLine})`,
        };
      } else if (vocabSet.has(text)) {
        row = {
          word: text,
          status: 'duplicate_vocabulary',
          reason: 'Already in your vocabulary',
        };
      } else {
        row = { word: text, status: 'valid' };
      }

      // Append note truncation warning if applicable
      if (noteTruncated.has(i)) {
        const existing = row.reason ? `${row.reason}. ` : '';
        row.reason = `${existing}Note truncated to ${NOTE_MAX_LENGTH} characters`;
      }

      rows.push(row);
    }

    return { rows };
  }

  // ── POST /import/execute ───────────────────────────────────────────────────

  async execute(userId: string, dto: ImportRequestDto): Promise<ImportExecuteResultDto> {
    let imported = 0;
    let skipped = 0;
    const errorRows: ImportErrorRowDto[] = [];

    // Normalise and deduplicate within batch (first occurrence wins)
    const seenInBatch = new Set<string>();
    const candidates: Array<{
      word: string;
      tags: string[];
      board?: string;
      notes?: string;
      clientRowId?: string;
      lineNumber?: number;
    }> = [];

    for (const row of dto.words) {
      const word = normalizeWord(row.word);
      if (!word) continue;
      if (seenInBatch.has(word)) continue; // skip subsequent occurrences
      seenInBatch.add(word);

      const notes = row.notes
        ? row.notes.slice(0, NOTE_MAX_LENGTH)
        : undefined;

      candidates.push({
        word,
        tags: (row.tags ?? []).map((t: string) => normalizeWord(t)).filter(Boolean),
        board: row.board?.trim() || undefined,
        notes,
        clientRowId: row.clientRowId,
        lineNumber: row.lineNumber,
      });
    }

    // Check existing vocabulary for skip mode
    const existingVocab =
      dto.settings.duplicateMode === 'skip'
        ? await this.getExistingVocabularySet(userId, candidates.map((c) => c.word))
        : new Set<string>();

    // Separate words to enrich from words to skip
    const toEnrich: typeof candidates = [];
    for (const candidate of candidates) {
      if (dto.settings.duplicateMode === 'skip' && existingVocab.has(candidate.word)) {
        skipped++;
      } else {
        toEnrich.push(candidate);
      }
    }

    // Resolve board IDs upfront — deduplicate board names within batch
    const boardIdCache = new Map<string, string>(); // boardName → boardId
    if (dto.settings.boardId) {
      // settings.boardId is already resolved — no need to look up by name
    }

    // Pre-collect all unique board names for batch resolution
    const boardNamesNeeded = new Set<string>();
    if (!dto.settings.boardId) {
      for (const c of toEnrich) {
        if (c.board) boardNamesNeeded.add(c.board);
      }
    }
    for (const boardName of boardNamesNeeded) {
      try {
        const boardId = await this.findOrCreateBoardByName(userId, boardName);
        boardIdCache.set(boardName, boardId);
      } catch (err) {
        this.logger.warn(`Failed to resolve board "${boardName}": ${String(err)}`);
      }
    }

    // Enrich words in parallel batches of ENRICH_CONCURRENCY
    const enrichResults = await runInBatches(
      toEnrich,
      ENRICH_CONCURRENCY,
      async (candidate) => {
        // Cache-first word resolution; throws if not found in any provider
        const wordDto = await this.wordsService.findWord(candidate.word);

        // Create card only after meanings are resolved
        await this.vocabularyService.saveWord(userId, wordDto.id);

        // Retrieve the card ID
        const cardId = await this.getCardId(userId, wordDto.id);
        if (!cardId) {
          throw new Error(`Card not found after saveWord for "${candidate.word}"`);
        }

        // Apply board assignment
        const resolvedBoardId = dto.settings.boardId
          ? dto.settings.boardId
          : candidate.board
            ? boardIdCache.get(candidate.board)
            : undefined;

        if (resolvedBoardId) {
          await this.assignCardToBoard(userId, cardId, resolvedBoardId);
        }

        // Apply global tags (by ID)
        if (dto.settings.tagIds && dto.settings.tagIds.length > 0) {
          for (const tagId of dto.settings.tagIds) {
            await this.assignCardToTag(cardId, tagId);
          }
        }

        // Apply row-level tags (by name — find or create)
        for (const tagName of candidate.tags) {
          await this.findOrCreateAndAssignTag(userId, cardId, tagName);
        }

        // Apply note
        if (candidate.notes) {
          await this.upsertCardNote(cardId, candidate.notes);
        }

        return candidate.word;
      },
    );

    // Tally results
    for (let i = 0; i < toEnrich.length; i++) {
      const result = enrichResults[i];
      if (result.ok) {
        imported++;
      } else {
        const word = toEnrich[i].word;
        const reason =
          result.error.message.includes('not found') ||
          result.error.message.includes('404') ||
          result.error.message.includes('No results')
            ? 'Word not found in dictionary'
            : `Import failed: ${result.error.message}`;
        errorRows.push({
          word,
          reason,
          ...(toEnrich[i].clientRowId ? { clientRowId: toEnrich[i].clientRowId } : {}),
          ...(toEnrich[i].lineNumber  ? { lineNumber:  toEnrich[i].lineNumber }  : {}),
        });
      }
    }

    const errors = errorRows.length;
    const status = this.deriveImportStatus(imported, errors);

    return { status, imported, skipped, errors, errorRows };
  }

  // ── Task 1.15: Derive ImportStatus ────────────────────────────────────────

  private deriveImportStatus(imported: number, errors: number): ImportStatus {
    if (errors === 0) return 'completed';
    if (imported > 0 && errors > 0) return 'partial_failure';
    return 'failed';
  }

  // ── DB helpers ────────────────────────────────────────────────────────────

  /**
   * Single-batch vocabulary lookup — no N+1 queries.
   * The ANY($2) operator sends all words in one round-trip.
   * Relies on index: `CREATE INDEX IF NOT EXISTS idx_words_text ON words (text);`
   */
  private async getExistingVocabularySet(userId: string, words: string[]): Promise<Set<string>> {
    if (words.length === 0) return new Set();

    const rows = await this.dataSource.query<{ text: string }[]>(
      `SELECT w.text
       FROM user_words uw
       JOIN words w ON w.id = uw.word_id
       WHERE uw.user_id = $1
         AND w.text = ANY($2)`,
      [userId, words],
    );

    return new Set(rows.map((r) => r.text));
  }

  private async getCardId(userId: string, wordId: string): Promise<string | null> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM cards WHERE user_id = $1 AND word_id = $2`,
      [userId, wordId],
    );
    return rows[0]?.id ?? null;
  }

  /**
   * Find a board by name for the user, or create it if it doesn't exist.
   * Board names retain original casing.
   */
  private async findOrCreateBoardByName(userId: string, name: string): Promise<string> {
    const trimmed = name.trim();
    const rows = await this.dataSource.query<{ id: string }[]>(
      `INSERT INTO boards (id, user_id, name, position)
       VALUES (gen_random_uuid(), $1, $2, 0)
       ON CONFLICT (user_id, name) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [userId, trimmed],
    );
    return rows[0].id;
  }

  private async assignCardToBoard(userId: string, cardId: string, boardId: string): Promise<void> {
    // Verify the board belongs to the user before assigning
    const owned = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM boards WHERE id = $1 AND user_id = $2`,
      [boardId, userId],
    );
    if (owned.length === 0) {
      this.logger.warn(`Board ${boardId} not found for user ${userId} — skipping assignment`);
      return;
    }

    await this.dataSource.query(
      `INSERT INTO card_boards (card_id, board_id)
       VALUES ($1, $2)
       ON CONFLICT (card_id, board_id) DO NOTHING`,
      [cardId, boardId],
    );
  }

  private async assignCardToTag(cardId: string, tagId: string): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO card_tags (card_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (card_id, tag_id) DO NOTHING`,
      [cardId, tagId],
    );
  }

  private async findOrCreateAndAssignTag(userId: string, cardId: string, name: string): Promise<void> {
    const normalised = name.trim().toLowerCase();
    if (!normalised) return;

    const [tag] = await this.dataSource.query<{ id: string }[]>(
      `INSERT INTO tags (id, user_id, name)
       VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (user_id, name) DO UPDATE SET updated_at = tags.updated_at
       RETURNING id`,
      [userId, normalised],
    );

    await this.dataSource.query(
      `INSERT INTO card_tags (card_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (card_id, tag_id) DO NOTHING`,
      [cardId, tag.id],
    );
  }

  private async upsertCardNote(cardId: string, body: string): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO card_notes (id, card_id, body)
       VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (card_id) DO UPDATE SET body = EXCLUDED.body, updated_at = NOW()`,
      [cardId, body],
    );
  }
}
