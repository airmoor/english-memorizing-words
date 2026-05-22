import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResetTokens1748500002000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE password_reset_tokens (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  TEXT        NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        used        BOOLEAN     NOT NULL DEFAULT FALSE
      )
    `);
    await qr.query(`CREATE UNIQUE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash)`);
    await qr.query(`CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE password_reset_tokens`);
  }
}
