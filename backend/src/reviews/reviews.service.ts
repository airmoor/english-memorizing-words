import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { applySmTwo, Rating } from './sm2';

// ── DTOs ────────────────────────────────────────────────────────────────────

export class NextCardDto {
  @ApiProperty({ example: 'uuid-v4' })
  cardId: string;

  @ApiProperty({ example: 'uuid-v4' })
  wordId: string;

  @ApiProperty({ example: 'ephemeral' })
  word: string;

  @ApiProperty({ example: 'ɪˈfɛmərəl', nullable: true })
  transcription: string | null;

  @ApiProperty({ example: 'His fame turned out to be ephemeral.', nullable: true })
  example: string | null;
}

export class CardMeaningDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'lasting a very short time' })
  definition: string;

  @ApiProperty({ example: 'adjective', nullable: true })
  partOfSpeech: string | null;

  @ApiProperty({ example: ['His fame turned out to be ephemeral.'], type: [String] })
  examples: string[];

  @ApiProperty({ example: '1a', nullable: true })
  senseNumber: string | null;

  @ApiProperty({ example: ['short-lived', 'transient'], type: [String] })
  synonyms: string[];
}

export class CardAnswerDto {
  @ApiProperty({ type: [CardMeaningDto] })
  meanings: CardMeaningDto[];
}

export class ReviewProgressDto {
  @ApiProperty({ example: 5 })
  dueToday: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  reviewedToday: number;

  @ApiProperty({ example: 7 })
  streak: number;

  @ApiProperty({ example: '2024-06-16', nullable: true })
  nextReviewDate: string | null;
}

export class ReviewResultDto {
  @ApiProperty({ type: String, format: 'date-time', example: '2024-06-15T00:00:00.000Z' })
  nextReview: Date;

  @ApiProperty({ example: 4 })
  intervalDays: number;

  @ApiProperty({ example: 2.5 })
  easeFactor: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeStreak(days: string[]): number {
  if (days.length === 0) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let streak = 0;
  let expected = today;

  for (const day of days) {
    const date = new Date(day);
    date.setUTCHours(0, 0, 0, 0);
    if (date.getTime() !== expected.getTime()) break;
    streak++;
    expected = new Date(expected.getTime() - 86_400_000);
  }

  return streak;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ReviewsService {
  constructor(private readonly dataSource: DataSource) {}

  // ── GET /reviews/progress ───────────────────────────────────────────────

  async getProgress(userId: string): Promise<ReviewProgressDto> {
    const [[due], [total], [reviewed], reviewDays, [nextRow]] = await Promise.all([
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count FROM cards
         WHERE user_id = $1 AND next_review <= NOW()`,
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
      this.dataSource.query<{ day: string }[]>(
        `SELECT DISTINCT rl.reviewed_at::date AS day
         FROM review_logs rl
         JOIN cards c ON c.id = rl.card_id
         WHERE c.user_id = $1
         ORDER BY day DESC`,
        [userId],
      ),
      this.dataSource.query<[{ next_date: string | null }]>(
        `SELECT MIN(next_review)::text AS next_date
         FROM cards
         WHERE user_id = $1 AND next_review > NOW()`,
        [userId],
      ),
    ]);

    return {
      dueToday: Number(due.count),
      total: Number(total.count),
      reviewedToday: Number(reviewed.count),
      streak: computeStreak(reviewDays.map((r) => r.day)),
      nextReviewDate: nextRow?.next_date ?? null,
    };
  }

  // ── GET /reviews/next ────────────────────────────────────────────────────

  async getNextCard(userId: string): Promise<NextCardDto | null> {
    const rows = await this.dataSource.query<{
      cardId: string;
      wordId: string;
      word: string;
      transcription: string | null;
      example: string | null;
    }[]>(
      `SELECT
         c.id            AS "cardId",
         w.id            AS "wordId",
         w.text          AS "word",
         w.transcription AS "transcription",
         -- Pull the first non-empty example from any meaning for front-card context
         (
           SELECT m.examples[1]
           FROM meanings m
           WHERE m.word_id = w.id
             AND array_length(m.examples, 1) > 0
           LIMIT 1
         )               AS "example"
       FROM cards c
       JOIN words w ON w.id = c.word_id
       WHERE c.user_id = $1
         AND c.next_review <= NOW()
       ORDER BY c.next_review ASC, c.id ASC
       LIMIT 1`,
      [userId],
    );

    if (rows.length === 0) return null;

    return rows[0];
  }

  // ── GET /reviews/answer/:cardId ──────────────────────────────────────────
  // Returns ALL meanings for the card's word so the review back-side can
  // show the complete dictionary entry.

  async getAnswer(userId: string, cardId: string): Promise<CardAnswerDto> {
    // Verify card ownership
    const card = await this.dataSource.query<{ word_id: string }[]>(
      `SELECT word_id FROM cards WHERE id = $1 AND user_id = $2`,
      [cardId, userId],
    );

    if (card.length === 0) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    const meanings = await this.dataSource.query<CardMeaningDto[]>(
      `SELECT
         id,
         definition,
         part_of_speech AS "partOfSpeech",
         examples,
         sense_number   AS "senseNumber",
         synonyms
       FROM meanings
       WHERE word_id = $1
       ORDER BY sense_number NULLS LAST`,
      [card[0].word_id],
    );

    return { meanings };
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
      const current = (await qr.query(
        `SELECT interval_days, ease_factor FROM cards WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [cardId, userId],
      )) as { interval_days: number; ease_factor: number }[];

      if (current.length === 0) {
        throw new NotFoundException(`Card ${cardId} not found`);
      }

      const { interval_days: intervalDays, ease_factor: easeFactor } = current[0];
      const next = applySmTwo(intervalDays, easeFactor, rating);

      const updated = (await qr.query(
        `UPDATE cards
         SET interval_days    = $1,
             ease_factor      = $2,
             next_review      = NOW() + ($3 * INTERVAL '1 day'),
             last_reviewed_at = NOW()
         WHERE id = $4 AND user_id = $5
         RETURNING next_review`,
        [next.intervalDays, next.easeFactor, next.intervalDays, cardId, userId],
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
        intervalDays: next.intervalDays,
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
