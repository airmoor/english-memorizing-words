import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WordsService } from '../words/words.service';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { ImportRequestDto } from './dto/import-request.dto';
import { ImportPreviewResultDto, ImportPreviewRowDto } from './dto/import-preview-result.dto';
import { ImportExecuteResultDto, ImportErrorRowDto } from './dto/import-execute-result.dto';
import { ImportStatus } from './dto/import-status';
import { normalizeWord } from './normalize-word';

// ── Constants ──────────────────────────────────────────────────────────────────

const NOTE_MAX_LENGTH = 1000;
const ENRICH_CONCURRENCY = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

    // Normalise words and preserve parser-assigned identity fields.
    //
    // lineNumber: use the parser's 1-based source line (accurate for CSV, Anki, and
    //   multi-section files with headers). Falls back to array position only when the
    //   client doesn't send it (backward compatibility with older payloads).
    //
    // parserStatus: when the parser already determined 'duplicate_within_batch', the
    //   backend trusts that decision and does NOT re-compute it. Parser owns within-batch
    //   deduplication; backend owns vocabulary duplicate detection. Keeping these
    //   responsibilities separate avoids divergence between client display and server response.
    const normalised: Array<{
      text: string;
      lineNumber: number;
      clientRowId?: string;
      parserStatus?: 'valid' | 'duplicate_within_batch' | 'error';
      parserReason?: string;
    }> = [];

    for (let i = 0; i < dto.words.length; i++) {
      const row = dto.words[i];
      const text = normalizeWord(row.word);
      if (!text) continue; // skip rows that normalise to empty (defensive against malformed input)
      normalised.push({
        text,
        lineNumber: row.lineNumber ?? i + 1,
        clientRowId: row.clientRowId,
        parserStatus: row.parserStatus,
        parserReason: row.parserReason,
      });
    }

    // Collect unique words for vocabulary lookup.
    // Rows already marked 'duplicate_within_batch' by the parser are excluded —
    // they will never be imported anyway, so a vocabulary check is wasteful.
    const uniqueTexts: string[] = [];
    const firstOccurrence = new Map<string, number>(); // word → lineNumber of first non-duplicate

    for (const { text, lineNumber, parserStatus } of normalised) {
      if (parserStatus === 'duplicate_within_batch') continue;
      if (!firstOccurrence.has(text)) {
        firstOccurrence.set(text, lineNumber);
        uniqueTexts.push(text);
      }
    }

    // Single-batch vocabulary check — no dictionary calls, no N+1 queries.
    const vocabSet = await this.getExistingVocabularySet(userId, uniqueTexts);

    const noteTruncated = new Set<number>();
    for (let i = 0; i < dto.words.length; i++) {
      const notes = dto.words[i].notes;
      if (notes && notes.length > NOTE_MAX_LENGTH) noteTruncated.add(i);
    }

    for (let i = 0; i < normalised.length; i++) {
      const { text, lineNumber, clientRowId, parserStatus, parserReason } = normalised[i];

      let row: ImportPreviewRowDto;

      if (parserStatus === 'duplicate_within_batch') {
        // Parser is authoritative — preserve its determination without re-deriving.
        // Echo the parser's reason so the UI shows the correct first-occurrence line reference.
        row = {
          word: text,
          status: 'duplicate_within_batch',
          reason: parserReason ?? 'Already in this list',
          clientRowId,
          lineNumber,
        };
      } else {
        // Backend determines status for rows the parser didn't mark as duplicates.
        // Covers: valid rows, error rows, and legacy payloads with no parserStatus.
        const firstLine = firstOccurrence.get(text)!;

        if (firstLine !== lineNumber) {
          row = {
            word: text,
            status: 'duplicate_within_batch',
            reason: `Already in this list (line ${firstLine})`,
            clientRowId,
            lineNumber,
          };
        } else if (vocabSet.has(text)) {
          row = {
            word: text,
            status: 'duplicate_vocabulary',
            reason: 'Already in your vocabulary',
            clientRowId,
            lineNumber,
          };
        } else {
          row = { word: text, status: 'valid', clientRowId, lineNumber };
        }
      }

      // Append note truncation warning (non-destructive: appended to existing reason)
      if (noteTruncated.has(i)) {
        const prefix = row.reason ? `${row.reason}. ` : '';
        row.reason = `${prefix}Note truncated to ${NOTE_MAX_LENGTH} characters`;
      }

      rows.push(row);
    }

    return { rows };
  }

  // ── POST /import/execute ───────────────────────────────────────────────────

  async execute(userId: string, dto: ImportRequestDto): Promise<ImportExecuteResultDto> {
    let imported = 0;
    let skipped = 0;
    let duplicatesIgnored = 0;
    const errorRows: ImportErrorRowDto[] = [];

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
      if (!word) continue; // skip rows that normalise to empty

      // Trust the parser's within-batch duplicate determination when provided.
      // This keeps the parser as the single authoritative source and avoids recomputing
      // what the client already calculated from source line numbers.
      if (row.parserStatus === 'duplicate_within_batch') {
        duplicatesIgnored++;
        continue;
      }

      // Fall back to backend deduplication for rows without parserStatus
      // (legacy clients, or rows the parser didn't explicitly mark).
      if (seenInBatch.has(word)) {
        duplicatesIgnored++;
        continue;
      }
      seenInBatch.add(word);

      candidates.push({
        word,
        tags: (row.tags ?? []).map((t: string) => normalizeWord(t)).filter(Boolean),
        board: row.board?.trim() || undefined,
        notes: row.notes ? row.notes.slice(0, NOTE_MAX_LENGTH) : undefined,
        clientRowId: row.clientRowId,
        lineNumber: row.lineNumber,
      });
    }

    // Check existing vocabulary for skip mode (single batch query)
    const existingVocab =
      dto.settings.duplicateMode === 'skip'
        ? await this.getExistingVocabularySet(userId, candidates.map((c) => c.word))
        : new Set<string>();

    const toEnrich: typeof candidates = [];
    for (const candidate of candidates) {
      if (dto.settings.duplicateMode === 'skip' && existingVocab.has(candidate.word)) {
        skipped++;
      } else {
        toEnrich.push(candidate);
      }
    }

    // Resolve board IDs upfront — deduplicate board names within the batch.
    // settings.boardId is already a resolved ID; per-row board names need a find-or-create.
    const boardIdCache = new Map<string, string>();

    if (!dto.settings.boardId) {
      const boardNamesNeeded = new Set<string>();
      for (const c of toEnrich) {
        if (c.board) boardNamesNeeded.add(c.board);
      }
      // Resolve all unique board names in parallel — upserts are safe under concurrent load.
      await Promise.all(
        [...boardNamesNeeded].map(async (boardName) => {
          try {
            boardIdCache.set(boardName, await this.findOrCreateBoardByName(userId, boardName));
          } catch (err) {
            this.logger.warn(`Failed to resolve board "${boardName}": ${String(err)}`);
          }
        }),
      );
    }

    // Enrich words in parallel batches — cards are created only after meanings resolve.
    // No null-meaning cards are ever created; failed enrichment goes to errorRows instead.
    const enrichResults = await runInBatches(
      toEnrich,
      ENRICH_CONCURRENCY,
      async (candidate) => {
        const wordDto = await this.wordsService.findWord(candidate.word);

        // Create card only after meanings are resolved (invariant: no null-meaning cards)
        await this.vocabularyService.saveWord(userId, wordDto.id);

        const cardId = await this.getCardId(userId, wordDto.id);
        if (!cardId) {
          throw new Error(`Card not found after saveWord for "${candidate.word}"`);
        }

        const resolvedBoardId = dto.settings.boardId
          ? dto.settings.boardId
          : candidate.board
            ? boardIdCache.get(candidate.board)
            : undefined;

        if (resolvedBoardId) {
          await this.assignCardToBoard(userId, cardId, resolvedBoardId);
        }

        if (dto.settings.tagIds && dto.settings.tagIds.length > 0) {
          for (const tagId of dto.settings.tagIds) {
            await this.assignCardToTag(cardId, tagId);
          }
        }

        for (const tagName of candidate.tags) {
          await this.findOrCreateAndAssignTag(userId, cardId, tagName);
        }

        if (candidate.notes) {
          await this.upsertCardNote(cardId, candidate.notes);
        }

        return candidate.word;
      },
    );

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
    const status = this.deriveImportStatus({ imported, errors, skipped, duplicatesIgnored });

    return { status, imported, skipped, duplicatesIgnored, errors, errorRows };
  }

  // ── Derive ImportStatus ───────────────────────────────────────────────────

  /**
   * Map execution counters to a semantic ImportStatus.
   *
   * All four counters are accepted explicitly to document that skipped and
   * duplicatesIgnored are intentionally excluded from status derivation —
   * they represent successful no-ops, not failures.
   *
   * 'no_changes' is distinct from 'failed': the request succeeded and was
   * processed correctly, but every word was already in vocabulary or was a
   * duplicate. Nothing was created. 'failed' is reserved for enrichment errors.
   */
  private deriveImportStatus(counts: {
    imported: number;
    errors: number;
    skipped: number;
    duplicatesIgnored: number;
  }): ImportStatus {
    const { imported, errors } = counts;
    if (imported > 0 && errors === 0) return 'completed';
    if (imported > 0 && errors > 0)   return 'partial_failure';
    if (imported === 0 && errors === 0) return 'no_changes';
    return 'failed'; // imported === 0 && errors > 0
  }

  // ── DB helpers ────────────────────────────────────────────────────────────

  /**
   * Single-batch vocabulary lookup — no N+1 queries.
   * Uses ANY($2) to send all words in one round-trip.
   * Relies on index: CREATE INDEX IF NOT EXISTS idx_words_text ON words (text)
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

    // DO UPDATE SET name = EXCLUDED.name is the idiomatic pattern for "upsert and always
    // RETURNING id". It avoids the two-round-trip DO NOTHING + SELECT alternative, which
    // introduces a race window between the INSERT and the SELECT.
    const [tag] = await this.dataSource.query<{ id: string }[]>(
      `INSERT INTO tags (id, user_id, name)
       VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
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
