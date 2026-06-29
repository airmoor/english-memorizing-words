import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WordTranslation } from '../database/entities/word-translation.entity';
import { Word } from '../database/entities/word.entity';
import { User } from '../database/entities/user.entity';
import { TranslationProviderService } from './providers/translation-provider.service';

/** Canonical source language — every Word is English. */
const SOURCE_LANGUAGE = 'en';

/**
 * Resolves translations for canonical Words.
 *
 * Read path is DB-first: PostgreSQL is the persistent (L2) cache, so once a
 * translation exists it is NEVER re-fetched from the external API. Misses go to
 * the provider exactly once thanks to single-flight de-duplication; a short
 * in-memory negative guard prevents hammering the API on empty/error results
 * (no schema cost — the `fetch_attempts` table can be added later if profiling
 * shows it is needed).
 */
@Injectable()
export class TranslationsService {
  private readonly logger = new Logger(TranslationsService.name);

  /** Collapses concurrent misses on the same (word, lang) into one API call. */
  private readonly inflight = new Map<string, Promise<WordTranslation | null>>();
  /** key → epoch ms of last *genuine empty* result; suppresses re-query for a
   *  TTL. Provider errors are deliberately NOT recorded here (see fetchAndStore)
   *  so a transient outage can't mask a word as untranslatable. */
  private readonly recentEmpties = new Map<string, number>();
  private readonly EMPTY_TTL_MS = 60_000;

  constructor(
    @InjectRepository(WordTranslation)
    private readonly repo: Repository<WordTranslation>,
    @InjectRepository(Word)
    private readonly wordsRepo: Repository<Word>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly providerService: TranslationProviderService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Resolves the target language: explicit `lang` wins, otherwise the user's
   * `native_language_code`. Throws if neither is available.
   */
  async resolveLanguage(userId: string, lang?: string): Promise<string> {
    const explicit = lang?.trim().toLowerCase();
    if (explicit) return explicit;

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    const native = user?.nativeLanguageCode?.trim().toLowerCase();
    if (!native) {
      throw new BadRequestException(
        'No language specified and user has no native_language_code set',
      );
    }
    return native;
  }

  /**
   * Returns the cached translation, fetching it from the provider on a cache
   * miss. Returns null when no translation can be produced.
   */
  async getTranslation(
    wordId: string,
    languageCode: string,
  ): Promise<WordTranslation | null> {
    const lang = languageCode.toLowerCase();

    // L2 cache (DB) — present means: never call the API again.
    const existing = await this.repo.findOne({
      where: { wordId, languageCode: lang },
    });
    if (existing) return existing;

    const key = `${wordId}:${lang}`;

    // Negative guard: skip the provider for a short window after a genuine
    // empty result. Evict expired entries on read so the map can't grow.
    const emptyAt = this.recentEmpties.get(key);
    if (emptyAt !== undefined) {
      if (Date.now() - emptyAt < this.EMPTY_TTL_MS) return null;
      this.recentEmpties.delete(key);
    }

    // Single-flight: one API call per key even under concurrent misses.
    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = this.fetchAndStore(wordId, lang, key).finally(() =>
      this.inflight.delete(key),
    );
    this.inflight.set(key, promise);
    return promise;
  }

  private async fetchAndStore(
    wordId: string,
    lang: string,
    key: string,
  ): Promise<WordTranslation | null> {
    // Re-check after acquiring the slot — a sibling request may have just filled it.
    const existing = await this.repo.findOne({
      where: { wordId, languageCode: lang },
    });
    if (existing) return existing;

    const word = await this.wordsRepo.findOne({ where: { id: wordId } });
    if (!word) throw new NotFoundException(`Word ${wordId} not found`);

    let normalized;
    try {
      normalized = await this.providerService.translate(
        word.text,
        SOURCE_LANGUAGE,
        lang,
      );
    } catch (err) {
      // Do NOT negative-cache provider errors — a transient outage would
      // otherwise mask the word as untranslatable (surfaced as 404 and cached
      // forever client-side). Let the error propagate (it surfaces as 503);
      // only the genuine empty result below is recorded.
      throw err;
    }

    if (!normalized) {
      this.recentEmpties.set(key, Date.now());
      return null;
    }

    // ON CONFLICT keeps this idempotent if single-flight is ever bypassed
    // (e.g. multiple instances) — first writer wins, no duplicate.
    await this.dataSource.query(
      `INSERT INTO word_translations (id, word_id, language_code, text, provider)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       ON CONFLICT (word_id, language_code) DO NOTHING`,
      [wordId, lang, normalized.text, normalized.provider],
    );

    return this.repo.findOne({ where: { wordId, languageCode: lang } });
  }
}
