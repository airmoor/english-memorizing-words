import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ImportService } from './import.service';
import { ImportSession } from '../database/entities/import-session.entity';
import { WordsService } from '../words/words.service';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { ImportRequestDto } from './dto/import-request.dto';
import { ImportSettingsDto } from './dto/import-settings.dto';
import { ImportRowDto } from './dto/import-row.dto';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSettings(overrides: Partial<ImportSettingsDto> = {}): ImportSettingsDto {
  return { duplicateMode: 'skip', ...overrides };
}

function makeRow(word: string, overrides: Partial<ImportRowDto> = {}): ImportRowDto {
  return { word, ...overrides };
}

function makeDto(words: ImportRowDto[], settings?: Partial<ImportSettingsDto>): ImportRequestDto {
  return { words, settings: makeSettings(settings) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ImportService', () => {
  let service: ImportService;
  let wordsService: { findWord: jest.Mock };
  let vocabularyService: { saveWord: jest.Mock };
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    wordsService = { findWord: jest.fn() };
    vocabularyService = { saveWord: jest.fn().mockResolvedValue(undefined) };
    dataSource = { query: jest.fn() };

    // sessionRepo is fire-and-forget in execute(); save() only needs to not crash.
    const sessionRepo = {
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: WordsService, useValue: wordsService },
        { provide: VocabularyService, useValue: vocabularyService },
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(ImportSession), useValue: sessionRepo },
      ],
    }).compile();

    service = module.get(ImportService);
  });

  // ── Normalisation ─────────────────────────────────────────────────────────

  describe('preview — normalisation', () => {
    it('trims and lowercases words', async () => {
      dataSource.query.mockResolvedValue([]); // no existing vocabulary

      const dto = makeDto([makeRow('  Ephemeral  ')]);
      const result = await service.preview('user-1', dto);

      expect(result.rows[0].word).toBe('ephemeral');
      expect(result.rows[0].status).toBe('valid');
    });

    it('filters empty rows implicitly — empty string after normalisation produces valid entry', async () => {
      dataSource.query.mockResolvedValue([]);
      const dto = makeDto([makeRow('hello')]);
      const result = await service.preview('user-1', dto);
      expect(result.rows).toHaveLength(1);
    });
  });

  // ── Within-batch deduplication ────────────────────────────────────────────

  describe('preview — within-batch deduplication', () => {
    it('marks subsequent occurrences as duplicate_within_batch with reason citing line number', async () => {
      dataSource.query.mockResolvedValue([]);

      const dto = makeDto([makeRow('apple'), makeRow('banana'), makeRow('apple')]);
      const result = await service.preview('user-1', dto);

      expect(result.rows[0].status).toBe('valid');
      expect(result.rows[1].status).toBe('valid');
      expect(result.rows[2].status).toBe('duplicate_within_batch');
      expect(result.rows[2].reason).toBe('Already in this list (line 1)');
    });

    it('first occurrence wins — first is valid, later occurrences are duplicates', async () => {
      dataSource.query.mockResolvedValue([]);

      const dto = makeDto([makeRow('rose'), makeRow('rose'), makeRow('rose')]);
      const result = await service.preview('user-1', dto);

      expect(result.rows[0].status).toBe('valid');
      expect(result.rows[1].status).toBe('duplicate_within_batch');
      expect(result.rows[1].reason).toBe('Already in this list (line 1)');
      expect(result.rows[2].status).toBe('duplicate_within_batch');
      expect(result.rows[2].reason).toBe('Already in this list (line 1)');
    });
  });

  // ── Vocabulary duplicate detection ────────────────────────────────────────

  describe('preview — existing vocabulary duplicates', () => {
    it('marks words already in vocabulary as duplicate_vocabulary', async () => {
      dataSource.query.mockResolvedValue([{ text: 'ephemeral' }]);

      const dto = makeDto([makeRow('ephemeral'), makeRow('transient')]);
      const result = await service.preview('user-1', dto);

      expect(result.rows[0].status).toBe('duplicate_vocabulary');
      expect(result.rows[0].reason).toBe('Already in your vocabulary');
      expect(result.rows[1].status).toBe('valid');
    });
  });

  // ── Note truncation ───────────────────────────────────────────────────────

  describe('preview — note truncation warning', () => {
    it('appends truncation reason when notes exceed 1000 characters', async () => {
      dataSource.query.mockResolvedValue([]);

      const longNote = 'x'.repeat(1001);
      const dto = makeDto([makeRow('word', { notes: longNote })]);
      const result = await service.preview('user-1', dto);

      expect(result.rows[0].reason).toContain('Note truncated to 1000 characters');
    });

    it('does not warn when notes are exactly 1000 characters', async () => {
      dataSource.query.mockResolvedValue([]);

      const okNote = 'x'.repeat(1000);
      const dto = makeDto([makeRow('word', { notes: okNote })]);
      const result = await service.preview('user-1', dto);

      expect(result.rows[0].reason).toBeUndefined();
    });
  });

  // ── ImportStatus derivation ───────────────────────────────────────────────

  describe('ImportStatus derivation', () => {
    beforeEach(() => {
      // No existing vocabulary
      dataSource.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT w.text')) return Promise.resolve([]);
        if (sql.includes('SELECT id FROM cards')) return Promise.resolve([{ id: 'card-1' }]);
        if (sql.includes('SELECT id FROM boards')) return Promise.resolve([{ id: 'board-1' }]);
        return Promise.resolve([]);
      });
    });

    it('returns "completed" when all words are imported (errors = 0)', async () => {
      wordsService.findWord.mockResolvedValue({ id: 'word-1', text: 'apple' });

      const dto = makeDto([makeRow('apple')]);
      const result = await service.execute('user-1', dto);

      expect(result.status).toBe('completed');
      expect(result.imported).toBe(1);
      expect(result.errors).toBe(0);
      expect(result.duplicatesIgnored).toBe(0);
    });

    it('returns "partial_failure" when some words fail enrichment', async () => {
      wordsService.findWord
        .mockResolvedValueOnce({ id: 'word-1', text: 'apple' })
        .mockRejectedValueOnce(new Error('Word not found in any provider'));

      const dto = makeDto([makeRow('apple'), makeRow('xyzzy')]);
      const result = await service.execute('user-1', dto);

      expect(result.status).toBe('partial_failure');
      expect(result.imported).toBe(1);
      expect(result.errors).toBe(1);
    });

    it('returns "failed" when all words fail enrichment', async () => {
      wordsService.findWord.mockRejectedValue(new Error('Word not found in any provider'));

      const dto = makeDto([makeRow('xyzzy'), makeRow('zzzzz')]);
      const result = await service.execute('user-1', dto);

      expect(result.status).toBe('failed');
      expect(result.imported).toBe(0);
      expect(result.errors).toBe(2);
    });

    it('returns "no_changes" when all words are skipped (all existing vocabulary, skip mode)', async () => {
      // All words already in vocab → all skipped, no errors
      dataSource.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT w.text')) return Promise.resolve([{ text: 'apple' }, { text: 'banana' }]);
        return Promise.resolve([]);
      });

      const dto = makeDto([makeRow('apple'), makeRow('banana')], { duplicateMode: 'skip' });
      const result = await service.execute('user-1', dto);

      expect(result.status).toBe('no_changes');
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(2);
      expect(result.errors).toBe(0);
      // no_changes means the request succeeded — no dictionary errors occurred
    });
  });

  // ── Skip duplicate mode ───────────────────────────────────────────────────

  describe('execute — skip duplicate mode', () => {
    it('skips words already in vocabulary and increments skipped count', async () => {
      // Existing vocab returns 'apple'
      dataSource.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT w.text')) return Promise.resolve([{ text: 'apple' }]);
        return Promise.resolve([]);
      });
      wordsService.findWord.mockResolvedValue({ id: 'word-2', text: 'banana' });
      dataSource.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT w.text')) return Promise.resolve([{ text: 'apple' }]);
        if (sql.includes('SELECT id FROM cards')) return Promise.resolve([{ id: 'card-1' }]);
        return Promise.resolve([]);
      });

      const dto = makeDto([makeRow('apple'), makeRow('banana')], { duplicateMode: 'skip' });
      const result = await service.execute('user-1', dto);

      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(1);
      expect(vocabularyService.saveWord).toHaveBeenCalledTimes(1);
    });
  });

  // ── Import-anyway duplicate mode ──────────────────────────────────────────

  describe('execute — import-anyway duplicate mode', () => {
    it('imports all words regardless of existing vocabulary', async () => {
      dataSource.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM cards')) return Promise.resolve([{ id: 'card-1' }]);
        return Promise.resolve([]);
      });
      wordsService.findWord.mockResolvedValue({ id: 'word-1', text: 'apple' });

      const dto = makeDto([makeRow('apple')], { duplicateMode: 'import-anyway' });
      const result = await service.execute('user-1', dto);

      // import-anyway: vocabulary query is NOT called, word is imported directly
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
    });
  });

  // ── Within-batch dedup in execute ─────────────────────────────────────────

  describe('execute — within-batch deduplication', () => {
    it('deduplicates words within the batch before enriching', async () => {
      dataSource.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT w.text')) return Promise.resolve([]);
        if (sql.includes('SELECT id FROM cards')) return Promise.resolve([{ id: 'card-1' }]);
        return Promise.resolve([]);
      });
      wordsService.findWord.mockResolvedValue({ id: 'word-1', text: 'apple' });

      const dto = makeDto([makeRow('apple'), makeRow('apple'), makeRow('apple')]);
      const result = await service.execute('user-1', dto);

      // Only the first occurrence is enriched; the other two are counted in duplicatesIgnored
      expect(vocabularyService.saveWord).toHaveBeenCalledTimes(1);
      expect(result.imported).toBe(1);
      expect(result.duplicatesIgnored).toBe(2);
    });
  });

  // ── Board auto-creation ───────────────────────────────────────────────────

  describe('execute — board auto-creation', () => {
    it('creates a board when a row specifies a board name that does not exist', async () => {
      dataSource.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT w.text')) return Promise.resolve([]);
        if (sql.includes('INSERT INTO boards')) return Promise.resolve([{ id: 'new-board-id' }]);
        if (sql.includes('SELECT id FROM boards')) return Promise.resolve([{ id: 'new-board-id' }]);
        if (sql.includes('SELECT id FROM cards')) return Promise.resolve([{ id: 'card-1' }]);
        return Promise.resolve([]);
      });
      wordsService.findWord.mockResolvedValue({ id: 'word-1', text: 'apple' });

      const dto = makeDto([makeRow('apple', { board: 'Nature' })]);
      await service.execute('user-1', dto);

      // Board upsert SQL should have been called
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO boards'),
        expect.arrayContaining(['user-1', 'Nature']),
      );
    });
  });

  // ── Tag auto-creation ─────────────────────────────────────────────────────

  describe('execute — tag auto-creation', () => {
    it('normalises tag names and creates missing tags', async () => {
      dataSource.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT w.text')) return Promise.resolve([]);
        if (sql.includes('INSERT INTO tags')) return Promise.resolve([{ id: 'tag-1' }]);
        if (sql.includes('SELECT id FROM cards')) return Promise.resolve([{ id: 'card-1' }]);
        return Promise.resolve([]);
      });
      wordsService.findWord.mockResolvedValue({ id: 'word-1', text: 'apple' });

      const dto = makeDto([makeRow('apple', { tags: ['  Botany ', 'SCIENCE'] })]);
      await service.execute('user-1', dto);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tags'),
        expect.arrayContaining(['user-1', 'botany']),
      );
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tags'),
        expect.arrayContaining(['user-1', 'science']),
      );
    });
  });

  // ── Notes truncation in execute ───────────────────────────────────────────

  describe('execute — notes truncation', () => {
    it('truncates notes to 1000 characters before storing', async () => {
      dataSource.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT w.text')) return Promise.resolve([]);
        if (sql.includes('SELECT id FROM cards')) return Promise.resolve([{ id: 'card-1' }]);
        return Promise.resolve([]);
      });
      wordsService.findWord.mockResolvedValue({ id: 'word-1', text: 'apple' });

      const longNote = 'x'.repeat(2000);
      const dto = makeDto([makeRow('apple', { notes: longNote })]);
      await service.execute('user-1', dto);

      // card_notes upsert should be called with truncated body
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO card_notes'),
        expect.arrayContaining(['card-1', 'x'.repeat(1000)]),
      );
    });
  });
});
