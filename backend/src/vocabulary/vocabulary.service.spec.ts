import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

    /**
     * Set up sequential dataSource.query responses for one successful call.
     *
     * Pass `contextCount` when the test uses a narrowing filter (q, filters,
     * reviewState, partOfSpeech, tagIds) — a second COUNT query fires for the
     * board-scoped unfiltered total in those cases.
     */
    function mockFullFetch(
      overrides: {
        count?: string;
        /** Provide when the call uses a narrowing filter so the context COUNT is mocked. */
        contextCount?: string;
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
        .mockResolvedValueOnce([{ total: overrides.count ?? '1' }]);          // filtered COUNT

      // Context COUNT fires only when narrowing filters are present
      if (overrides.contextCount !== undefined) {
        dataSource.query
          .mockResolvedValueOnce([{ total: overrides.contextCount }]);        // context COUNT
      }

      dataSource.query
        .mockResolvedValueOnce(overrides.words ?? [defaultWord])              // items
        .mockResolvedValueOnce(overrides.meanings ?? [])                      // meanings
        .mockResolvedValueOnce(overrides.boards ?? [])                        // boards
        .mockResolvedValueOnce(overrides.tags ?? [])                          // tags
        .mockResolvedValueOnce(overrides.notes ?? []);                        // notes
    }

    it('returns empty result when total is 0', async () => {
      dataSource.query.mockResolvedValueOnce([{ total: '0' }]);
      const result = await service.getUserVocabulary(userId, {});
      // No narrowing filters → contextTotalCount equals filteredCount
      expect(result).toEqual({ items: [], total: 0, totalCount: 0, hasMore: false });
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

    it('computes reviewState="upcoming" for interval < 7 with future nextReview', async () => {
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
      expect(result.items[0].reviewState).toBe('upcoming');
    });

    it('computes reviewState="upcoming" for interval 7–20 with future nextReview', async () => {
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
      expect(result.items[0].reviewState).toBe('upcoming');
    });

    it('computes reviewState="mastered" for interval >= 21 with future nextReview', async () => {
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
      expect(result.items[0].reviewState).toBe('mastered');
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
      const BOARD_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      mockFullFetch({ count: '0' });
      await service.getUserVocabulary(userId, { boardId: BOARD_ID });
      const countCall = dataSource.query.mock.calls[0] as [string, unknown[]];
      expect(countCall[0]).toContain('card_boards');
      expect(countCall[1]).toContain(BOARD_ID);
    });

    it('adds one EXISTS per tag when tagIds is a comma-separated list', async () => {
      const TAG_A = '11111111-1111-1111-1111-111111111111';
      const TAG_B = '22222222-2222-2222-2222-222222222222';
      mockFullFetch({ count: '0', contextCount: '0' }); // tagIds is a narrowing filter
      await service.getUserVocabulary(userId, { tagIds: `${TAG_A},${TAG_B}` });
      const countSql = (dataSource.query.mock.calls[0] as [string, unknown[]])[0];
      const countParams = (dataSource.query.mock.calls[0] as [string, unknown[]])[1];
      // Two EXISTS subqueries — one per tag
      const tagMatches = (countSql.match(/card_tags/g) ?? []).length;
      expect(tagMatches).toBe(2);
      expect(countParams).toContain(TAG_A);
      expect(countParams).toContain(TAG_B);
    });

    it('throws BadRequestException for non-UUID tagIds', async () => {
      await expect(
        service.getUserVocabulary(userId, { tagIds: 'not-a-uuid' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('adds reviewState filter to WHERE', async () => {
      mockFullFetch({ count: '0', contextCount: '5' }); // reviewState is a narrowing filter
      await service.getUserVocabulary(userId, { reviewState: 'new' });
      const countSql = (dataSource.query.mock.calls[0] as [string, unknown[]])[0];
      expect(countSql).toContain('last_reviewed_at IS NULL');
    });

    it('adds partOfSpeech EXISTS filter', async () => {
      mockFullFetch({ count: '0', contextCount: '5' }); // partOfSpeech is a narrowing filter
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

    // ── search query (q filter) ──────────────────────────────────────────────

    describe('search query (q filter)', () => {
      it('adds w.text ILIKE filter to WHERE for exact match (q="cat")', async () => {
        mockFullFetch({ count: '0', contextCount: '5' }); // q is a narrowing filter
        await service.getUserVocabulary(userId, { q: 'cat' });

        const [countSql, countParams] = dataSource.query.mock.calls[0] as [string, unknown[]];
        expect(countSql).toContain('w.text ILIKE');
        expect(countParams).toContain('%cat%');
      });

      it('adds w.text ILIKE filter for partial match (q="ca")', async () => {
        mockFullFetch({ count: '0', contextCount: '5' }); // q is a narrowing filter
        await service.getUserVocabulary(userId, { q: 'ca' });

        const [, countParams] = dataSource.query.mock.calls[0] as [string, unknown[]];
        expect(countParams).toContain('%ca%');
      });

      it('does not fire items query when count is 0 (no results for q="zzzz")', async () => {
        // q is a narrowing filter → two COUNT queries fire (filtered + context)
        dataSource.query
          .mockResolvedValueOnce([{ total: '0' }])   // filtered COUNT
          .mockResolvedValueOnce([{ total: '5' }]);  // context COUNT
        const result = await service.getUserVocabulary(userId, { q: 'zzzz' });

        expect(result).toEqual({ items: [], total: 0, totalCount: 5, hasMore: false });
        // Only the two COUNT queries should have been called — no items query
        expect(dataSource.query).toHaveBeenCalledTimes(2);
      });

      it('uses ILIKE operator (case-insensitive) — not LIKE', async () => {
        mockFullFetch({ count: '0', contextCount: '5' }); // q is a narrowing filter
        await service.getUserVocabulary(userId, { q: 'CAT' });

        const [countSql] = dataSource.query.mock.calls[0] as [string, unknown[]];
        // ILIKE is the case-insensitive variant; plain LIKE would be wrong
        expect(countSql).toContain('ILIKE');
        expect(countSql).not.toMatch(/\bLIKE\b(?!.*ILIKE)/);
      });

      it('does not search definitions — no m2.definition in WHERE (regression)', async () => {
        mockFullFetch({ count: '0', contextCount: '5' }); // q is a narrowing filter
        await service.getUserVocabulary(userId, { q: 'cat' });

        const [countSql] = dataSource.query.mock.calls[0] as [string, unknown[]];
        // The old implementation had OR EXISTS (...m2.definition ILIKE...) which
        // caused "indicate"/"locate" etc. to match "cat". Must not be present.
        expect(countSql).not.toContain('m2.definition');
        // Also must not reference a meanings subquery in the WHERE clause at all
        expect(countSql).not.toMatch(/WHERE.*meanings/s);
      });

      it('adds relevance CASE expression to ORDER BY in items query', async () => {
        mockFullFetch({ contextCount: '5' }); // q is a narrowing filter → context COUNT at calls[1]
        await service.getUserVocabulary(userId, { q: 'cat' });

        // calls[0] = filtered COUNT, calls[1] = context COUNT, calls[2] = items query
        const [itemsSql, itemsParams] = dataSource.query.mock.calls[2] as [string, unknown[]];
        // CASE rank should be present in the items ORDER BY
        expect(itemsSql).toContain('CASE WHEN');
        expect(itemsSql).toContain('THEN 0');
        expect(itemsSql).toContain('THEN 1');
        expect(itemsSql).toContain('ORDER BY');
        // itemsParams must include the raw query value for exact-match ranking ($N = 'cat')
        expect(itemsParams).toContain('cat');
        // …and the starts-with prefix ($N+1 = 'cat%')
        expect(itemsParams).toContain('cat%');
      });

      it('COUNT params do not include raw q or prefix — only the ILIKE pattern', async () => {
        mockFullFetch({ contextCount: '5' }); // q is a narrowing filter
        await service.getUserVocabulary(userId, { q: 'cat' });

        const [, countParams] = dataSource.query.mock.calls[0] as [string, unknown[]];
        // COUNT WHERE uses '%cat%' only; raw 'cat' and 'cat%' must not leak in
        expect(countParams).toContain('%cat%');
        expect(countParams).not.toContain('cat%');   // prefix pattern is items-only
        // 'cat' exactly appears in '%cat%', so check it's NOT a standalone element
        const standalone = (countParams as unknown[]).filter((p) => p === 'cat');
        expect(standalone).toHaveLength(0);
      });

      it('trims whitespace before building the filter (q="  cat  " → %cat%)', async () => {
        mockFullFetch({ count: '0', contextCount: '5' }); // q is a narrowing filter
        await service.getUserVocabulary(userId, { q: '  cat  ' });

        const [, countParams] = dataSource.query.mock.calls[0] as [string, unknown[]];
        expect(countParams).toContain('%cat%');
        // Untrimmed pattern must not appear
        expect(countParams).not.toContain('%  cat  %');
      });

      it('combines q filter with reviewState — both conditions in WHERE', async () => {
        mockFullFetch({ count: '0', contextCount: '5' }); // q + reviewState are narrowing filters
        await service.getUserVocabulary(userId, { q: 'cat', reviewState: 'new' });

        const [countSql, countParams] = dataSource.query.mock.calls[0] as [string, unknown[]];
        expect(countSql).toContain('w.text ILIKE');
        expect(countParams).toContain('%cat%');
        // reviewState="new" maps to "last_reviewed_at IS NULL" condition
        expect(countSql).toContain('last_reviewed_at IS NULL');
      });

      it('COUNT and items use the same WHERE params (pagination consistency)', async () => {
        mockFullFetch({ contextCount: '5' }); // q is a narrowing filter → context COUNT at calls[1]
        await service.getUserVocabulary(userId, { q: 'light', limit: '5', offset: '0' });

        // calls[0] = filtered COUNT, calls[1] = context COUNT, calls[2] = items query
        const countParams = (dataSource.query.mock.calls[0] as [string, unknown[]])[1];
        const itemsParams = (dataSource.query.mock.calls[2] as [string, unknown[]])[1];

        // The WHERE-clause params (userId + ILIKE pattern) must appear in both
        expect(itemsParams).toContain(countParams[0]); // userId
        expect(itemsParams).toContain('%light%');      // ILIKE pattern
        // items has additional rank + pagination params on top
        expect(itemsParams.length).toBeGreaterThan(countParams.length);
      });
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

  // ── getWordSavedStatus ───────────────────────────────────────────────────────

  describe('getWordSavedStatus', () => {
    const userId = 'user-1';
    const wordId = 'word-1';

    it('returns isSaved false with no cardId/boards when the word is not saved', async () => {
      dataSource.query.mockResolvedValueOnce([]);

      const result = await service.getWordSavedStatus(userId, wordId);

      expect(result).toEqual({ isSaved: false, meaningIds: [], cardId: null, boards: [] });
      expect(dataSource.query).toHaveBeenCalledTimes(1);
    });

    it('returns cardId and boards when the word is saved and on boards', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ meaningIds: ['m-1', 'm-2'] }])
        .mockResolvedValueOnce([{ id: 'card-1' }])
        .mockResolvedValueOnce([{ id: 'board-1', name: 'Travel' }]);

      const result = await service.getWordSavedStatus(userId, wordId);

      expect(result).toEqual({
        isSaved: true,
        meaningIds: ['m-1', 'm-2'],
        cardId: 'card-1',
        boards: [{ id: 'board-1', name: 'Travel' }],
      });
      expect(dataSource.query).toHaveBeenCalledTimes(3);
    });

    it('returns an empty boards array without a boards query when no card is found', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ meaningIds: [] }])
        .mockResolvedValueOnce([]); // no card row

      const result = await service.getWordSavedStatus(userId, wordId);

      expect(result.cardId).toBeNull();
      expect(result.boards).toEqual([]);
      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });
  });
});
