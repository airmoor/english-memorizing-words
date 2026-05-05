import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { WordsService } from './words.service';
import { DictionaryApiService } from './dictionary-api.service';
import { Word } from '../database/entities/word.entity';
import { Meaning } from '../database/entities/meaning.entity';
import { ApiEntry } from './normalize';

// ---- fixtures ----

const mockWord: Word = {
  id: 'word-uuid-1',
  text: 'hello',
  fetchedAt: new Date('2026-01-01'),
  meanings: [],
};

const mockMeaning: Meaning = {
  id: 'meaning-uuid-1',
  wordId: 'word-uuid-1',
  definition: 'used as a greeting',
  transcription: '/həˈloʊ/',
  partOfSpeech: 'exclamation',
  synonyms: ['hi'],
  examples: ['Hello there!'],
  word: mockWord as Word,
  userMeanings: [],
  cards: [],
};

const apiResponse: ApiEntry[] = [
  {
    word: 'hello',
    phonetics: [{ text: '/həˈloʊ/' }],
    meanings: [
      {
        partOfSpeech: 'exclamation',
        definitions: [
          { definition: 'used as a greeting', example: 'Hello there!', synonyms: ['hi'] },
        ],
      },
    ],
  },
];

// ---- QueryRunner mock ----

const makeQueryRunner = (overrides: Record<string, jest.Mock> = {}) => ({
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
  ...overrides,
});

// ---- suite ----

describe('WordsService', () => {
  let service: WordsService;
  let wordsRepo: { findOne: jest.Mock; findOneOrFail: jest.Mock };
  let meaningsRepo: { find: jest.Mock };
  let dictionaryApi: { fetchWord: jest.Mock };
  let dataSource: { createQueryRunner: jest.Mock };
  let qr: ReturnType<typeof makeQueryRunner>;

  beforeEach(async () => {
    qr = makeQueryRunner({
      query: jest.fn()
        .mockResolvedValueOnce(undefined)            // INSERT word
        .mockResolvedValueOnce([{ id: 'word-uuid-1' }]) // SELECT word id
        .mockResolvedValue(undefined),               // INSERT meanings (any number)
    });

    wordsRepo = { findOne: jest.fn(), findOneOrFail: jest.fn() };
    meaningsRepo = { find: jest.fn() };
    dictionaryApi = { fetchWord: jest.fn() };
    dataSource = { createQueryRunner: jest.fn().mockReturnValue(qr) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordsService,
        { provide: getRepositoryToken(Word), useValue: wordsRepo },
        { provide: getRepositoryToken(Meaning), useValue: meaningsRepo },
        { provide: DictionaryApiService, useValue: dictionaryApi },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(WordsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---- cache hit ----

  describe('cache hit', () => {
    beforeEach(() => {
      wordsRepo.findOne.mockResolvedValue({ ...mockWord, meanings: [mockMeaning] });
    });

    it('returns meanings from DB without calling the external API', async () => {
      const result = await service.findWord('hello');
      expect(result.meanings).toHaveLength(1);
      expect(dictionaryApi.fetchWord).not.toHaveBeenCalled();
    });

    it('normalizes the input before the DB lookup', async () => {
      await service.findWord('  HELLO  ');
      expect(wordsRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { text: 'hello' } }),
      );
    });

    it('maps meaning fields correctly', async () => {
      const result = await service.findWord('hello');
      expect(result).toMatchObject({
        id: 'word-uuid-1',
        text: 'hello',
        meanings: [
          {
            id: 'meaning-uuid-1',
            definition: 'used as a greeting',
            transcription: '/həˈloʊ/',
            partOfSpeech: 'exclamation',
            synonyms: ['hi'],
            examples: ['Hello there!'],
          },
        ],
      });
    });
  });

  // ---- cache miss — successful fetch ----

  describe('cache miss — successful fetch', () => {
    beforeEach(() => {
      wordsRepo.findOne.mockResolvedValue(null);
      dictionaryApi.fetchWord.mockResolvedValue(apiResponse);
      wordsRepo.findOneOrFail.mockResolvedValue(mockWord);
      meaningsRepo.find.mockResolvedValue([mockMeaning]);
    });

    it('calls the external API when the word is not in the DB', async () => {
      await service.findWord('hello');
      expect(dictionaryApi.fetchWord).toHaveBeenCalledWith('hello');
    });

    it('opens a transaction and commits it', async () => {
      await service.findWord('hello');
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(qr.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('always releases the query runner', async () => {
      await service.findWord('hello');
      expect(qr.release).toHaveBeenCalled();
    });

    it('inserts the word with ON CONFLICT (text) DO NOTHING', async () => {
      await service.findWord('hello');
      expect(qr.query).toHaveBeenCalledWith(
        expect.stringMatching(/ON CONFLICT \(text\) DO NOTHING/i),
        ['hello'],
      );
    });

    it('re-fetches the word id after the insert', async () => {
      await service.findWord('hello');
      expect(qr.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT id FROM words WHERE text/i),
        ['hello'],
      );
    });

    it('inserts each meaning with ON CONFLICT DO NOTHING', async () => {
      await service.findWord('hello');
      const meaningInsert = qr.query.mock.calls.find(([sql]: [string]) =>
        /INSERT INTO meanings/.test(sql) && /ON CONFLICT DO NOTHING/.test(sql),
      );
      expect(meaningInsert).toBeDefined();
    });

    it('returns the persisted meanings', async () => {
      const result = await service.findWord('hello');
      expect(result.meanings[0].definition).toBe('used as a greeting');
    });
  });

  // ---- API errors ----

  describe('word not found in external API', () => {
    it('propagates NotFoundException (404)', async () => {
      wordsRepo.findOne.mockResolvedValue(null);
      dictionaryApi.fetchWord.mockRejectedValue(new NotFoundException());

      await expect(service.findWord('xyzqwerty')).rejects.toThrow(NotFoundException);
      expect(qr.startTransaction).not.toHaveBeenCalled();
    });
  });

  describe('external API unavailable', () => {
    it('propagates ServiceUnavailableException (503)', async () => {
      wordsRepo.findOne.mockResolvedValue(null);
      dictionaryApi.fetchWord.mockRejectedValue(new ServiceUnavailableException());

      await expect(service.findWord('hello')).rejects.toThrow(ServiceUnavailableException);
      expect(qr.startTransaction).not.toHaveBeenCalled();
    });
  });

  // ---- transaction rollback ----

  describe('DB write failure', () => {
    it('rolls back and releases the query runner on error', async () => {
      wordsRepo.findOne.mockResolvedValue(null);
      dictionaryApi.fetchWord.mockResolvedValue(apiResponse);

      const failingQr = makeQueryRunner({
        query: jest.fn().mockRejectedValue(new Error('DB error')),
      });
      dataSource.createQueryRunner.mockReturnValue(failingQr);

      await expect(service.findWord('hello')).rejects.toThrow('DB error');
      expect(failingQr.rollbackTransaction).toHaveBeenCalled();
      expect(failingQr.release).toHaveBeenCalled();
    });
  });
});
