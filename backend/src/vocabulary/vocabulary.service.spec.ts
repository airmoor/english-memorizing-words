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
        .mockResolvedValueOnce([{ exists: true }])              // word exists
        .mockResolvedValueOnce([{ id: 'm-1' }, { id: 'm-2' }]); // meanings

      const qr = dataSource.createQueryRunner();

      const result = await service.saveAllMeanings(USER_ID, WORD_ID);

      expect(result).toEqual({ saved: 2 });
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();

      // 2 meanings × 2 inserts each = 4 qr.query calls
      expect((qr.query as jest.Mock).mock.calls).toHaveLength(4);
    });

    it('uses ON CONFLICT DO NOTHING on every insert (save-all idempotency)', async () => {
      dataSourceQuery
        .mockResolvedValueOnce([{ exists: true }])
        .mockResolvedValueOnce([{ id: 'm-1' }, { id: 'm-2' }]);

      const qr = dataSource.createQueryRunner();
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
    it('deletes user_meaning scoped to the user (ownership via WHERE)', async () => {
      dataSourceQuery.mockResolvedValue([{ id: 'um-1' }]);

      await expect(
        service.removeMeaning(USER_ID, MEANING_ID),
      ).resolves.toBeUndefined();

      expect(dataSourceQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND meaning_id = $2'),
        [USER_ID, MEANING_ID],
      );
    });

    it('uses RETURNING id to detect whether a row was deleted', async () => {
      dataSourceQuery.mockResolvedValue([{ id: 'um-1' }]);
      await service.removeMeaning(USER_ID, MEANING_ID);

      expect(dataSourceQuery).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING id'),
        expect.any(Array),
      );
    });

    it('throws NotFoundException when meaning is not in the vocabulary', async () => {
      dataSourceQuery.mockResolvedValue([]); // 0 rows deleted

      await expect(
        service.removeMeaning(USER_ID, MEANING_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('cascade: relies on DB CASCADE (no explicit card/log deletes in service)', async () => {
      dataSourceQuery.mockResolvedValue([{ id: 'um-1' }]);
      await service.removeMeaning(USER_ID, MEANING_ID);

      // Service issues exactly one DELETE query — cascade handles the rest
      expect(dataSourceQuery).toHaveBeenCalledTimes(1);
      expect(dataSourceQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_meanings'),
        expect.any(Array),
      );
    });
  });
});
