import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

export class VocabularyItemDto {
  @ApiProperty({ example: 'uuid-v4' })
  userMeaningId: string;

  @ApiProperty({ example: 'uuid-v4' })
  meaningId: string;

  @ApiProperty({ example: 'uuid-v4' })
  wordId: string;

  @ApiProperty({ example: 'word' })
  wordText: string;

  @ApiProperty({ example: 'A spoken or written word.' })
  definition: string;

  @ApiProperty({ example: '/wɜːrd/', nullable: true })
  transcription: string | null;

  @ApiProperty({ example: 'noun', nullable: true })
  partOfSpeech: string | null;

  @ApiProperty({ example: ['term', 'expression'], type: [String] })
  synonyms: string[];

  @ApiProperty({ example: ['He spoke the word.'], type: [String] })
  examples: string[];

  @ApiProperty({ example: '1a', nullable: true })
  senseNumber: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  savedAt: Date;
}

@Injectable()
export class VocabularyService {
  constructor(private readonly dataSource: DataSource) {}

  // ── POST /vocabulary/meanings/:meaningId ─────────────────────────────────

  async saveMeaning(userId: string, meaningId: string): Promise<void> {
    const [{ exists }] = await this.dataSource.query<[{ exists: boolean }]>(
      `SELECT EXISTS(SELECT 1 FROM meanings WHERE id = $1) AS exists`,
      [meaningId],
    );
    if (!exists) throw new NotFoundException(`Meaning ${meaningId} not found`);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
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
      let saved = 0;

      for (const { id: mId } of meanings) {
        const inserted = (await qr.query(
          `INSERT INTO user_meanings (id, user_id, meaning_id)
           VALUES (gen_random_uuid(), $1, $2)
           ON CONFLICT (user_id, meaning_id) DO NOTHING
           RETURNING id`,
          [userId, mId],
        )) as { id: string }[];
        if (inserted.length > 0) saved++;

        await qr.query(
          `INSERT INTO cards (id, user_id, meaning_id, ease_factor, interval, next_review)
           VALUES (gen_random_uuid(), $1, $2, 2.5, 0, CURRENT_DATE)
           ON CONFLICT (user_id, meaning_id) DO NOTHING`,
          [userId, mId],
        );
      }

      await qr.commitTransaction();
      return { saved };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── GET /vocabulary ───────────────────────────────────────────────────────

  getUserVocabulary(userId: string): Promise<VocabularyItemDto[]> {
    return this.dataSource.query<VocabularyItemDto[]>(
      `SELECT
         um.id            AS "userMeaningId",
         um.saved_at      AS "savedAt",
         m.id             AS "meaningId",
         m.definition,
         m.part_of_speech AS "partOfSpeech",
         m.synonyms,
         m.examples,
         m.sense_number   AS "senseNumber",
         w.id             AS "wordId",
         w.text           AS "wordText",
         w.transcription
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
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      await qr.query(
        `DELETE FROM cards WHERE user_id = $1 AND meaning_id = $2`,
        [userId, meaningId],
      );

      const deleted = (await qr.query(
        `DELETE FROM user_meanings
         WHERE user_id = $1 AND meaning_id = $2
         RETURNING id`,
        [userId, meaningId],
      )) as { id: string }[];

      if (deleted.length === 0) {
        throw new NotFoundException(
          `Meaning ${meaningId} is not in your vocabulary`,
        );
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
