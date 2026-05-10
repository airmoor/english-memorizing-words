import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1747000001000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE users (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email        TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE users`);
  }
}
