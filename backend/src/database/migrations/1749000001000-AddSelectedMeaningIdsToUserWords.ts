import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5: Selective meaning import.
 *
 * Adds `selected_meaning_ids uuid[] DEFAULT NULL` to `user_words`.
 *
 * NULL means "all meanings selected" (backwards-compatible default).
 * A non-null array means the user explicitly picked a subset of the word's
 * meanings when saving. The vocabulary query filters meanings to only the
 * selected IDs when this column is non-null and non-empty.
 */
export class AddSelectedMeaningIdsToUserWords1749000001000
  implements MigrationInterface
{
  name = 'AddSelectedMeaningIdsToUserWords1749000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_words
      ADD COLUMN selected_meaning_ids uuid[] DEFAULT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_words
      DROP COLUMN selected_meaning_ids
    `);
  }
}
