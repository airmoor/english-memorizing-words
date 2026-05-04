import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1746316801000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "email"         TEXT          NOT NULL,
        "password_hash" TEXT          NOT NULL,
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_users_id"    PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
