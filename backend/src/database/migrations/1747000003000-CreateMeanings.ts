import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeanings1747000003000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE meanings (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        word_id       UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
        definition    TEXT NOT NULL,
        part_of_speech TEXT,
        synonyms      TEXT[] NOT NULL DEFAULT '{}',
        examples      TEXT[] NOT NULL DEFAULT '{}',
        sense_number  TEXT,
        UNIQUE (word_id, definition, part_of_speech)
      )
    `);
    await qr.query(`CREATE INDEX idx_meanings_word_id ON meanings (word_id)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE meanings`);
  }
}
