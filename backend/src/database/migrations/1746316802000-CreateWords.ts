import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWords1746316802000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "words" (
        "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "text"       TEXT        NOT NULL,
        "fetched_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "PK_words_id"   PRIMARY KEY ("id"),
        CONSTRAINT "UQ_words_text" UNIQUE ("text")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_words_text" ON "words" ("text")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_words_text"`);
    await queryRunner.query(`DROP TABLE "words"`);
  }
}
