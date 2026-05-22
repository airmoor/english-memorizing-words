import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPasswordResetTokensUsedColumn1748500003000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE password_reset_tokens DROP COLUMN used`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE password_reset_tokens ADD COLUMN used BOOLEAN NOT NULL DEFAULT FALSE`);
  }
}
