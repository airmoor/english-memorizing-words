import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Many-to-many join between cards and tags.
 * Follows the same structural pattern as card_boards.
 *
 * Composite PK (card_id, tag_id) prevents duplicate assignments.
 * CASCADE on both sides: card deletion removes all tag assignments for
 * that card; tag deletion removes all assignments of that tag across cards.
 */
export class CreateCardTags1748000004000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE card_tags (
        card_id     UUID        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        tag_id      UUID        NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (card_id, tag_id)
      )
    `);

    await qr.query(`CREATE INDEX idx_card_tags_tag_id  ON card_tags (tag_id)`);
    await qr.query(`CREATE INDEX idx_card_tags_card_id ON card_tags (card_id)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE card_tags`);
  }
}
