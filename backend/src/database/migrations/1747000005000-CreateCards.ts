import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cards reference word_id — spaced-repetition progress belongs to the
 * canonical English word, not an individual sense/meaning.
 */
export class CreateCards1747000005000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE cards (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        word_id     UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
        ease_factor FLOAT  NOT NULL DEFAULT 2.5,
        interval    INT    NOT NULL DEFAULT 0,
        next_review DATE   NOT NULL DEFAULT CURRENT_DATE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, word_id)
      )
    `);
    await qr.query(`
      CREATE INDEX idx_cards_user_next ON cards (user_id, next_review)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE cards`);
  }
}
