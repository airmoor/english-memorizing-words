import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VocabularyService } from './vocabulary.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeQr(overrides: Record<string, jest.Mock> = {}) {
  return {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    query: jest.fn(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VocabularyService', () => {
  let service: VocabularyService;
  let dataSource: { query: jest.Mock; createQueryRunner: jest.Mock };

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
      createQueryRunner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocabularyService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(VocabularyService);
  });

  // ── saveWord ───────────────────────────────────────────────────────────────

  describe('saveWord', () => {
    const userId = 'user-1';
    const wordId = 'word-1';

    it('saves word and creates card when word exists', async () => {
      dataSource.query.mockResolvedValueOnce([{ exists: true }]);

      const qr = makeQr({ query: jest.fn().mockResolvedValue([]) });
      dataSource.createQueryRunner.mockReturnValue(qr);

      await service.saveWord(userId, wordId);

      expect(qr.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_words'),
        [userId, wordId],
      );
      expect(qr.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO cards'),
        [userId, wordId],
      );
      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when word does not exist', async () => {
      dataSource.query.mockResolvedValueOnce([{ exists: false }]);

      await expect(service.saveWord(userId, wordId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('is idempotent — ON CONFLICT DO NOTHING means repeated saves are safe', async () => {
      dataSource.query.mockResolvedValueOnce([{ exists: true }]);

      const qr = makeQr({ query: jest.fn().mockResolvedValue([]) });
      dataSource.createQueryRunner.mockReturnValue(qr);

      await service.saveWord(userId, wordId);

      const calls = qr.query.mock.calls as [string, unknown[]][];
      const userWordsInsert = calls.find(([sql]) => sql.includes('INSERT INTO user_words'));
      const cardsInsert = calls.find(([sql]) => sql.includes('INSERT INTO cards'));
      expect(userWordsInsert![0]).toContain('DO NOTHING');
      expect(cardsInsert![0]).toContain('DO NOTHING');
    });

    it('rolls back on error', async () => {
      dataSource.query.mockResolvedValueOnce([{ exists: true }]);

      const qr = makeQr({
        query: jest.fn().mockRejectedValue(new Error('DB error')),
      });
      dataSource.createQueryRunner.mockReturnValue(qr);

      await expect(service.saveWord(userId, wordId)).rejects.toThrow('DB error');
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  // ── removeWord ────────────────────────────────────────────────────────────

  describe('removeWord', () => {
    const userId = 'user-1';
    const wordId = 'word-1';

    it('removes word and cascades card deletion', async () => {
      const qr = makeQr({
        query: jest
          .fn()
          .mockResolvedValueOnce([])               // DELETE cards
          .mockResolvedValueOnce([{ id: 'uw-1' }]), // DELETE user_words RETURNING
      });
      dataSource.createQueryRunner.mockReturnValue(qr);

      await service.removeWord(userId, wordId);

      expect(qr.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM cards'),
        [userId, wordId],
      );
      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when word not in vocabulary', async () => {
      const qr = makeQr({
        query: jest
          .fn()
          .mockResolvedValueOnce([]) // DELETE cards (no-op)
          .mockResolvedValueOnce([]), // DELETE user_words returns empty
      });
      dataSource.createQueryRunner.mockReturnValue(qr);

      await expect(service.removeWord(userId, wordId)).rejects.toThrow(
        NotFoundException,
      );
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
