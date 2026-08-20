import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds link-sharing to boards: a board is either 'private' (default, current
 * behavior for every existing row) or 'unlisted' (viewable read-only by
 * anyone holding its share_slug). share_slug is only ever set while a board
 * is unlisted — toggling back to private clears it, and re-sharing later
 * issues a fresh one rather than restoring the old value.
 */
export class AddBoardSharing1753000001000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `CREATE TYPE board_visibility AS ENUM ('private', 'unlisted')`,
    );

    await qr.query(`
      ALTER TABLE boards
        ADD COLUMN visibility  board_visibility NOT NULL DEFAULT 'private',
        ADD COLUMN share_slug  TEXT
    `);

    await qr.query(
      `CREATE UNIQUE INDEX idx_boards_share_slug ON boards (share_slug) WHERE share_slug IS NOT NULL`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX idx_boards_share_slug`);
    await qr.query(`ALTER TABLE boards DROP COLUMN visibility, DROP COLUMN share_slug`);
    await qr.query(`DROP TYPE board_visibility`);
  }
}
