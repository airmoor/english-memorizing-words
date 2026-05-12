import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { DataSource } from 'typeorm';

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

export class VocabularyWordDto {
  @ApiProperty({ example: 'uuid-v4' })
  userWordId: string;

  @ApiProperty({ example: 'uuid-v4' })
  wordId: string;

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
  @ApiPropertyOptional({ example: 'new,learning', description: 'Comma-separated filter names' })
  filters?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'newest', description: 'Sort order', enum: ['newest', 'oldest', 'alphabetical', 'hardest', 'easiest', 'nextReview'] })
  sort?: string;

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({ example: '50', description: 'Page size (1–100, default 50)' })
  limit?: string;

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({ example: '0', description: 'Number of items to skip (default 0)' })
  offset?: string;
}

export class PaginatedVocabularyDto {
  @ApiProperty({ type: [VocabularyWordDto] })
  items: VocabularyWordDto[];

  @ApiProperty({ example: 123, description: 'Total items matching current filters' })
  total: number;

  @ApiProperty({ example: true })
  hasMore: boolean;
}

// ── Filter → SQL condition mapping ────────────────────────────────────────────

const FILTER_CONDITIONS: Record<string, string> = {
  difficult:       '(c.ease_factor IS NOT NULL AND c.ease_factor < 2.0)',
  new:             'c.last_reviewed_at IS NULL',
  learning:        '(c.last_reviewed_at IS NOT NULL AND c.interval_days < 7)',
  review:          '(c.interval_days >= 7 AND c.interval_days < 21)',
  mature:          'c.interval_days >= 21',
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

  async getUserVocabulary(
    userId: string,
    dto: VocabularyQueryDto,
  ): Promise<PaginatedVocabularyDto> {
    const q      = (dto.q ?? '').trim()
    const sort   = SORT_MAP[dto.sort ?? ''] ?? SORT_MAP.newest
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

    // ── Meanings (batch, one query) ────────────────────────────────────────
    const wordIds = words.map((w) => w.wordId)
    const meanings = await this.dataSource.query<{
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
    )

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

    const items: VocabularyWordDto[] = words.map((w) => ({
      ...w,
      meanings: meaningsByWord.get(w.wordId) ?? [],
    }))

    return {
      items,
      total:   totalCount,
      hasMore: offset + items.length < totalCount,
    }
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
}
