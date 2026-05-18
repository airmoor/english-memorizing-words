import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Boards are user-owned, named collections. Cards are assigned to boards
 * via the card_boards join table (see next migration). A board has no
 * ownership over cards — deleting a board only removes the join rows.
 *
 * name is stored as citext (case-insensitive text, extension already enabled)
 * so that the UNIQUE (user_id, name) constraint is case-insensitive.
 *
 * color_accent is reserved for future UI customisation and intentionally left
 * as a plain text column with no validation at the database level.
 */
export class CreateBoards1748000001000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE boards (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name         CITEXT      NOT NULL,
        description  TEXT,
        color_accent TEXT,
        position     INT         NOT NULL DEFAULT 0,
        is_archived  BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, name)
      )
    `);

    await qr.query(`CREATE INDEX idx_boards_user_id ON boards (user_id)`);
    await qr.query(
      `CREATE INDEX idx_boards_user_position ON boards (user_id, position)`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE boards`);
  }
}
