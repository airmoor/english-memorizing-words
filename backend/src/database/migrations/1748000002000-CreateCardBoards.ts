import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Many-to-many join between cards and boards.
 * A card can belong to zero or many boards.
 * A board can contain zero or many cards.
 *
 * Composite primary key (card_id, board_id) is the correct shape for a pure
 * join table — no surrogate UUID needed here.
 *
 * Both FK sides cascade DELETE: removing a card removes its board memberships;
 * removing a board removes its card memberships. Cards themselves are unaffected
 * by board deletion.
 */
export class CreateCardBoards1748000002000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE card_boards (
        card_id     UUID        NOT NULL REFERENCES cards(id)  ON DELETE CASCADE,
        board_id    UUID        NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (card_id, board_id)
      )
    `);

    await qr.query(
      `CREATE INDEX idx_card_boards_board_id ON card_boards (board_id)`,
    );
    await qr.query(
      `CREATE INDEX idx_card_boards_card_id  ON card_boards (card_id)`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE card_boards`);
  }
}
