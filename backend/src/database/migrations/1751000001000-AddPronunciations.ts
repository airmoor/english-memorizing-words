import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pronunciations feature.
 *
 *   1. `pronunciation_provider` / `pronunciation_accent` PG enums.
 *   2. `word_pronunciations` — one audio recording per (word, accent).
 *        Audio bytes live in object storage (S3 / MinIO); this row holds the
 *        metadata + public URL. Generated once via Amazon Polly and cached
 *        forever — the TTS API is never hit again for a (word, accent) that has
 *        a row.
 *
 * Indexes: deliberately minimal — same policy as AddTranslations. The
 * UNIQUE (word_id, accent) constraint auto-creates the B-tree that also serves
 * the hot lookup (`WHERE word_id = ? AND accent = ?`) and its left-prefix
 * (`WHERE word_id = ?`). No separate provider/timestamp indexes until profiling
 * justifies one.
 *
 * The audio-file columns are inlined here for the MVP. Splitting them into a
 * shared `audio_assets` table is a non-destructive future migration.
 */
export class AddPronunciations1751000001000 implements MigrationInterface {
  name = 'AddPronunciations1751000001000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TYPE pronunciation_provider AS ENUM (
        'amazon-polly',
        'azure',
        'wikimedia',
        'custom',
        'manual'
      )
    `);

    await qr.query(`
      CREATE TYPE pronunciation_accent AS ENUM ('us', 'uk', 'au')
    `);

    await qr.query(`
      CREATE TABLE word_pronunciations (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        word_id         UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
        accent          pronunciation_accent NOT NULL,
        provider        pronunciation_provider NOT NULL,
        voice           TEXT,
        is_human        BOOLEAN NOT NULL DEFAULT FALSE,
        storage_key     TEXT NOT NULL,
        audio_url       TEXT NOT NULL,
        format          TEXT NOT NULL DEFAULT 'mp3',
        duration_ms     INTEGER,
        file_size_bytes INTEGER,
        content_hash    TEXT NOT NULL,
        license         TEXT NOT NULL,
        attribution     TEXT,
        source_ref_url  TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (word_id, accent)
      )
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE word_pronunciations`);
    await qr.query(`DROP TYPE pronunciation_accent`);
    await qr.query(`DROP TYPE pronunciation_provider`);
  }
}
