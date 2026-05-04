import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewLogs1746316806000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "review_logs" (
        "id"          UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "card_id"     UUID        NOT NULL,
        "rating"      TEXT        NOT NULL,
        "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_review_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_review_logs_rating"
          CHECK ("rating" IN ('again', 'hard', 'good', 'easy')),
        CONSTRAINT "FK_review_logs_card_id"
          FOREIGN KEY ("card_id")
          REFERENCES "cards" ("id")
          ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "review_logs"`);
  }
}
