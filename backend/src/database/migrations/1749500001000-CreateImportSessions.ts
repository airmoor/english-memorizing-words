import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the import_sessions table.
 *
 * Purpose: persists the result of every POST /import/execute call so users can
 *   browse import history and retry failed rows.
 *
 * Design choices:
 *   - source_type / status are varchar (not enums) to allow future values
 *     without another migration.
 *   - error_rows is JSONB — snapshot data for display/retry, not relational.
 *   - ON DELETE CASCADE: user deletion removes all their import history.
 *   - Index on (user_id, created_at DESC) covers the common list query.
 */
export class CreateImportSessions1749500001000 implements MigrationInterface {
  name = 'CreateImportSessions1749500001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS import_sessions (
        id                 UUID         NOT NULL DEFAULT gen_random_uuid(),
        user_id            UUID         NOT NULL,
        source_type        VARCHAR(20)  NOT NULL DEFAULT 'paste',
        status             VARCHAR(20)  NOT NULL,
        submitted          INTEGER      NOT NULL,
        imported           INTEGER      NOT NULL,
        skipped            INTEGER      NOT NULL,
        duplicates_ignored INTEGER      NOT NULL,
        errors             INTEGER      NOT NULL,
        error_rows         JSONB        NOT NULL DEFAULT '[]'::jsonb,
        created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

        CONSTRAINT pk_import_sessions PRIMARY KEY (id),
        CONSTRAINT fk_import_sessions_user
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_sessions_user_created
        ON import_sessions (user_id, created_at DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_sessions_user_created`);
    await queryRunner.query(`DROP TABLE IF EXISTS import_sessions`);
  }
}
