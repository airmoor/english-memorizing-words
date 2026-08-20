import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Self-check on review: adds `last_answer_text text DEFAULT NULL` to `cards`.
 *
 * Stores only the most recent free-text self-check attempt per card (not a
 * full history) — overwritten each time the user types something before
 * revealing the answer. Null means the user has never typed a self-check
 * attempt for this card.
 */
export class AddLastAnswerTextToCards1754000001000
  implements MigrationInterface
{
  name = 'AddLastAnswerTextToCards1754000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cards
      ADD COLUMN last_answer_text text DEFAULT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cards
      DROP COLUMN last_answer_text
    `);
  }
}
