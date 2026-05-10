import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Production-readiness refactor of the entity layer:
 *
 *   1. Enable `citext` extension; migrate words.text → citext (case-insensitive uniqueness).
 *   2. Create `dictionary_provider` PG enum; migrate words.provider → enum column.
 *   3. Add `updated_at` to words and meanings.
 *   4. Rename cards.interval → cards.interval_days (explicit semantics).
 *   5. Migrate cards.next_review from DATE → TIMESTAMPTZ (timezone-safe scheduling).
 *   6. Add cards.last_reviewed_at (nullable TIMESTAMPTZ) for future FSRS support.
 *   7. Add auxiliary indexes: cards.word_id, user_words.word_id.
 */
export class RefactorEntityLayer1747000007000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // ── 1. citext ────────────────────────────────────────────────────────────
    await qr.query(`CREATE EXTENSION IF NOT EXISTS citext`);

    // Drop the explicit text index before the type change; it will be recreated
    // after so the new index uses citext operator classes.
    await qr.query(`DROP INDEX IF EXISTS idx_words_text`);
    await qr.query(`ALTER TABLE words ALTER COLUMN text TYPE citext`);
    await qr.query(`CREATE INDEX idx_words_text ON words (text)`);

    // ── 2. dictionary_provider enum ──────────────────────────────────────────
    await qr.query(`
      CREATE TYPE dictionary_provider AS ENUM (
        'merriam-webster',
        'free-dictionary'
      )
    `);
    await qr.query(`
      ALTER TABLE words
        ALTER COLUMN provider TYPE dictionary_provider
        USING provider::dictionary_provider
    `);

    // ── 3. updated_at columns ────────────────────────────────────────────────
    await qr.query(`
      ALTER TABLE words
        ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await qr.query(`
      ALTER TABLE meanings
        ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    // ── 4. Rename cards.interval → cards.interval_days ───────────────────────
    await qr.query(`ALTER TABLE cards RENAME COLUMN interval TO interval_days`);

    // ── 5. cards.next_review: DATE → TIMESTAMPTZ ─────────────────────────────
    // Drop and recreate the composite index around the type change.
    await qr.query(`DROP INDEX IF EXISTS idx_cards_user_next`);
    await qr.query(`
      ALTER TABLE cards
        ALTER COLUMN next_review TYPE timestamptz
        USING next_review::timestamptz
    `);
    await qr.query(`
      CREATE INDEX idx_cards_user_next ON cards (user_id, next_review)
    `);

    // ── 6. cards.last_reviewed_at ────────────────────────────────────────────
    await qr.query(`
      ALTER TABLE cards
        ADD COLUMN last_reviewed_at TIMESTAMPTZ
    `);

    // ── 7. Additional indexes ────────────────────────────────────────────────
    // cards.word_id — useful for cascade queries ("delete all cards for word")
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_cards_word_id ON cards (word_id)
    `);
    // user_words.word_id — useful for "who has saved this word?" queries
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_user_words_word_id ON user_words (word_id)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    // Reverse in reverse order

    // 7. Drop auxiliary indexes
    await qr.query(`DROP INDEX IF EXISTS idx_user_words_word_id`);
    await qr.query(`DROP INDEX IF EXISTS idx_cards_word_id`);

    // 6. Drop last_reviewed_at
    await qr.query(`ALTER TABLE cards DROP COLUMN IF EXISTS last_reviewed_at`);

    // 5. Revert cards.next_review to DATE
    await qr.query(`DROP INDEX IF EXISTS idx_cards_user_next`);
    await qr.query(`
      ALTER TABLE cards
        ALTER COLUMN next_review TYPE date USING next_review::date
    `);
    await qr.query(`CREATE INDEX idx_cards_user_next ON cards (user_id, next_review)`);

    // 4. Rename back
    await qr.query(`ALTER TABLE cards RENAME COLUMN interval_days TO interval`);

    // 3. Drop updated_at columns
    await qr.query(`ALTER TABLE meanings DROP COLUMN IF EXISTS updated_at`);
    await qr.query(`ALTER TABLE words DROP COLUMN IF EXISTS updated_at`);

    // 2. Revert provider to TEXT
    await qr.query(`
      ALTER TABLE words
        ALTER COLUMN provider TYPE text USING provider::text
    `);
    await qr.query(`DROP TYPE IF EXISTS dictionary_provider`);

    // 1. Revert citext → text
    await qr.query(`DROP INDEX IF EXISTS idx_words_text`);
    await qr.query(`ALTER TABLE words ALTER COLUMN text TYPE text`);
    await qr.query(`CREATE INDEX idx_words_text ON words (text)`);
    // citext extension intentionally NOT dropped — may be used by other schemas
  }
}
