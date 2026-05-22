import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VocabularyService, VocabularyQueryDto } from './vocabulary.service';

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

  // ── getUserVocabulary ─────────────────────────────────────────────────────

  describe('getUserVocabulary', () => {
    const userId  = 'user-1';
    const wordId  = 'word-1';
    const cardId  = 'card-1';

    /** Set up the 6 sequential dataSource.query responses for one successful call */
    function mockFullFetch(
      overrides: {
        count?: string;
        words?: object[];
        meanings?: object[];
        boards?: object[];
        tags?: object[];
        notes?: object[];
      } = {},
    ) {
      const defaultWord = {
        userWordId:    'uw-1',
        cardId,
        wordId,
        wordText:      'ephemeral',
        transcription: null,
        provider:      'merriam-webster',
        savedAt:       new Date('2024-01-01'),
        nextReview:    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        lastReviewedAt: new Date('2024-01-02'),
        intervalDays:  3,
        easeFactor:    2.5,
      };

      dataSource.query
        .mockResolvedValueOnce([{ total: overrides.count ?? '1' }])          // COUNT
        .mockResolvedValueOnce(overrides.words ?? [defaultWord])              // items
        .mockResolvedValueOnce(overrides.meanings ?? [])                      // meanings
        .mockResolvedValueOnce(overrides.boards ?? [])                        // boards
        .mockResolvedValueOnce(overrides.tags ?? [])                          // tags
        .mockResolvedValueOnce(overrides.notes ?? []);                        // notes
    }

    it('returns empty result when total is 0', async () => {
      dataSource.query.mockResolvedValueOnce([{ total: '0' }]);
      const result = await service.getUserVocabulary(userId, {});
      expect(result).toEqual({ items: [], total: 0, hasMore: false });
    });

    it('returns items with boards, tags, note assembled per card', async () => {
      mockFullFetch({
        boards: [{ cardId, boardId: 'b-1', boardName: 'Academic' }],
        tags:   [{ cardId, tagId: 't-1', tagName: 'science' }],
        notes:  [{ cardId, id: 'n-1', body: 'My note' }],
      });

      const result = await service.getUserVocabulary(userId, {});
      const item = result.items[0];

      expect(item.cardId).toBe(cardId);
      expect(item.boards).toEqual([{ id: 'b-1', name: 'Academic' }]);
      expect(item.tags).toEqual([{ id: 't-1', name: 'science' }]);
      expect(item.note).toEqual({ id: 'n-1', body: 'My note' });
    });

    it('returns empty boards/tags and null note when card has none', async () => {
      mockFullFetch();
      const result = await service.getUserVocabulary(userId, {});
      const item = result.items[0];
      expect(item.boards).toEqual([]);
      expect(item.tags).toEqual([]);
      expect(item.note).toBeNull();
    });

    it('computes reviewState="new" for unreviewed card', async () => {
      mockFullFetch({
        words: [{
          userWordId: 'uw-1', cardId, wordId, wordText: 'w',
          transcription: null, provider: 'p', savedAt: new Date(),
          nextReview: new Date(), lastReviewedAt: null, intervalDays: 0, easeFactor: 2.5,
        }],
      });
      const result = await service.getUserVocabulary(userId, {});
      expect(result.items[0].reviewState).toBe('new');
    });

    it('computes reviewState="due" for overdue card', async () => {
      const past = new Date(Date.now() - 60_000);
      mockFullFetch({
        words: [{
          userWordId: 'uw-1', cardId, wordId, wordText: 'w',
          transcription: null, provider: 'p', savedAt: new Date(),
          nextReview: past, lastReviewedAt: new Date('2024-01-01'),
          intervalDays: 3, easeFactor: 2.5,
        }],
      });
      const result = await service.getUserVocabulary(userId, {});
      expect(result.items[0].reviewState).toBe('due');
    });

    it('computes reviewState="learning" for interval < 7', async () => {
      const future = new Date(Date.now() + 3 * 86_400_000);
      mockFullFetch({
        words: [{
          userWordId: 'uw-1', cardId, wordId, wordText: 'w',
          transcription: null, provider: 'p', savedAt: new Date(),
          nextReview: future, lastReviewedAt: new Date('2024-01-01'),
          intervalDays: 3, easeFactor: 2.5,
        }],
      });
      const result = await service.getUserVocabulary(userId, {});
      expect(result.items[0].reviewState).toBe('learning');
    });

    it('computes reviewState="review" for interval 7–20', async () => {
      const future = new Date(Date.now() + 14 * 86_400_000);
      mockFullFetch({
        words: [{
          userWordId: 'uw-1', cardId, wordId, wordText: 'w',
          transcription: null, provider: 'p', savedAt: new Date(),
          nextReview: future, lastReviewedAt: new Date('2024-01-01'),
          intervalDays: 14, easeFactor: 2.5,
        }],
      });
      const result = await service.getUserVocabulary(userId, {});
      expect(result.items[0].reviewState).toBe('review');
    });

    it('computes reviewState="mature" for interval >= 21', async () => {
      const future = new Date(Date.now() + 30 * 86_400_000);
      mockFullFetch({
        words: [{
          userWordId: 'uw-1', cardId, wordId, wordText: 'w',
          transcription: null, provider: 'p', savedAt: new Date(),
          nextReview: future, lastReviewedAt: new Date('2024-01-01'),
          intervalDays: 30, easeFactor: 2.5,
        }],
      });
      const result = await service.getUserVocabulary(userId, {});
      expect(result.items[0].reviewState).toBe('mature');
    });

    it('sets nextReviewHuman to null when card has no nextReview', async () => {
      mockFullFetch({
        words: [{
          userWordId: 'uw-1', cardId, wordId, wordText: 'w',
          transcription: null, provider: 'p', savedAt: new Date(),
          nextReview: null, lastReviewedAt: null, intervalDays: null, easeFactor: null,
        }],
      });
      const result = await service.getUserVocabulary(userId, {});
      expect(result.items[0].nextReviewHuman).toBeNull();
    });

    it('sets nextReviewHuman to a non-empty string when nextReview is present', async () => {
      mockFullFetch();
      const result = await service.getUserVocabulary(userId, {});
      expect(typeof result.items[0].nextReviewHuman).toBe('string');
      expect(result.items[0].nextReviewHuman!.length).toBeGreaterThan(0);
    });

    it('adds boardId EXISTS filter to WHERE when boardId is provided', async () => {
      mockFullFetch({ count: '0' });
      await service.getUserVocabulary(userId, { boardId: 'board-uuid' });
      const countCall = dataSource.query.mock.calls[0] as [string, unknown[]];
      expect(countCall[0]).toContain('card_boards');
      expect(countCall[1]).toContain('board-uuid');
    });

    it('adds one EXISTS per tag when tagIds is a comma-separated list', async () => {
      mockFullFetch({ count: '0' });
      await service.getUserVocabulary(userId, { tagIds: 'tag-1,tag-2' });
      const countSql = (dataSource.query.mock.calls[0] as [string, unknown[]])[0];
      const countParams = (dataSource.query.mock.calls[0] as [string, unknown[]])[1];
      // Two EXISTS subqueries — one per tag
      const tagMatches = (countSql.match(/card_tags/g) ?? []).length;
      expect(tagMatches).toBe(2);
      expect(countParams).toContain('tag-1');
      expect(countParams).toContain('tag-2');
    });

    it('adds reviewState filter to WHERE', async () => {
      mockFullFetch({ count: '0' });
      await service.getUserVocabulary(userId, { reviewState: 'new' });
      const countSql = (dataSource.query.mock.calls[0] as [string, unknown[]])[0];
      expect(countSql).toContain('last_reviewed_at IS NULL');
    });

    it('adds partOfSpeech EXISTS filter', async () => {
      mockFullFetch({ count: '0' });
      await service.getUserVocabulary(userId, { partOfSpeech: 'adjective' });
      const countSql = (dataSource.query.mock.calls[0] as [string, unknown[]])[0];
      const countParams = (dataSource.query.mock.calls[0] as [string, unknown[]])[1];
      expect(countSql).toContain('part_of_speech');
      expect(countParams).toContain('adjective');
    });

    it('flips alphabetical order to DESC when sortDir=desc', async () => {
      mockFullFetch();
      await service.getUserVocabulary(userId, { sort: 'alphabetical', sortDir: 'desc' });
      const itemsSql = (dataSource.query.mock.calls[1] as [string, unknown[]])[0];
      expect(itemsSql).toContain('w.text DESC');
    });

    it('keeps alphabetical ASC by default when sortDir is absent', async () => {
      mockFullFetch();
      await service.getUserVocabulary(userId, { sort: 'alphabetical' });
      const itemsSql = (dataSource.query.mock.calls[1] as [string, unknown[]])[0];
      expect(itemsSql).toContain('w.text ASC');
    });

    it('returns hasMore=true when total > offset + items.length', async () => {
      mockFullFetch({ count: '10' });
      const result = await service.getUserVocabulary(userId, { limit: '1', offset: '0' });
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(10);
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
