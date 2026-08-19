import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { WordPronunciation } from '../database/entities/word-pronunciation.entity';
import { Word } from '../database/entities/word.entity';
import {
  PronunciationAccent,
  DEFAULT_ACCENT,
} from '../database/enums/pronunciation-accent.enum';
import { PronunciationProviderService } from './providers/pronunciation-provider.service';
import { StorageService } from './storage/storage.service';

/**
 * Resolves pronunciation audio for canonical Words.
 *
 * Read path is DB-first: PostgreSQL is the persistent cache, so once a
 * (word, accent) recording exists it is NEVER re-synthesized. Misses go to the
 * TTS provider exactly once thanks to single-flight de-duplication; a short
 * in-memory negative guard prevents hammering the provider on empty results.
 *
 * This mirrors TranslationsService — the only difference is the "fetch" step:
 * synthesize with Polly, then upload the bytes to object storage before writing
 * the row.
 */
@Injectable()
export class PronunciationsService {
  private readonly logger = new Logger(PronunciationsService.name);

  /** Collapses concurrent misses on the same (word, accent) into one synth. */
  private readonly inflight = new Map<string, Promise<WordPronunciation | null>>();
  /** key → epoch ms of last genuine empty result; suppresses re-query for a TTL.
   *  Only written when the cascade reports `degraded: false` — a transient
   *  outage must never mask a word as un-pronounceable. Bounded, see
   *  rememberEmpty(). */
  private readonly recentEmpties = new Map<string, number>();
  /** "No dictionary has a recording of this word" is a stable fact, not a
   *  transient one, so it is worth remembering for hours rather than seconds.
   *  This is also what protects the Merriam-Webster free tier (1000 lookups per
   *  day): without it, a word with no audio would burn one MW call plus one
   *  Free Dictionary call every minute for as long as someone kept clicking.
   *  In-memory, so a deploy clears it — a word that gains a recording upstream
   *  becomes available again on the next restart at the latest. */
  private readonly EMPTY_TTL_MS = 6 * 60 * 60 * 1000;
  /** Hard ceiling on recentEmpties. A key is only ever removed when the same
   *  key is read again, so a word that 404s once and is never revisited would
   *  otherwise sit in the map until the process restarts. Well above the number
   *  of distinct un-pronounceable words a single instance sees in one TTL
   *  window, so eviction is a safety net rather than a routine occurrence. */
  private readonly MAX_EMPTIES = 10_000;

  constructor(
    @InjectRepository(WordPronunciation)
    private readonly repo: Repository<WordPronunciation>,
    @InjectRepository(Word)
    private readonly wordsRepo: Repository<Word>,
    private readonly providerService: PronunciationProviderService,
    private readonly storage: StorageService,
    private readonly dataSource: DataSource,
  ) {}

  /** Resolves the accent: explicit query wins, otherwise the US default. */
  resolveAccent(accent?: string): PronunciationAccent {
    const normalized = accent?.trim().toLowerCase();
    if (
      normalized &&
      (Object.values(PronunciationAccent) as string[]).includes(normalized)
    ) {
      return normalized as PronunciationAccent;
    }
    return DEFAULT_ACCENT;
  }

  /**
   * Returns the cached pronunciation, synthesizing + storing it on a miss.
   * Returns null when no audio can be produced.
   */
  async getPronunciation(
    wordId: string,
    accent: PronunciationAccent,
  ): Promise<WordPronunciation | null> {
    // Persistent cache (DB) — present means: never call the TTS API again.
    const existing = await this.repo.findOne({ where: { wordId, accent } });
    if (existing) return existing;

    const key = `${wordId}:${accent}`;

    // Negative guard: skip the provider for a short window after a genuine
    // empty result. This read evicts only its own key; bulk cleanup happens in
    // rememberEmpty().
    const emptyAt = this.recentEmpties.get(key);
    if (emptyAt !== undefined) {
      if (Date.now() - emptyAt < this.EMPTY_TTL_MS) return null;
      this.recentEmpties.delete(key);
    }

    // Single-flight: one synth per key even under concurrent misses.
    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = this.fetchAndStore(wordId, accent, key).finally(() =>
      this.inflight.delete(key),
    );
    this.inflight.set(key, promise);
    return promise;
  }

  private async fetchAndStore(
    wordId: string,
    accent: PronunciationAccent,
    key: string,
  ): Promise<WordPronunciation | null> {
    // Re-check after acquiring the slot — a sibling request may have just filled it.
    const existing = await this.repo.findOne({ where: { wordId, accent } });
    if (existing) return existing;

    const word = await this.wordsRepo.findOne({ where: { id: wordId } });
    if (!word) throw new NotFoundException(`Word ${wordId} not found`);

    const { audio, degraded } = await this.providerService.synthesize(
      word.text,
      accent,
    );

    if (!audio) {
      // Nothing came back. Whether that is the word's fault or the network's
      // decides both the status code and whether we may remember it.
      if (degraded) {
        throw new ServiceUnavailableException(
          `Pronunciation providers are temporarily unreachable for "${word.text}"`,
        );
      }
      this.rememberEmpty(key);
      return null;
    }

    const contentHash = createHash('sha256').update(audio.audio).digest('hex');
    const storageKey = this.buildStorageKey(
      word.text,
      accent,
      audio.provider,
      audio.voice,
      audio.format,
    );

    const { url } = await this.storage.put(
      storageKey,
      audio.audio,
      audio.contentType,
    );

    // ON CONFLICT keeps this idempotent if single-flight is ever bypassed
    // (e.g. multiple instances) — first writer wins, no duplicate row.
    await this.dataSource.query(
      `INSERT INTO word_pronunciations
        (id, word_id, accent, provider, voice, is_human, storage_key, audio_url,
         format, file_size_bytes, content_hash, license, attribution, source_ref_url)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (word_id, accent) DO NOTHING`,
      [
        wordId,
        accent,
        audio.provider,
        audio.voice,
        audio.isHuman,
        storageKey,
        url,
        audio.format,
        audio.audio.length,
        contentHash,
        audio.license,
        audio.attribution,
        audio.sourceRefUrl,
      ],
    );

    return this.repo.findOne({ where: { wordId, accent } });
  }

  /**
   * Records a genuine empty result, keeping the map from growing without bound.
   *
   * Cleanup is amortized onto writes: sweep expired entries first, and if the
   * map is somehow still at the ceiling, drop the oldest keys. Map iteration
   * follows insertion order and entries are never re-inserted while live, so
   * "first" is also "oldest".
   */
  private rememberEmpty(key: string): void {
    if (this.recentEmpties.size >= this.MAX_EMPTIES) {
      const cutoff = Date.now() - this.EMPTY_TTL_MS;
      for (const [k, at] of this.recentEmpties) {
        if (at <= cutoff) this.recentEmpties.delete(k);
      }
      // Pathological case: everything is still within its TTL. Evict oldest
      // first — those expire soonest, so the guard loses the least value.
      for (const k of this.recentEmpties.keys()) {
        if (this.recentEmpties.size < this.MAX_EMPTIES) break;
        this.recentEmpties.delete(k);
      }
    }
    this.recentEmpties.set(key, Date.now());
  }

  /**
   * Stable, human-readable object key. A short hash of the original text is
   * appended so words that sanitize to the same slug (e.g. "co-op" vs "co op")
   * never collide.
   */
  private buildStorageKey(
    text: string,
    accent: PronunciationAccent,
    provider: string,
    voice: string | null,
    format: string,
  ): string {
    const slug =
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'word';
    const shortHash = createHash('sha256').update(text).digest('hex').slice(0, 8);
    const voicePart = voice ? `-${voice.toLowerCase()}` : '';
    return `pronunciations/${accent}/${provider}/${slug}${voicePart}-${shortHash}.${format}`;
  }
}
