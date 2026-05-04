import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserMeanings1746316804000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_meanings" (
        "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    UUID        NOT NULL,
        "meaning_id" UUID        NOT NULL,
        "saved_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_user_meanings_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_meanings_user_meaning" UNIQUE ("user_id", "meaning_id"),
        CONSTRAINT "FK_user_meanings_user_id"
          FOREIGN KEY ("user_id")
          REFERENCES "users" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_user_meanings_meaning_id"
          FOREIGN KEY ("meaning_id")
          REFERENCES "meanings" ("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_meanings_user_meaning"
        ON "user_meanings" ("user_id", "meaning_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_meanings_user_meaning"`);
    await queryRunner.query(`DROP TABLE "user_meanings"`);
  }
}
