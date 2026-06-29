import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Translations feature.
 *
 *   1. `translation_provider` PG enum — string provenance marker.
 *   2. `word_translations` — one translation per (word, language).
 *        Translation attaches to the canonical Word, NOT to individual meanings
 *        (translation is a confirmation hint for the English definition, and one
 *        translation per word is sufficient UX). A meaning-level table can be
 *        added later with no destructive migration.
 *   3. `users.native_language_code` — drives which translation the UI surfaces.
 *
 * Indexes: deliberately minimal. The UNIQUE (word_id, language_code) constraint
 * auto-creates the B-tree that also serves the hot lookup path
 * (`WHERE word_id = ? AND language_code = ?`) and its left-prefix
 * (`WHERE word_id = ?`). No separate provider/language/timestamp indexes until a
 * real query or profiling justifies one.
 */
export class AddTranslations1750000001000 implements MigrationInterface {
  name = 'AddTranslations1750000001000';

  async up(qr: QueryRunner): Promise<void> {
    // citext is already enabled by 1747000007000; repeated here idempotently for safety.
    await qr.query(`CREATE EXTENSION IF NOT EXISTS citext`);

    await qr.query(`
      CREATE TYPE translation_provider AS ENUM (
        'deepl',
        'google',
        'microsoft',
        'libre',
        'openai',
        'anthropic',
        'manual',
        'user'
      )
    `);

    await qr.query(`
      CREATE TABLE word_translations (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        word_id       UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
        language_code TEXT NOT NULL,
        text          CITEXT NOT NULL,
        provider      translation_provider NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (word_id, language_code)
      )
    `);

    // NULL = not set yet (frontend prompts during onboarding); the app falls back
    // gracefully and simply shows no translation until a code is chosen.
    await qr.query(`
      ALTER TABLE users ADD COLUMN native_language_code TEXT DEFAULT NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE users DROP COLUMN native_language_code`);
    await qr.query(`DROP TABLE word_translations`);
    await qr.query(`DROP TYPE translation_provider`);
    // citext extension intentionally NOT dropped — shared with words.text.
  }
}
