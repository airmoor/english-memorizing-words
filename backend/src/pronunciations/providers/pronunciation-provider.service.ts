import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  IPronunciationProvider,
  SynthesisOutcome,
} from './provider.interface';
import {
  PronunciationAccent,
  ProviderUnreachableError,
} from './provider.interface';
import { PollyProvider } from './polly/polly.provider';
import { MerriamPronunciationProvider } from './merriam/merriam-pronunciation.provider';
import { FreeDictionaryPronunciationProvider } from './free-dictionary/free-dictionary-pronunciation.provider';

/**
 * Selects a pronunciation provider and synthesizes audio.
 *
 * Cascade order encodes two preferences, strongest first:
 *
 *   1. Merriam-Webster — human recordings, spoken at learner pace. US only,
 *      needs a free API key (no card).
 *   2. Free Dictionary — human recordings from Wiktionary. No key at all, but
 *      coverage is partial and accent labelling is inconsistent.
 *   3. Amazon Polly — neural TTS. Always succeeds and covers every accent, but
 *      needs real AWS credentials (card required), so it is the last resort.
 *
 * Human voices beat TTS for a learner-facing app, and free beats paid — the two
 * happen to point the same way here. Since Free Dictionary needs no credentials
 * it is always available, so the "no provider at all" branch below only fires if
 * that provider is deliberately removed.
 *
 * Adding a source (Wikimedia Commons directly, Azure for failover) means
 * implementing IPronunciationProvider and slotting it into `providers`.
 */
@Injectable()
export class PronunciationProviderService {
  private readonly logger = new Logger(PronunciationProviderService.name);
  private readonly providers: IPronunciationProvider[];

  constructor(
    private readonly merriam: MerriamPronunciationProvider,
    private readonly freeDictionary: FreeDictionaryPronunciationProvider,
    private readonly polly: PollyProvider,
  ) {
    this.providers = [this.merriam, this.freeDictionary, this.polly];
  }

  /**
   * Runs the cascade and reports both what it found and how trustworthy the
   * answer is.
   *
   * `{ audio: null, degraded: false }` is the only result that means "this word
   * genuinely has no recording anywhere" — every provider was asked and
   * answered. `degraded: true` means at least one could not be reached, so the
   * absence proves nothing and must not be cached.
   *
   * Throws ServiceUnavailableException (503) when there is no usable provider
   * at all — that is a misconfiguration, not a property of the word.
   */
  async synthesize(
    text: string,
    accent: PronunciationAccent,
  ): Promise<SynthesisOutcome> {
    const available = this.providers.filter((p) => p.isAvailable());
    if (available.length === 0) {
      this.logger.warn('No pronunciation provider available');
      throw new ServiceUnavailableException(
        'No pronunciation provider configured',
      );
    }

    let degraded = false;

    for (const provider of available) {
      try {
        const result = await provider.synthesize(text, accent);
        if (result) {
          this.logger.log(`"${text}" (${accent}) resolved by ${provider.name}`);
          return { audio: result, degraded };
        }
      } catch (err) {
        // Polly reports unavailability with the Nest exception rather than our
        // own error type; both mean the same thing here.
        if (
          err instanceof ProviderUnreachableError ||
          err instanceof ServiceUnavailableException
        ) {
          degraded = true;
          this.logger.warn(
            `${provider.name} unreachable for "${text}" (${accent}): ${err.message}`,
          );
          continue;
        }
        throw err;
      }
    }

    this.logger.warn(
      `No provider had audio for "${text}" (${accent}); tried: ` +
        available.map((p) => p.name).join(', ') +
        (degraded ? ' — result is degraded, not caching' : ''),
    );
    return { audio: null, degraded };
  }
}
