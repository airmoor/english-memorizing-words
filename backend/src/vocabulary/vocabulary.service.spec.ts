import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VocabularyService } from './vocabulary.service';

// ── helpers ──────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1';
const MEANING_ID = 'meaning-uuid-1';
const WORD_ID = 'word-uuid-1';

const makeQr = (queryImpl?: jest.Mock) => ({
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  query: queryImpl ?? jest.fn().mockResolvedValue(undefined),
});

// ── suite ─────────────────────────────────────────────────────────────────────

describe('VocabularyService', () => {
  let service: VocabularyService;
  let dataSourceQuery: jest.Mock;
  let dataSource: { query: jest.Mock; createQueryRunner: jest.Mock };

  beforeEach(async () => {
    dataSourceQuery = jest.fn();
    const qr = makeQr();

    dataSource = {
      query: dataSourceQuery,
      createQueryRunner: jest.fn().mockReturnValue(qr),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocabularyService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(VocabularyService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── saveMeaning ─────────────────────────────────────────────────────────────

  describe('saveMeaning', () => {
    it('inserts user_meaning and card in a single transaction', async () => {
      dataSourceQuery.mockResolvedValue([{ exists: true }]);
      const qr = dataSource.createQueryRunner();

      await service.saveMeaning(USER_ID, MEANING_ID);

      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(qr.rollbackTransaction).not.toHaveBeenCalled();

      const sqlCalls: string[] = (qr.query as jest.Mock).mock.calls.map(
        ([sql]: [string]) => sql,
      );
      expect(sqlCalls.some((s) => /INSERT INTO user_meanings/.test(s))).toBe(true);
      expect(sqlCalls.some((s) => /INSERT INTO cards/.test(s))).toBe(true);
    });

    it('uses ON CONFLICT DO NOTHING on both inserts (idempotency)', async () => {
      dataSourceQuery.mockResolvedValue([{ exists: true }]);
      const qr = dataSource.createQueryRunner();

      await service.saveMeaning(USER_ID, MEANING_ID);

      const sqlCalls: string[] = (qr.query as jest.Mock).mock.calls.map(
        ([sql]: [string]) => sql,
      );
      const conflictCalls = sqlCalls.filter((s) =>
        /ON CONFLICT .+ DO NOTHING/.test(s),
      );
      expect(conflictCalls).toHaveLength(2);
    });

    it('is idempotent — calling twice does not throw', async () => {
      dataSourceQuery.mockResolvedValue([{ exists: true }]);

      await expect(service.saveMeaning(USER_ID, MEANING_ID)).resolves.toBeUndefined();
      await expect(service.saveMeaning(USER_ID, MEANING_ID)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when meaning does not exist', async () => {
      dataSourceQuery.mockResolvedValue([{ exists: false }]);

      await expect(service.saveMeaning(USER_ID, MEANING_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('rolls back and releases the runner on DB error', async () => {
      dataSourceQuery.mockResolvedValue([{ exists: true }]);
      const failQr = makeQr(jest.fn().mockRejectedValue(new Error('DB error')));
      dataSource.createQueryRunner.mockReturnValue(failQr);

      await expect(service.saveMeaning(USER_ID, MEANING_ID)).rejects.toThrow('DB error');
      expect(failQr.rollbackTransaction).toHaveBeenCalled();
      expect(failQr.release).toHaveBeenCalled();
    });

    it('always releases the runner even on error', async () => {
      dataSourceQuery.mockResolvedValue([{ exists: true }]);
      const failQr = makeQr(jest.fn().mockRejectedValue(new Error('oops')));
      dataSource.createQueryRunner.mockReturnValue(failQr);

      await expect(service.saveMeaning(USER_ID, MEANING_ID)).rejects.toThrow();
      expect(failQr.release).toHaveBeenCalled();
    });
  });

  // ── saveAllMeanings ─────────────────────────────────────────────────────────

  describe('saveAllMeanings', () => {
    it('saves all meanings in a single transaction', async () => {
      dataSourceQuery
        .mockResolvedValueOnce([{ exists: true }])
        .mockResolvedValueOnce([{ id: 'm-1' }, { id: 'm-2' }]);

      // user_meanings inserts both return a row (both new)
      const qr = dataSource.createQueryRunner();
      (qr.query as jest.Mock)
        .mockResolvedValueOnce([{ id: 'm-1' }]) // user_meanings insert m-1 → new
        .mockResolvedValueOnce(undefined)        // cards insert m-1
        .mockResolvedValueOnce([{ id: 'm-2' }]) // user_meanings insert m-2 → new
        .mockResolvedValueOnce(undefined);       // cards insert m-2

      const result = await service.saveAllMeanings(USER_ID, WORD_ID);

      expect(result).toEqual({ saved: 2 });
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      // 2 meanings × 2 inserts = 4 qr.query calls
      expect((qr.query as jest.Mock).mock.calls).toHaveLength(4);
    });

    it('counts only newly inserted meanings — skips already-saved ones', async () => {
      dataSourceQuery
        .mockResolvedValueOnce([{ exists: true }])
        .mockResolvedValueOnce([{ id: 'm-1' }, { id: 'm-2' }]);

      const qr = dataSource.createQueryRunner();
      (qr.query as jest.Mock)
        .mockResolvedValueOnce([{ id: 'm-1' }]) // user_meanings m-1 → new
        .mockResolvedValueOnce(undefined)        // cards m-1
        .mockResolvedValueOnce([])               // user_meanings m-2 → conflict skip
        .mockResolvedValueOnce(undefined);       // cards m-2

      const result = await service.saveAllMeanings(USER_ID, WORD_ID);

      expect(result).toEqual({ saved: 1 }); // only m-1 was actually new
    });

    it('returns { saved: 0 } when all meanings are already saved', async () => {
      dataSourceQuery
        .mockResolvedValueOnce([{ exists: true }])
        .mockResolvedValueOnce([{ id: 'm-1' }, { id: 'm-2' }]);

      const qr = dataSource.createQueryRunner();
      (qr.query as jest.Mock)
        .mockResolvedValueOnce([])  // user_meanings m-1 → conflict skip
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([])  // user_meanings m-2 → conflict skip
        .mockResolvedValueOnce(undefined);

      const result = await service.saveAllMeanings(USER_ID, WORD_ID);

      expect(result).toEqual({ saved: 0 });
      expect(qr.commitTransaction).toHaveBeenCalled(); // transaction still commits cleanly
    });

    it('uses ON CONFLICT DO NOTHING on every insert (save-all idempotency)', async () => {
      dataSourceQuery
        .mockResolvedValueOnce([{ exists: true }])
        .mockResolvedValueOnce([{ id: 'm-1' }, { id: 'm-2' }]);

      const qr = dataSource.createQueryRunner();
      (qr.query as jest.Mock).mockResolvedValue([]);

      await service.saveAllMeanings(USER_ID, WORD_ID);

      const allSql: string[] = (qr.query as jest.Mock).mock.calls.map(
        ([sql]: [string]) => sql,
      );
      const conflictCalls = allSql.filter((s) =>
        /ON CONFLICT .+ DO NOTHING/.test(s),
      );
      expect(conflictCalls).toHaveLength(4); // 2 meanings × 2 inserts
    });

    it('returns { saved: 0 } when word has no meanings', async () => {
      dataSourceQuery
        .mockResolvedValueOnce([{ exists: true }])
        .mockResolvedValueOnce([]); // no meanings

      const result = await service.saveAllMeanings(USER_ID, WORD_ID);

      expect(result).toEqual({ saved: 0 });
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when word does not exist', async () => {
      dataSourceQuery.mockResolvedValueOnce([{ exists: false }]);

      await expect(service.saveAllMeanings(USER_ID, WORD_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rolls back on failure and always releases', async () => {
      dataSourceQuery
        .mockResolvedValueOnce([{ exists: true }])
        .mockResolvedValueOnce([{ id: 'm-1' }]);

      const failQr = makeQr(jest.fn().mockRejectedValue(new Error('TX error')));
      dataSource.createQueryRunner.mockReturnValue(failQr);

      await expect(service.saveAllMeanings(USER_ID, WORD_ID)).rejects.toThrow();
      expect(failQr.rollbackTransaction).toHaveBeenCalled();
      expect(failQr.release).toHaveBeenCalled();
    });
  });

  // ── getUserVocabulary ───────────────────────────────────────────────────────

  describe('getUserVocabulary', () => {
    it('returns rows scoped to the requesting user', async () => {
      const mockRows = [
        {
          userMeaningId: 'um-1',
          meaningId: MEANING_ID,
          wordId: WORD_ID,
          wordText: 'hello',
          definition: 'a greeting',
          transcription: '/həˈloʊ/',
          partOfSpeech: 'exclamation',
          synonyms: ['hi'],
          examples: ['Hello!'],
          savedAt: new Date(),
        },
      ];
      dataSourceQuery.mockResolvedValue(mockRows);

      const result = await service.getUserVocabulary(USER_ID);

      expect(result).toEqual(mockRows);
      expect(dataSourceQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE um.user_id = $1'),
        [USER_ID],
      );
    });

    it('returns empty array when user has no saved meanings', async () => {
      dataSourceQuery.mockResolvedValue([]);
      const result = await service.getUserVocabulary(USER_ID);
      expect(result).toEqual([]);
    });

    it('joins meanings and words in a single query (no N+1)', async () => {
      dataSourceQuery.mockResolvedValue([]);
      await service.getUserVocabulary(USER_ID);

      expect(dataSourceQuery).toHaveBeenCalledTimes(1);
      expect(dataSourceQuery).toHaveBeenCalledWith(
        expect.stringMatching(/JOIN meanings.+JOIN words/s),
        [USER_ID],
      );
    });
  });

  // ── removeMeaning ───────────────────────────────────────────────────────────

  describe('removeMeaning', () => {
    const makeRemoveQr = (userMeaningsResult: { id: string }[]) =>
      makeQr(
        jest
          .fn()
          .mockResolvedValueOnce(undefined)          // DELETE FROM cards
          .mockResolvedValueOnce(userMeaningsResult), // DELETE FROM user_meanings RETURNING id
      );

    it('runs inside a transaction', async () => {
      const qr = makeRemoveQr([{ id: 'um-1' }]);
      dataSource.createQueryRunner.mockReturnValue(qr);

      await service.removeMeaning(USER_ID, MEANING_ID);

      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(qr.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('deletes cards BEFORE user_meanings', async () => {
      const qr = makeRemoveQr([{ id: 'um-1' }]);
      dataSource.createQueryRunner.mockReturnValue(qr);

      await service.removeMeaning(USER_ID, MEANING_ID);

      const calls: string[] = (qr.query as jest.Mock).mock.calls.map(
        ([sql]: [string]) => sql,
      );
      const cardsIdx = calls.findIndex((s) => /DELETE FROM cards/.test(s));
      const umIdx = calls.findIndex((s) => /DELETE FROM user_meanings/.test(s));

      expect(cardsIdx).toBeGreaterThanOrEqual(0);
      expect(umIdx).toBeGreaterThan(cardsIdx); // cards must come first
    });

    it('scopes both deletes to the user (ownership via WHERE)', async () => {
      const qr = makeRemoveQr([{ id: 'um-1' }]);
      dataSource.createQueryRunner.mockReturnValue(qr);

      await service.removeMeaning(USER_ID, MEANING_ID);

      const calls: [string, unknown[]][] = (qr.query as jest.Mock).mock.calls;
      calls.forEach(([, params]) =>
        expect(params).toEqual([USER_ID, MEANING_ID]),
      );
    });

    it('uses RETURNING id on user_meanings delete to detect missing rows', async () => {
      const qr = makeRemoveQr([{ id: 'um-1' }]);
      dataSource.createQueryRunner.mockReturnValue(qr);

      await service.removeMeaning(USER_ID, MEANING_ID);

      const sqlCalls: string[] = (qr.query as jest.Mock).mock.calls.map(
        ([sql]: [string]) => sql,
      );
      expect(
        sqlCalls.some((s) => /DELETE FROM user_meanings/.test(s) && /RETURNING id/.test(s)),
      ).toBe(true);
    });

    it('throws NotFoundException and rolls back when meaning is not in vocabulary', async () => {
      const qr = makeRemoveQr([]); // user_meanings RETURNING returns nothing
      dataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        service.removeMeaning(USER_ID, MEANING_ID),
      ).rejects.toThrow(NotFoundException);

      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.commitTransaction).not.toHaveBeenCalled();
    });

    it('always releases the runner', async () => {
      const qr = makeRemoveQr([]);
      dataSource.createQueryRunner.mockReturnValue(qr);

      await expect(service.removeMeaning(USER_ID, MEANING_ID)).rejects.toThrow();
      expect(qr.release).toHaveBeenCalled();
    });
  });
});
