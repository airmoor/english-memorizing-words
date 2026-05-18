import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One user-authored plain-text note per card.
 * The UNIQUE constraint on card_id enforces the one-to-one relationship
 * at the database level.
 *
 * body is TEXT NOT NULL DEFAULT ''. When the user clears the note, the
 * application layer deletes this row entirely — empty notes are not
 * intended to persist long-term.
 *
 * Deletion cascades from card: removing a card removes its note.
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
