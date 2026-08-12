import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IPronunciationProvider,
  NormalizedAudio,
} from '../provider.interface';
import {
  PronunciationProvider,
  PronunciationAccent,
  ProviderUnreachableError,
} from '../provider.interface';
import { fetchRemoteAudio } from '../remote-audio';

/**
 * Merriam-Webster Learner's Dictionary pronunciations.
 *
 * Real human recordings, deliberately spoken slower than natural speech because
 * the Learner's Dictionary targets English learners — a better fit for this app
 * than neural TTS, and free.
 *
 * The API returns only a bare filename (`hwi.prs[].sound.audio`); the media URL
 * has to be assembled from it, including a subdirectory derived by a documented
 * rule. See https://dictionaryapi.com/products/json#sec-2.prs
 *
 * Scope: US accent only. The Learner's Dictionary records a single American
 * pronunciation, so UK/AU requests fall through to the next provider rather than
 * being served a mislabelled US recording.
 *
 * Licensing: the free tier is non-commercial and requires visible attribution,
 * which is why every row written here carries `attribution` and `sourceRefUrl`.
 */

const MW_BASE = 'https://www.dictionaryapi.com/api/v3/references/learners/json';
const MW_MEDIA_BASE = 'https://media.merriam-webster.com/audio/prons/en/us/mp3';
const FETCH_TIMEOUT_MS = 8_000;

/** Minimal shape we read off the wire. The dictionary module owns the full DTOs. */
interface MwAudioEntry {
  hwi?: { prs?: Array<{ sound?: { audio?: string } }> };
}

@Injectable()
export class MerriamPronunciationProvider implements IPronunciationProvider {
  readonly name = PronunciationProvider.MERRIAM_WEBSTER;
  private readonly logger = new Logger(MerriamPronunciationProvider.name);
  private readonly apiKey: string | undefined;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('MERRIAM_API_KEY');
    if (!this.apiKey) {
      this.logger.warn(
        'MERRIAM_API_KEY not set — Merriam-Webster pronunciations disabled',
      );
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async synthesize(
    text: string,
    accent: PronunciationAccent,
  ): Promise<NormalizedAudio | null> {
    // Learner's Dictionary is US-only — let the cascade handle other accents.
    if (accent !== PronunciationAccent.US) return null;

    const key = this.apiKey;
    if (!key) return null;

    const filename = await this.lookupAudioFilename(text, key);
    if (!filename) return null;

    const sourceUrl = `${MW_MEDIA_BASE}/${subdirectoryFor(filename)}/${filename}.mp3`;
    const remote = await fetchRemoteAudio(sourceUrl, this.logger, this.name);
    if (!remote) return null;

    return {
      audio: remote.audio,
      format: 'mp3',
      contentType: remote.contentType,
      // Human recording — there is no synthetic voice id to record.
      voice: null,
      isHuman: true,
      license: 'merriam-webster-api-tos',
      attribution: "Merriam-Webster's Learner's Dictionary",
      sourceRefUrl: sourceUrl,
      provider: this.name,
    };
  }

  /**
   * Returns the first pronunciation filename for the word, or null when the
   * word is unknown / has no audio.
   *
   * Throws ProviderUnreachableError when the API could not answer — the
   * selector turns that into "degraded", which keeps a transient MW outage from
   * being recorded as "this word has no pronunciation".
   */
  private async lookupAudioFilename(
    text: string,
    key: string,
  ): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${MW_BASE}/${encodeURIComponent(text)}?key=${key}`,
        { signal: controller.signal },
      );
    } catch (err) {
      throw new ProviderUnreachableError(
        this.name,
        `lookup failed for "${text}": ${String(err)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    // MW answers 200 for a miss (it returns spelling suggestions), so any
    // non-2xx is an infrastructure or credentials problem, never "not found".
    if (!response.ok) {
      throw new ProviderUnreachableError(
        this.name,
        `API returned ${response.status} for "${text}"`,
      );
    }

    const data: unknown = await response.json();

    // A miss returns an array of spelling suggestions (strings), not entries.
    if (!Array.isArray(data) || data.length === 0) return null;
    if (typeof data[0] === 'string') return null;

    for (const entry of data as MwAudioEntry[]) {
      for (const pron of entry.hwi?.prs ?? []) {
        const audio = pron.sound?.audio?.trim();
        if (audio) return audio;
      }
    }
    return null;
  }
}

/**
 * Merriam-Webster's documented subdirectory rule for audio filenames:
 *   starts with "bix"                  → "bix"
 *   starts with "gg"                   → "gg"
 *   starts with a digit or punctuation → "number"
 *   otherwise                          → the first character
 *
 * Exported for unit testing.
 */
export function subdirectoryFor(filename: string): string {
  if (filename.startsWith('bix')) return 'bix';
  if (filename.startsWith('gg')) return 'gg';
  if (!/^[a-zA-Z]/.test(filename)) return 'number';
  return filename[0];
}
