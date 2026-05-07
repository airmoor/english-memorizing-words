import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migrates to provider-aware schema:
 *   - words.transcription   : pronunciation is now word-level (was meaning-level)
 *   - words.provider        : tracks data source ('merriam-webster' | 'free-dictionary')
 *   - meanings.transcription: removed; superseded by words.transcription
 *
 * DESTRUCTIVE: TRUNCATEs words (cascades to meanings, user_meanings, cards,
 * review_logs). Justified because pre-migration cache was sourced exclusively
 * from Free Dictionary and is incompatible with the new provider-aware
 * architecture (no provider attribution, transcription on the wrong table).
 * User accounts (users table) are preserved. Saved vocabulary is reset.
 */
export class AddDictionaryProvider1746500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Wipe stale dictionary cache (cascades to dependents)
    await queryRunner.query(`TRUNCATE TABLE "words" CASCADE`);

    // words: gain transcription + provider
    await queryRunner.query(`
      ALTER TABLE "words"
        ADD COLUMN "transcription" TEXT,
        ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'merriam-webster'
    `);

    // meanings: drop transcription (now lives on words)
    await queryRunner.query(`
      ALTER TABLE "meanings"
        DROP COLUMN "transcription"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "meanings"
        ADD COLUMN "transcription" TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE "words"
        DROP COLUMN "transcription",
        DROP COLUMN "provider"
    `);
  }
}
