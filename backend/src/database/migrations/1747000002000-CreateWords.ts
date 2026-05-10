import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWords1747000002000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE words (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        text          TEXT NOT NULL UNIQUE,
        transcription TEXT,
        provider      TEXT NOT NULL,
        fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(`CREATE INDEX idx_words_text ON words (text)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE words`);
  }
}
