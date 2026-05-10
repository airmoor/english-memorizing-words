import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewLogs1747000006000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE review_logs (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        card_id     UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        rating      TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
        reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(`CREATE INDEX idx_review_logs_card_id ON review_logs (card_id)`);
    await qr.query(`CREATE INDEX idx_review_logs_reviewed_at ON review_logs (reviewed_at)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE review_logs`);
  }
}
