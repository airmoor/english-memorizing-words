import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tags are user-owned, lightweight string labels applied to cards.
 * They are purely descriptive metadata — they carry no structural weight
 * and do not form a navigation hierarchy.
 *
 * name is stored as citext so that the UNIQUE (user_id, name) constraint
 * is case-insensitive. The application layer further normalises names to
 * lowercase before persistence so that stored values are consistent.
 */
export class CreateTags1748000003000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE tags (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name       CITEXT      NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, name)
      )
    `);

    await qr.query(`CREATE INDEX idx_tags_user_id ON tags (user_id)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE tags`);
  }
}
