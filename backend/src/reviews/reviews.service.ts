import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

// ── DTOs ────────────────────────────────────────────────────────────────────

export class NextCardDto {
  @ApiProperty({ example: 'uuid-v4' })
  cardId: string;

  @ApiProperty({ example: 'uuid-v4' })
  meaningId: string;

  @ApiProperty({ example: 'ephemeral' })
  word: string;

  @ApiProperty({ example: 'adjective', nullable: true })
  partOfSpeech: string | null;

  @ApiProperty({ example: 'An ephemeral trend.', nullable: true })
  example: string | null;

  @ApiProperty({ example: 3 })
  meaningCount: number;
}

export class ReviewProgressDto {
  @ApiProperty({ example: 5 })
  dueToday: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  reviewedToday: number;
}

export class ReviewResultDto {
  @ApiProperty({ example: '2024-06-15' })
  nextReview: Date;

  @ApiProperty({ example: 4 })
  interval: number;

  @ApiProperty({ example: 2.5 })
  easeFactor: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type Rating = 'again' | 'hard' | 'good' | 'easy';

function applySmTwo(
  interval: number,
  easeFactor: number,
  rating: Rating,
): { interval: number; easeFactor: number } {
  switch (rating) {
    case 'again':
      return { interval: 0, easeFactor: Math.max(1.3, easeFactor - 0.2) };

    case 'hard':
      return {
        interval: Math.max(1, Math.round(interval * 1.2)),
        easeFactor: Math.max(1.3, easeFactor - 0.15),
      };

    case 'good':
      return {
        interval: interval === 0 ? 1 : Math.round(interval * easeFactor),
        easeFactor,
      };

    case 'easy':
      return {
        interval: interval === 0 ? 2 : Math.round(interval * easeFactor * 1.3),
        easeFactor: easeFactor + 0.15,
      };

    default: {
      const exhaustive: never = rating;
      throw new Error(`Unsupported rating: ${exhaustive}`);
    }
  }
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ReviewsService {
  constructor(private readonly dataSource: DataSource) {}

  // ── GET /reviews/progress ───────────────────────────────────────────────

  async getProgress(userId: string): Promise<ReviewProgressDto> {
    const [[due], [total], [reviewed]] = await Promise.all([
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count FROM cards
         WHERE user_id = $1 AND next_review <= CURRENT_DATE`,
        [userId],
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count FROM cards WHERE user_id = $1`,
        [userId],
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count
         FROM review_logs rl
         JOIN cards c ON c.id = rl.card_id
         WHERE c.user_id = $1
           AND rl.reviewed_at::date = CURRENT_DATE`,
        [userId],
      ),
    ]);

    return {
      dueToday: Number(due.count),
      total: Number(total.count),
      reviewedToday: Number(reviewed.count),
    };
  }

  // ── GET /reviews/next ────────────────────────────────────────────────────

  async getNextCard(userId: string): Promise<NextCardDto | null> {
    const rows = await this.dataSource.query<
      {
        cardId: string;
        meaningId: string;
        word: string;
        partOfSpeech: string | null;
        examples: string[];
        meaningCount: string; // pg returns bigint as string
      }[]
    >(
      `SELECT
         c.id             AS "cardId",
         m.id             AS "meaningId",
         w.text           AS "word",
         m.part_of_speech AS "partOfSpeech",
         m.examples       AS "examples",
         (
           SELECT COUNT(*)
           FROM meanings m2
           WHERE m2.word_id = w.id
         )                AS "meaningCount"
       FROM cards c
       JOIN meanings m ON m.id = c.meaning_id
       JOIN words   w ON w.id = m.word_id
       WHERE c.user_id = $1
         AND c.next_review <= CURRENT_DATE
       ORDER BY c.next_review ASC, c.id ASC
       LIMIT 1`,
      [userId],
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      cardId: row.cardId,
      meaningId: row.meaningId,
      word: row.word,
      partOfSpeech: row.partOfSpeech,
      example: row.examples?.[0] ?? null,
      meaningCount: Number(row.meaningCount),
    };
  }

  // ── GET /reviews/answer/:cardId ──────────────────────────────────────────

  async getAnswer(
    userId: string,
    cardId: string,
  ): Promise<{ definition: string; examples: string[] }> {
    const rows = await this.dataSource.query<
      { definition: string; examples: string[] }[]
    >(
      `SELECT m.definition, m.examples
       FROM cards c
       JOIN meanings m ON m.id = c.meaning_id
       WHERE c.id = $1 AND c.user_id = $2`,
      [cardId, userId],
    );

    if (rows.length === 0) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    return { definition: rows[0].definition, examples: rows[0].examples };
  }

  // ── POST /reviews/:cardId ────────────────────────────────────────────────

  async reviewCard(
    userId: string,
    cardId: string,
    rating: Rating,
  ): Promise<ReviewResultDto> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Lock the row inside the transaction — FOR UPDATE is only effective here
      const current = (await qr.query(
        `SELECT interval, ease_factor FROM cards WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [cardId, userId],
      )) as { interval: number; ease_factor: number }[];

      if (current.length === 0) {
        throw new NotFoundException(`Card ${cardId} not found`);
      }

      const { interval, ease_factor: easeFactor } = current[0];
      const next = applySmTwo(interval, easeFactor, rating);

      const updated = (await qr.query(
        `UPDATE cards
         SET interval     = $1,
             ease_factor  = $2,
             next_review  = CURRENT_DATE + ($3 * INTERVAL '1 day')
         WHERE id = $4 AND user_id = $5
         RETURNING next_review`,
        [next.interval, next.easeFactor, next.interval, cardId, userId],
      )) as { next_review: Date }[];

      await qr.query(
        `INSERT INTO review_logs (id, card_id, rating)
         VALUES (gen_random_uuid(), $1, $2)`,
        [cardId, rating],
      );

      await qr.commitTransaction();

      if (updated.length === 0) {
        throw new NotFoundException(`Card ${cardId} not found during update`);
      }

      return {
        nextReview: updated[0].next_review,
        interval: next.interval,
        easeFactor: next.easeFactor,
      };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
