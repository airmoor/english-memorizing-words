import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `meanings.sense_number` to support dictionary-style rendering with
 * grouped, hierarchically-numbered senses (1, 1a, 1b, 2). MW populates this
 * field via the normalizer; Free Dictionary leaves it NULL.
 *
 * Non-destructive — old cached rows simply have NULL sense_number, which the
 * frontend renders as un-prefixed.
 */
export class AddSenseNumber1746500000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "meanings"
        ADD COLUMN "sense_number" TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "meanings"
        DROP COLUMN "sense_number"
    `);
  }
}
