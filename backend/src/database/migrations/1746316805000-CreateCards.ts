import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCards1746316805000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cards" (
        "id"          UUID  NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"     UUID  NOT NULL,
        "meaning_id"  UUID  NOT NULL,
        "ease_factor" FLOAT NOT NULL DEFAULT 2.5,
        "interval"    INT   NOT NULL DEFAULT 0,
        "next_review" DATE  NOT NULL DEFAULT CURRENT_DATE,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_cards_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cards_user_meaning" UNIQUE ("user_id", "meaning_id"),
        CONSTRAINT "FK_cards_user_id"
          FOREIGN KEY ("user_id")
          REFERENCES "users" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_cards_meaning_id"
          FOREIGN KEY ("meaning_id")
          REFERENCES "meanings" ("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_cards_user_next_review"
        ON "cards" ("user_id", "next_review")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_cards_user_next_review"`);
    await queryRunner.query(`DROP TABLE "cards"`);
  }
}
