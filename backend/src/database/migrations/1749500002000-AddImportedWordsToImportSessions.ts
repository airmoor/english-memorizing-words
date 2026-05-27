import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds imported_words JSONB column to import_sessions.
 *
 * Stores a snapshot of the word strings that were successfully imported during
 * the session so the Import History UI can display them. Capped by the service
 * at MAX_STORED_IMPORTED_WORDS (100) to bound JSONB size.
 *
 * Default '[]': existing rows get an empty array — the UI falls back to
 * "Word list not available for this session" when imported > 0 but the array
 * is empty (sessions created before this migration).
 */
export class AddImportedWordsToImportSessions1749500002000 implements MigrationInterface {
  name = 'AddImportedWordsToImportSessions1749500002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE import_sessions
        ADD COLUMN IF NOT EXISTS imported_words JSONB NOT NULL DEFAULT '[]'::jsonb
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE import_sessions DROP COLUMN IF EXISTS imported_words
    `);
  }
}
