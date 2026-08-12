import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the two free, human-voice pronunciation sources to the
 * `pronunciation_provider` enum:
 *
 *   - 'merriam-webster' — Learner's Dictionary audio (US only, needs a free key)
 *   - 'free-dictionary' — api.dictionaryapi.dev audio (no key at all)
 *
 * Both are preferred over 'amazon-polly': real recordings beat TTS for a
 * learner-facing app, and neither costs anything.
 *
 * `ALTER TYPE ... ADD VALUE` is transactional from PostgreSQL 12 onward, so it
 * is safe inside TypeORM's migration transaction (we only add the labels here —
 * rows using them are written later, in other transactions).
 *
 * `down()` is intentionally a no-op: PostgreSQL cannot drop a single enum label.
 * Reverting would mean recreating the type and rewriting every dependent column,
 * which is far more destructive than leaving two unused labels in place.
 */
export class AddDictionaryPronunciationProviders1752000001000
  implements MigrationInterface
{
  name = 'AddDictionaryPronunciationProviders1752000001000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TYPE pronunciation_provider ADD VALUE IF NOT EXISTS 'merriam-webster'
    `);
    await qr.query(`
      ALTER TYPE pronunciation_provider ADD VALUE IF NOT EXISTS 'free-dictionary'
    `);
  }

  async down(): Promise<void> {
    // No-op — see the class doc comment.
  }
}
