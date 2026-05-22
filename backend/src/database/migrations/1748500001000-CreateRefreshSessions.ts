import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshSessions1748500001000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE refresh_sessions (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  TEXT        NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_agent  TEXT,
        ip          TEXT
      )
    `);
    await qr.query(`CREATE UNIQUE INDEX idx_refresh_sessions_token_hash ON refresh_sessions(token_hash)`);
    await qr.query(`CREATE INDEX idx_refresh_sessions_user_id ON refresh_sessions(user_id)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE refresh_sessions`);
  }
}
