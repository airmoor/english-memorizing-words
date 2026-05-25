import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { DataSource } from 'typeorm';
import { humaniseReviewTime } from '../reviews/review-timing.service';

// ── DTOs ────────────────────────────────────────────────────────────────────

export class VocabularyMeaningDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'lasting a very short time' })
  definition: string;

  @ApiProperty({ example: 'adjective', nullable: true })
  partOfSpeech: string | null;

  @ApiProperty({ example: '1a', nullable: true })
  senseNumber: string | null;

  @ApiProperty({ example: ['transitory', 'fleeting'], type: [String] })
  synonyms: string[];

  @ApiProperty({ example: ['his fame proved ephemeral'], type: [String] })
  examples: string[];
}

export class BoardSummaryDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'Academic' })
  name: string;
}

export class TagSummaryDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'business' })
  name: string;
}

export class CardNoteSummaryDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'This word appears in academic contexts.' })
  body: string;
}

export class VocabularyWordDto {
  @ApiProperty({ example: 'uuid-v4' })
  userWordId: string;

  @ApiProperty({ example: 'uuid-v4' })
  wordId: string;

  @ApiProperty({ example: 'uuid-v4' })
  cardId: string;

  @ApiProperty({ example: 'ephemeral' })
  wordText: string;

  @ApiProperty({ example: 'ɪˈfɛmərəl', nullable: true })
  transcription: string | null;

  @ApiProperty({ example: 'merriam-webster' })
  provider: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  savedAt: Date;

  // ── Learning state (from cards table) ─────────────────────────────────────
  // Null when no card exists (defensive — saveWord always creates a card).

  @ApiProperty({ example: '2024-01-03T00:00:00.000Z', nullable: true })
  nextReview: Date | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', nullable: true })
  lastReviewedAt: Date | null;

  @ApiProperty({ example: 1, nullable: true })
  intervalDays: number | null;

  @ApiProperty({ example: 2.5, nullable: true })
  easeFactor: number | null;

  @ApiProperty({
    example: 'learning',
    enum: ['new', 'due', 'learning', 'review', 'mature'],
    description: 'Computed review state',
  })
  reviewState: string;

  @ApiProperty({ example: 'In 3 days', nullable: true, description: 'Humanised next-review timing' })
  nextReviewHuman: string | null;

  @ApiProperty({ type: [BoardSummaryDto] })
  boards: BoardSummaryDto[];

  @ApiProperty({ type: [TagSummaryDto] })
  tags: TagSummaryDto[];

  @ApiProperty({ type: CardNoteSummaryDto, nullable: true })
  note: CardNoteSummaryDto | null;

  @ApiProperty({ type: [VocabularyMeaningDto] })
  meanings: VocabularyMeaningDto[];
}

export class VocabularyQueryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'ephemeral', description: 'Text search (word or definition)' })
  q?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'new,learning', description: 'Comma-separated legacy filter names' })
  filters?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'learning',
    description: 'Single review-state filter',
    enum: ['new', 'learning', 'review', 'mature', 'dueToday', 'difficult'],
  })
  reviewState?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'adjective', description: 'Filter to words with at least one meaning of this part of speech' })
  partOfSpeech?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'uuid1,uuid2', description: 'Comma-separated tag IDs (AND logic)' })
  tagIds?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'newest', description: 'Sort order', enum: ['newest', 'oldest', 'alphabetical', 'hardest', 'easiest', 'nextReview'] })
  sort?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'asc', description: 'Sort direction for alphabetical sort', enum: ['asc', 'desc'] })
  sortDir?: string;

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({ example: '50', description: 'Page size (1–100, default 50)' })
  limit?: string;

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({ example: '0', description: 'Number of items to skip (default 0)' })
  offset?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ example: 'uuid-v4', description: 'Restrict results to cards in this board' })
  boardId?: string;
}

export class CardNoteDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'uuid-v4' })
  cardId: string;

  @ApiProperty({ example: 'This word appears in academic contexts.' })
  body: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class UpsertNoteDto {
  @ApiProperty({ example: 'This word appears in academic contexts.' })
  @IsString()
  @MaxLength(10_000)
  body: string;
}

export class PaginatedVocabularyDto {
  @ApiProperty({ type: [VocabularyWordDto] })
  items: VocabularyWordDto[];

  @ApiProperty({ example: 123, description: 'Total items matching current filters' })
  total: number;

  @ApiProperty({ example: true })
  hasMore: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Review state computation ──────────────────────────────────────────────────

/**
 * Derives the card's review state.
 *
 * Priority order (first match wins):
 *   1. new      — never reviewed
 *   2. due      — next review is in the past (overdue)
 *   3. mastered — interval ≥ 21 days (high stability, not yet due)
 *   4. upcoming — any other active card whose next review is in the future
 *
 * Matches the ReviewState union on the frontend:
 *   'new' | 'due' | 'upcoming' | 'mastered'
 */
function computeReviewState(
  lastReviewedAt: Date | null,
  intervalDays: number | null,
  nextReview: Date | null,
  now: Date,
): string {
  if (lastReviewedAt === null) return 'new';
  if (nextReview !== null && nextReview <= now) return 'due';
  const days = intervalDays ?? 0;
  if (days >= 21) return 'mastered';
  return 'upcoming';
}

// ── Filter → SQL condition mapping ────────────────────────────────────────────

const FILTER_CONDITIONS: Record<string, string> = {
  // ── New API review states (used by ?reviewState= param) ────────────────
  // These match the ReviewState union: 'new' | 'due' | 'upcoming' | 'mastered'
  new:             'c.last_reviewed_at IS NULL',
  due:             '(c.last_reviewed_at IS NOT NULL AND c.next_review IS NOT NULL AND c.next_review <= NOW())',
  upcoming:        '(c.last_reviewed_at IS NOT NULL AND (c.next_review IS NULL OR c.next_review > NOW()) AND (c.interval_days IS NULL OR c.interval_days < 21))',
  mastered:        '(c.last_reviewed_at IS NOT NULL AND c.interval_days >= 21 AND (c.next_review IS NULL OR c.next_review > NOW()))',
  // ── Legacy client-derived states (used by ?filters= param) ────────────
  // Kept for backward compatibility with the VocabularyToolbar chip system.
  difficult:       '(c.ease_factor IS NOT NULL AND c.ease_factor < 2.0)',
  learning:        '(c.last_reviewed_at IS NOT NULL AND c.interval_days < 7)',
  review:          '(c.interval_days >= 7 AND c.interval_days < 21)',
  mature:          'c.interval_days >= 21',
  // ── Special filters ────────────────────────────────────────────────────
  dueToday:        'c.next_review <= NOW()',
  neverReviewed:   'c.last_reviewed_at IS NULL',
  savedRecently:   "uw.saved_at >= NOW() - INTERVAL '7 days'",
  reviewedRecently: "c.last_reviewed_at >= NOW() - INTERVAL '7 days'",
}

const SORT_MAP: Record<string, string> = {
  newest:       'uw.saved_at DESC',
  oldest:       'uw.saved_at ASC',
  alphabetical: 'w.text ASC',
  hardest:      'c.ease_factor ASC NULLS FIRST',
  easiest:      'c.ease_factor DESC NULLS LAST',
  nextReview:   'c.next_review ASC NULLS LAST',
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class VocabularyService {
  constructor(private readonly dataSource: DataSource) {}

  // ── POST /vocabulary/words/:wordId ───────────────────────────────────────
  // Saves the canonical word to the user's vocabulary and creates a card.
  // Idempotent: repeated calls for the same (user, word) are a no-op.

  async saveWord(userId: string, wordId: string): Promise<void> {
    const [{ exists }] = await this.dataSource.query<[{ exists: boolean }]>(
      `SELECT EXISTS(SELECT 1 FROM words WHERE id = $1) AS exists`,
      [wordId],
    );
    if (!exists) throw new NotFoundException(`Word ${wordId} not found`);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      await qr.query(
        `INSERT INTO user_words (id, user_id, word_id)
         VALUES (gen_random_uuid(), $1, $2)
         ON CONFLICT (user_id, word_id) DO NOTHING`,
        [userId, wordId],
      );

      await qr.query(
        `INSERT INTO cards (id, user_id, word_id, ease_factor, interval_days, next_review)
         VALUES (gen_random_uuid(), $1, $2, 2.5, 0, NOW())
         ON CONFLICT (user_id, word_id) DO NOTHING`,
        [userId, wordId],
      );

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── GET /vocabulary ───────────────────────────────────────────────────────
  // Returns a paginated, filtered, sorted list of saved words with nested meanings.

  // TODO: replace offset pagination with cursor-based pagination when traffic warrants it
  async getUserVocabulary(
    userId: string,
    dto: VocabularyQueryDto,
  ): Promise<PaginatedVocabularyDto> {
    const q      = (dto.q ?? '').trim()
    const baseSort = SORT_MAP[dto.sort ?? ''] ?? SORT_MAP.newest
    // Allow sortDir to flip alphabetical; all other sorts have fixed direction
    const sort = (dto.sort === 'alphabetical' && dto.sortDir === 'desc')
      ? 'w.text DESC'
      : baseSort
    const limit  = Math.min(Math.max(parseInt(dto.limit  ?? '50',  10) || 50,  1), 100)
    const offset = Math.max(parseInt(dto.offset ?? '0', 10) || 0, 0)

    const activeFilters = (dto.filters ?? '')
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)

    // ── Build WHERE clause ────────────────────────────────────────────────
    const params: unknown[] = [userId]
    const where: string[]   = ['uw.user_id = $1']

    if (q) {
      params.push(`%${q}%`)
      const p = params.length
      where.push(`(
        w.text ILIKE $${p}
        OR EXISTS (
          SELECT 1 FROM meanings m2
          WHERE m2.word_id = w.id AND m2.definition ILIKE $${p}
        )
      )`)
    }

    if (activeFilters.length > 0) {
      const conds = activeFilters
        .map((f) => FILTER_CONDITIONS[f])
        .filter(Boolean)
      if (conds.length > 0) {
        where.push(`(${conds.join(' OR ')})`)
      }
    }

    // Single review-state filter (takes precedence over legacy filters param)
    if (dto.reviewState && FILTER_CONDITIONS[dto.reviewState]) {
      where.push(FILTER_CONDITIONS[dto.reviewState])
    }

    // Part-of-speech filter: word must have ≥1 meaning with matching PoS
    if (dto.partOfSpeech) {
      params.push(dto.partOfSpeech.trim())
      where.push(`EXISTS (
        SELECT 1 FROM meanings m3
        WHERE m3.word_id = w.id AND m3.part_of_speech = $${params.length}
      )`)
    }

    // Tag filter: card must have ALL specified tags (AND logic)
    if (dto.tagIds) {
      const tagIdList = dto.tagIds.split(',').map((s) => s.trim()).filter(Boolean)
      for (const tagId of tagIdList) {
        if (!UUID_RE.test(tagId)) {
          throw new BadRequestException(`Invalid tag ID: ${tagId}`)
        }
        params.push(tagId)
        where.push(`EXISTS (
          SELECT 1 FROM card_tags ct
          WHERE ct.card_id = c.id AND ct.tag_id = $${params.length}
        )`)
      }
    }

    if (dto.boardId) {
      params.push(dto.boardId)
      where.push(`EXISTS (
        SELECT 1 FROM card_boards cb
        WHERE cb.card_id = c.id AND cb.board_id = $${params.length}
      )`)
    }

    const whereClause = where.join(' AND ')

    // ── COUNT ──────────────────────────────────────────────────────────────
    const [{ total }] = await this.dataSource.query<[{ total: string }]>(
      `SELECT COUNT(*) AS total
       FROM user_words uw
       JOIN words w ON w.id = uw.word_id
       LEFT JOIN cards c ON c.user_id = uw.user_id AND c.word_id = uw.word_id
       WHERE ${whereClause}`,
      params,
    )
    const totalCount = parseInt(total, 10)
    if (totalCount === 0) return { items: [], total: 0, hasMore: false }

    // ── Items ──────────────────────────────────────────────────────────────
    const itemParams = [...params, limit, offset]
    const limitIdx   = itemParams.length - 1
    const offsetIdx  = itemParams.length

    const words = await this.dataSource.query<{
      userWordId: string;
      cardId: string;
      wordId: string;
      wordText: string;
      transcription: string | null;
      provider: string;
      savedAt: Date;
      nextReview: Date | null;
      lastReviewedAt: Date | null;
      intervalDays: number | null;
      easeFactor: number | null;
    }[]>(
      `SELECT
         uw.id               AS "userWordId",
         uw.saved_at         AS "savedAt",
         w.id                AS "wordId",
         w.text              AS "wordText",
         w.transcription,
         w.provider,
         c.id                AS "cardId",
         c.next_review       AS "nextReview",
         c.last_reviewed_at  AS "lastReviewedAt",
         c.interval_days     AS "intervalDays",
         c.ease_factor       AS "easeFactor"
       FROM user_words uw
       JOIN words w ON w.id = uw.word_id
       LEFT JOIN cards c ON c.user_id = uw.user_id AND c.word_id = uw.word_id
       WHERE ${whereClause}
       ORDER BY ${sort}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      itemParams,
    )

    if (words.length === 0) return { items: [], total: totalCount, hasMore: false }

    const wordIds = words.map((w) => w.wordId)
    const cardIds = words.map((w) => w.cardId).filter(Boolean)

    // ── Batch fetch meanings, boards, tags, notes in parallel ─────────────
    const [meanings, cardBoards, cardTags, cardNotes] = await Promise.all([
      this.dataSource.query<{
        wordId: string;
        id: string;
        definition: string;
        partOfSpeech: string | null;
        senseNumber: string | null;
        synonyms: string[];
        examples: string[];
      }[]>(
        `SELECT
           word_id        AS "wordId",
           id,
           definition,
           part_of_speech AS "partOfSpeech",
           sense_number   AS "senseNumber",
           synonyms,
           examples
         FROM meanings
         WHERE word_id = ANY($1)
         ORDER BY sense_number NULLS LAST`,
        [wordIds],
      ),
      cardIds.length > 0
        ? this.dataSource.query<{ cardId: string; boardId: string; boardName: string }[]>(
            `SELECT cb.card_id AS "cardId", b.id AS "boardId", b.name AS "boardName"
             FROM card_boards cb
             JOIN boards b ON b.id = cb.board_id
             WHERE cb.card_id = ANY($1)
             ORDER BY b.name`,
            [cardIds],
          )
        : Promise.resolve([]),
      cardIds.length > 0
        ? this.dataSource.query<{ cardId: string; tagId: string; tagName: string }[]>(
            `SELECT ct.card_id AS "cardId", t.id AS "tagId", t.name AS "tagName"
             FROM card_tags ct
             JOIN tags t ON t.id = ct.tag_id
             WHERE ct.card_id = ANY($1)
             ORDER BY t.name`,
            [cardIds],
          )
        : Promise.resolve([]),
      cardIds.length > 0
        ? this.dataSource.query<{ cardId: string; id: string; body: string }[]>(
            `SELECT card_id AS "cardId", id, body
             FROM card_notes
             WHERE card_id = ANY($1)`,
            [cardIds],
          )
        : Promise.resolve([]),
    ])

    // ── Build lookup maps ──────────────────────────────────────────────────
    const meaningsByWord = new Map<string, VocabularyMeaningDto[]>()
    for (const m of meanings) {
      const list = meaningsByWord.get(m.wordId) ?? []
      list.push({
        id:           m.id,
        definition:   m.definition,
        partOfSpeech: m.partOfSpeech,
        senseNumber:  m.senseNumber,
        synonyms:     m.synonyms ?? [],
        examples:     m.examples ?? [],
      })
      meaningsByWord.set(m.wordId, list)
    }

    const boardsByCard = new Map<string, BoardSummaryDto[]>()
    for (const row of cardBoards) {
      const list = boardsByCard.get(row.cardId) ?? []
      list.push({ id: row.boardId, name: row.boardName })
      boardsByCard.set(row.cardId, list)
    }

    const tagsByCard = new Map<string, TagSummaryDto[]>()
    for (const row of cardTags) {
      const list = tagsByCard.get(row.cardId) ?? []
      list.push({ id: row.tagId, name: row.tagName })
      tagsByCard.set(row.cardId, list)
    }

    const noteByCard = new Map<string, CardNoteSummaryDto>()
    for (const row of cardNotes) {
      noteByCard.set(row.cardId, { id: row.id, body: row.body })
    }

    // ── Assemble response items ────────────────────────────────────────────
    const now = new Date()
    const items: VocabularyWordDto[] = words.map((w) => ({
      userWordId:      w.userWordId,
      cardId:          w.cardId,
      wordId:          w.wordId,
      wordText:        w.wordText,
      transcription:   w.transcription,
      provider:        w.provider,
      savedAt:         w.savedAt,
      nextReview:      w.nextReview,
      lastReviewedAt:  w.lastReviewedAt,
      intervalDays:    w.intervalDays,
      easeFactor:      w.easeFactor,
      reviewState:     computeReviewState(w.lastReviewedAt, w.intervalDays, w.nextReview, now),
      nextReviewHuman: w.nextReview ? humaniseReviewTime(w.nextReview, now) : null,
      boards:          boardsByCard.get(w.cardId) ?? [],
      tags:            tagsByCard.get(w.cardId) ?? [],
      note:            noteByCard.get(w.cardId) ?? null,
      meanings:        meaningsByWord.get(w.wordId) ?? [],
    }))

    return {
      items,
      total:   totalCount,
      hasMore: offset + items.length < totalCount,
    }
  }

  // ── GET /vocabulary/cards/:cardId/note ───────────────────────────────────

  async getNote(userId: string, cardId: string): Promise<CardNoteDto> {
    await this.verifyCardOwnership(userId, cardId);

    const rows = await this.dataSource.query<CardNoteDto[]>(
      `SELECT
         id,
         card_id    AS "cardId",
         body,
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM card_notes
       WHERE card_id = $1`,
      [cardId],
    );

    if (rows.length === 0) throw new NotFoundException(`Note for card ${cardId} not found`);
    return rows[0];
  }

  // ── PUT /vocabulary/cards/:cardId/note ────────────────────────────────────
  // Upserts the note. Deletes the row when body is empty.

  async upsertNote(userId: string, cardId: string, dto: UpsertNoteDto): Promise<CardNoteDto | null> {
    await this.verifyCardOwnership(userId, cardId);

    if (dto.body.trim() === '') {
      await this.dataSource.query(
        `DELETE FROM card_notes WHERE card_id = $1`,
        [cardId],
      );
      return null;
    }

    const rows = await this.dataSource.query<CardNoteDto[]>(
      `INSERT INTO card_notes (id, card_id, body)
       VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (card_id) DO UPDATE
         SET body = EXCLUDED.body, updated_at = NOW()
       RETURNING
         id,
         card_id    AS "cardId",
         body,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [cardId, dto.body],
    );

    return rows[0];
  }

  // ── DELETE /vocabulary/cards/:cardId/note ─────────────────────────────────

  async deleteNote(userId: string, cardId: string): Promise<void> {
    await this.verifyCardOwnership(userId, cardId);
    await this.dataSource.query(
      `DELETE FROM card_notes WHERE card_id = $1`,
      [cardId],
    );
  }

  // ── DELETE /vocabulary/words/:wordId ─────────────────────────────────────
  // Removes the word from the user's vocabulary and deletes its card + logs.

  async removeWord(userId: string, wordId: string): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Cards cascade to review_logs on delete
      await qr.query(
        `DELETE FROM cards WHERE user_id = $1 AND word_id = $2`,
        [userId, wordId],
      );

      const deleted = (await qr.query(
        `DELETE FROM user_words
         WHERE user_id = $1 AND word_id = $2
         RETURNING id`,
        [userId, wordId],
      )) as { id: string }[];

      if (deleted.length === 0) {
        throw new NotFoundException(`Word ${wordId} is not in your vocabulary`);
      }

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  private async verifyCardOwnership(userId: string, cardId: string): Promise<void> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM cards WHERE id = $1 AND user_id = $2`,
      [cardId, userId],
    );
    if (rows.length === 0) throw new NotFoundException(`Card ${cardId} not found`);
  }
}
