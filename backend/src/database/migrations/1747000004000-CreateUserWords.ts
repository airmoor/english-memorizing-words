import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the old user_meanings table.
 * The learning unit is the canonical WORD, not an individual meaning/sense.
 * One row = one user saved one word to their vocabulary.
 */
export class CreateUserWords1747000004000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE user_words (
        id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id  UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        word_id  UUID NOT NULL REFERENCES words(id)  ON DELETE CASCADE,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, word_id)
      )
    `);
    await qr.query(`CREATE INDEX idx_user_words_user_id ON user_words (user_id)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE user_words`);
  }
}
