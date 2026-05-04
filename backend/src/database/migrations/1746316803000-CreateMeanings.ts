import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeanings1746316803000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meanings" (
        "id"             UUID    NOT NULL DEFAULT uuid_generate_v4(),
        "word_id"        UUID    NOT NULL,
        "definition"     TEXT    NOT NULL,
        "transcription"  TEXT,
        "part_of_speech" TEXT,
        "synonyms"       TEXT[]  NOT NULL DEFAULT '{}',
        "examples"       TEXT[]  NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_meanings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meanings_word_id"
          FOREIGN KEY ("word_id")
          REFERENCES "words" ("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meanings_word_definition_pos"
        ON "meanings" ("word_id", "definition", "part_of_speech")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_meanings_word_definition_pos"`);
    await queryRunner.query(`DROP TABLE "meanings"`);
  }
}
