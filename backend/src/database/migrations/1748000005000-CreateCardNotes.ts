import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One user-authored plain-text note per card.
 * The UNIQUE constraint on card_id enforces the one-to-one relationship
 * at the database level.
 *
 * Deletion cascades from card: removing a card removes its note.
 * Deletion in the other direction (clearing the note body) is handled
 * by the application layer — it deletes the row when body is empty.
 *
 * body has no NOT NULL constraint intentionally: an empty-string body
 * is treated as "note cleared" and the row is deleted by the application
 * rather than stored as an empty string.
 *
 * Future: this table may be superseded by a card_blocks table that supports
 * multiple typed content blocks per card. A migration would convert existing
 * rows to block rows of type 'note'.
 */
export class CreateCardNotes1748000005000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE card_notes (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        card_id    UUID        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        body       TEXT        NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (card_id)
      )
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE card_notes`);
  }
}
