import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface VocabularyItemDto {
  userMeaningId: string;
  meaningId: string;
  wordId: string;
  wordText: string;
  definition: string;
  transcription: string | null;
  partOfSpeech: string | null;
  synonyms: string[];
  examples: string[];
  savedAt: Date;
}

@Injectable()
export class VocabularyService {
  constructor(private readonly dataSource: DataSource) {}

  // ── POST /vocabulary/meanings/:meaningId ─────────────────────────────────

  async saveMeaning(userId: string, meaningId: string): Promise<void> {
    // Existence check before touching a transaction
    const [{ exists }] = await this.dataSource.query<[{ exists: boolean }]>(
      `SELECT EXISTS(SELECT 1 FROM meanings WHERE id = $1) AS exists`,
      [meaningId],
    );
    if (!exists) throw new NotFoundException(`Meaning ${meaningId} not found`);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Both inserts are idempotent: duplicate key → silently skip
      await qr.query(
        `INSERT INTO user_meanings (id, user_id, meaning_id)
         VALUES (gen_random_uuid(), $1, $2)
         ON CONFLICT (user_id, meaning_id) DO NOTHING`,
        [userId, meaningId],
      );

      await qr.query(
        `INSERT INTO cards (id, user_id, meaning_id, ease_factor, interval, next_review)
         VALUES (gen_random_uuid(), $1, $2, 2.5, 0, CURRENT_DATE)
         ON CONFLICT (user_id, meaning_id) DO NOTHING`,
        [userId, meaningId],
      );

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── POST /vocabulary/words/:wordId/save-all ──────────────────────────────

  async saveAllMeanings(
    userId: string,
    wordId: string,
  ): Promise<{ saved: number }> {
    const [{ exists: wordExists }] = await this.dataSource.query<
      [{ exists: boolean }]
    >(
      `SELECT EXISTS(SELECT 1 FROM words WHERE id = $1) AS exists`,
      [wordId],
    );
    if (!wordExists) throw new NotFoundException(`Word ${wordId} not found`);

    const meanings = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM meanings WHERE word_id = $1`,
      [wordId],
    );

    if (meanings.length === 0) return { saved: 0 };

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      for (const { id: mId } of meanings) {
        await qr.query(
          `INSERT INTO user_meanings (id, user_id, meaning_id)
           VALUES (gen_random_uuid(), $1, $2)
           ON CONFLICT (user_id, meaning_id) DO NOTHING`,
          [userId, mId],
        );

        await qr.query(
          `INSERT INTO cards (id, user_id, meaning_id, ease_factor, interval, next_review)
           VALUES (gen_random_uuid(), $1, $2, 2.5, 0, CURRENT_DATE)
           ON CONFLICT (user_id, meaning_id) DO NOTHING`,
          [userId, mId],
        );
      }

      await qr.commitTransaction();
      return { saved: meanings.length };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── GET /vocabulary ───────────────────────────────────────────────────────

  getUserVocabulary(userId: string): Promise<VocabularyItemDto[]> {
    // Single JOIN query — no N+1
    return this.dataSource.query<VocabularyItemDto[]>(
      `SELECT
         um.id            AS "userMeaningId",
         um.saved_at      AS "savedAt",
         m.id             AS "meaningId",
         m.definition,
         m.transcription,
         m.part_of_speech AS "partOfSpeech",
         m.synonyms,
         m.examples,
         w.id             AS "wordId",
         w.text           AS "wordText"
       FROM user_meanings um
       JOIN meanings m ON m.id = um.meaning_id
       JOIN words    w ON w.id = m.word_id
       WHERE um.user_id = $1
       ORDER BY um.saved_at DESC`,
      [userId],
    );
  }

  // ── DELETE /vocabulary/meanings/:meaningId ───────────────────────────────

  async removeMeaning(userId: string, meaningId: string): Promise<void> {
    // Ownership is implicit: WHERE user_id = $userId scopes the delete
    const deleted = await this.dataSource.query<{ id: string }[]>(
      `DELETE FROM user_meanings
       WHERE user_id = $1 AND meaning_id = $2
       RETURNING id`,
      [userId, meaningId],
    );

    if (deleted.length === 0) {
      throw new NotFoundException(
        `Meaning ${meaningId} is not in your vocabulary`,
      );
    }
    // CASCADE: deleting user_meanings row triggers deletion of cards + review_logs
  }
}
