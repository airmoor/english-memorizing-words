import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PronunciationsService } from './pronunciations.service';
import { PronunciationProviderService } from './providers/pronunciation-provider.service';
import { StorageService } from './storage/storage.service';
import { WordPronunciation } from '../database/entities/word-pronunciation.entity';
import { Word } from '../database/entities/word.entity';
import { PronunciationAccent } from '../database/enums/pronunciation-accent.enum';
import { PronunciationProvider } from '../database/enums/pronunciation-provider.enum';
import type { NormalizedAudio } from './providers/provider.interface';

// ── Helpers ──────────────────────────────────────────────────────────────────

const WORD_ID = 'word-1';
const US = PronunciationAccent.US;
const KEY = `${WORD_ID}:${US}`;

const WORD_ROW = { id: WORD_ID, text: 'rabbit' };

const ROW = {
  id: 'pron-1',
  wordId: WORD_ID,
  accent: US,
  audioUrl: 'https://cdn.test/rabbit.mp3',
} as unknown as WordPronunciation;

const AUDIO: NormalizedAudio = {
  audio: Buffer.from('fake-mp3'),
  format: 'mp3',
  contentType: 'audio/mpeg',
  voice: null,
  isHuman: true,
  license: 'merriam-webster-api-tos',
  attribution: "Merriam-Webster's Learner's Dictionary",
  sourceRefUrl: 'https://media.merriam-webster.com/audio/prons/en/us/mp3/r/rabbit01.mp3',
  provider: PronunciationProvider.MERRIAM_WEBSTER,
};

/** A promise the test resolves by hand, to hold a call open mid-flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PronunciationsService', () => {
  let service: PronunciationsService;
  let repo: { findOne: jest.Mock };
  let wordsRepo: { findOne: jest.Mock };
  let providerService: { synthesize: jest.Mock };
  let storage: { put: jest.Mock };
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    repo = { findOne: jest.fn() };
    wordsRepo = { findOne: jest.fn() };
    providerService = { synthesize: jest.fn() };
    storage = { put: jest.fn() };
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PronunciationsService,
        { provide: getRepositoryToken(WordPronunciation), useValue: repo },
        { provide: getRepositoryToken(Word), useValue: wordsRepo },
        { provide: PronunciationProviderService, useValue: providerService },
        { provide: StorageService, useValue: storage },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(PronunciationsService);
  });

  // ── resolveAccent ──────────────────────────────────────────────────────────

  describe('resolveAccent', () => {
    it('accepts the supported accents', () => {
      expect(service.resolveAccent('us')).toBe(PronunciationAccent.US);
      expect(service.resolveAccent('uk')).toBe(PronunciationAccent.UK);
      expect(service.resolveAccent('au')).toBe(PronunciationAccent.AU);
    });

    it('normalises case and surrounding whitespace', () => {
      expect(service.resolveAccent('  UK ')).toBe(PronunciationAccent.UK);
    });

    it('falls back to US for anything unrecognised', () => {
      // The query param is user input, so garbage must degrade to the default
      // rather than reaching the providers or the enum column.
      for (const input of [undefined, '', '   ', 'gb', 'en-US', 'DROP TABLE']) {
        expect(service.resolveAccent(input)).toBe(PronunciationAccent.US);
      }
    });
  });

  // ── DB cache ───────────────────────────────────────────────────────────────

  describe('persistent cache', () => {
    it('returns the stored row without touching any provider', async () => {
      repo.findOne.mockResolvedValueOnce(ROW);

      const result = await service.getPronunciation(WORD_ID, US);

      expect(result).toBe(ROW);
      expect(providerService.synthesize).not.toHaveBeenCalled();
      expect(storage.put).not.toHaveBeenCalled();
    });
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  describe('cache miss', () => {
    beforeEach(() => {
      repo.findOne
        .mockResolvedValueOnce(null) // getPronunciation
        .mockResolvedValueOnce(null) // fetchAndStore re-check
        .mockResolvedValueOnce(ROW); // read-back after insert
      wordsRepo.findOne.mockResolvedValue(WORD_ROW);
      providerService.synthesize.mockResolvedValue({
        audio: AUDIO,
        degraded: false,
      });
      storage.put.mockResolvedValue({ url: ROW.audioUrl });
    });

    it('synthesizes, stores the bytes and persists the row', async () => {
      const result = await service.getPronunciation(WORD_ID, US);

      expect(result).toBe(ROW);
      expect(storage.put).toHaveBeenCalledWith(
        expect.any(String),
        AUDIO.audio,
        'audio/mpeg',
      );
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO word_pronunciations'),
        expect.arrayContaining([WORD_ID, US, AUDIO.provider]),
      );
    });

    it('writes the license metadata the sources require', async () => {
      await service.getPronunciation(WORD_ID, US);

      const [, params] = dataSource.query.mock.calls[0];
      expect(params).toContain(AUDIO.license);
      expect(params).toContain(AUDIO.attribution);
      expect(params).toContain(AUDIO.sourceRefUrl);
    });

    it('stays idempotent across instances via ON CONFLICT', async () => {
      await service.getPronunciation(WORD_ID, US);

      const [sql] = dataSource.query.mock.calls[0];
      expect(sql).toContain('ON CONFLICT (word_id, accent) DO NOTHING');
    });

    it('builds a storage key from provider, accent and a slug of the word', async () => {
      await service.getPronunciation(WORD_ID, US);

      const [storageKey] = storage.put.mock.calls[0];
      expect(storageKey).toMatch(
        /^pronunciations\/us\/merriam-webster\/rabbit-[0-9a-f]{8}\.mp3$/,
      );
    });

    it('rejects when the word does not exist', async () => {
      wordsRepo.findOne.mockResolvedValue(null);

      await expect(service.getPronunciation(WORD_ID, US)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ── Negative cache ─────────────────────────────────────────────────────────

  describe('negative cache', () => {
    function expectMiss() {
      repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      wordsRepo.findOne.mockResolvedValue(WORD_ROW);
    }

    it('returns null and remembers a genuine empty result', async () => {
      expectMiss();
      providerService.synthesize.mockResolvedValue({
        audio: null,
        degraded: false,
      });

      expect(await service.getPronunciation(WORD_ID, US)).toBeNull();

      // Second call must be answered from memory, without asking again.
      repo.findOne.mockResolvedValueOnce(null);
      expect(await service.getPronunciation(WORD_ID, US)).toBeNull();
      expect(providerService.synthesize).toHaveBeenCalledTimes(1);
    });

    it('re-queries once the TTL has elapsed', async () => {
      expectMiss();
      providerService.synthesize.mockResolvedValue({
        audio: null,
        degraded: false,
      });
      await service.getPronunciation(WORD_ID, US);

      // Six hours and change later.
      const later = Date.now() + 6 * 60 * 60 * 1000 + 1;
      jest.spyOn(Date, 'now').mockReturnValue(later);

      expectMiss();
      await service.getPronunciation(WORD_ID, US);

      expect(providerService.synthesize).toHaveBeenCalledTimes(2);
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('does NOT remember a degraded result — it raises 503 instead', async () => {
      // The whole point: an unreachable provider proves nothing about the word.
      // Caching it would silence a pronounceable word for six hours.
      expectMiss();
      providerService.synthesize.mockResolvedValue({
        audio: null,
        degraded: true,
      });

      await expect(service.getPronunciation(WORD_ID, US)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );

      expectMiss();
      providerService.synthesize.mockResolvedValue({
        audio: AUDIO,
        degraded: false,
      });
      storage.put.mockResolvedValue({ url: ROW.audioUrl });
      repo.findOne.mockResolvedValueOnce(ROW);

      // The retry reaches the providers rather than a cached "no".
      await service.getPronunciation(WORD_ID, US);
      expect(providerService.synthesize).toHaveBeenCalledTimes(2);
    });

    it('keeps accents independent', async () => {
      expectMiss();
      providerService.synthesize.mockResolvedValue({
        audio: null,
        degraded: false,
      });
      await service.getPronunciation(WORD_ID, US);

      expectMiss();
      await service.getPronunciation(WORD_ID, PronunciationAccent.UK);

      // A missing US recording says nothing about the UK one.
      expect(providerService.synthesize).toHaveBeenCalledTimes(2);
    });

    it('stays bounded when many distinct words come back empty', async () => {
      providerService.synthesize.mockResolvedValue({
        audio: null,
        degraded: false,
      });
      wordsRepo.findOne.mockResolvedValue(WORD_ROW);
      repo.findOne.mockResolvedValue(null);

      const ceiling = 10_000;
      for (let i = 0; i < ceiling + 50; i++) {
        await service.getPronunciation(`word-${i}`, US);
      }

      const map = (service as unknown as { recentEmpties: Map<string, number> })
        .recentEmpties;
      expect(map.size).toBeLessThanOrEqual(ceiling);
    });
  });

  // ── Single-flight ──────────────────────────────────────────────────────────

  describe('single-flight', () => {
    it('collapses concurrent misses on the same key into one synthesis', async () => {
      const gate = deferred<{ audio: NormalizedAudio; degraded: boolean }>();
      repo.findOne.mockResolvedValue(null);
      wordsRepo.findOne.mockResolvedValue(WORD_ROW);
      providerService.synthesize.mockReturnValue(gate.promise);
      storage.put.mockResolvedValue({ url: ROW.audioUrl });

      const first = service.getPronunciation(WORD_ID, US);
      const second = service.getPronunciation(WORD_ID, US);

      gate.resolve({ audio: AUDIO, degraded: false });
      await Promise.all([first, second]);

      // One provider call and, crucially, one paid/quota-consuming fetch.
      expect(providerService.synthesize).toHaveBeenCalledTimes(1);
      expect(storage.put).toHaveBeenCalledTimes(1);
    });

    it('releases the slot after a rejection so the next caller can retry', async () => {
      repo.findOne.mockResolvedValue(null);
      wordsRepo.findOne.mockResolvedValue(WORD_ROW);
      providerService.synthesize.mockRejectedValueOnce(
        new ServiceUnavailableException('boom'),
      );

      await expect(service.getPronunciation(WORD_ID, US)).rejects.toThrow();

      providerService.synthesize.mockResolvedValue({
        audio: AUDIO,
        degraded: false,
      });
      storage.put.mockResolvedValue({ url: ROW.audioUrl });

      // A leaked in-flight entry would make this resolve to the old rejection.
      await expect(service.getPronunciation(WORD_ID, US)).resolves.not.toThrow();
      expect(providerService.synthesize).toHaveBeenCalledTimes(2);
    });

    it('does not collapse different accents', async () => {
      repo.findOne.mockResolvedValue(null);
      wordsRepo.findOne.mockResolvedValue(WORD_ROW);
      providerService.synthesize.mockResolvedValue({
        audio: AUDIO,
        degraded: false,
      });
      storage.put.mockResolvedValue({ url: ROW.audioUrl });

      await Promise.all([
        service.getPronunciation(WORD_ID, US),
        service.getPronunciation(WORD_ID, PronunciationAccent.UK),
      ]);

      expect(providerService.synthesize).toHaveBeenCalledTimes(2);
    });
  });
});
