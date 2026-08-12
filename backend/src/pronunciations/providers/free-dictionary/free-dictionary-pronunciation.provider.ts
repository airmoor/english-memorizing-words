import { Injectable, Logger } from '@nestjs/common';
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
 * Free Dictionary API (api.dictionaryapi.dev) pronunciations.
 *
 * No key, no account, no rate limit to speak of — which is why this provider is
 * always available and acts as the safety net between Merriam-Webster (needs a
 * key, US only) and Polly (needs a card).
 *
 * Audio comes from Wiktionary / Wikimedia Commons, so recordings are human but
 * coverage is uneven: common words usually have several accents, rarer ones may
 * have none at all. A miss simply falls through to the next provider.
 *
 * Licensing: Wiktionary audio is CC BY-SA 3.0, which requires attribution — the
 * credit string and the origin URL are stored on every row.
 */

const FD_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const FETCH_TIMEOUT_MS = 8_000;

/** Minimal shape we read off the wire. The dictionary module owns the full DTOs. */
interface FdAudioEntry {
  phonetics?: Array<{ audio?: string }>;
}

@Injectable()
export class FreeDictionaryPronunciationProvider
  implements IPronunciationProvider
{
  readonly name = PronunciationProvider.FREE_DICTIONARY;
  private readonly logger = new Logger(
    FreeDictionaryPronunciationProvider.name,
  );

  isAvailable(): boolean {
    return true;
  }

  async synthesize(
    text: string,
    accent: PronunciationAccent,
  ): Promise<NormalizedAudio | null> {
    const urls = await this.lookupAudioUrls(text);
    if (urls.length === 0) return null;

    const sourceUrl = pickByAccent(urls, accent);
    if (!sourceUrl) return null;

    const remote = await fetchRemoteAudio(sourceUrl, this.logger, this.name);
    if (!remote) return null;

    return {
      audio: remote.audio,
      format: 'mp3',
      contentType: remote.contentType,
      voice: null,
      isHuman: true,
      license: 'CC-BY-SA-3.0',
      attribution: 'Wiktionary contributors, via Free Dictionary API',
      sourceRefUrl: sourceUrl,
      provider: this.name,
    };
  }

  /**
   * Collects every non-empty audio URL the API knows for the word.
   *
   * An empty list means the API answered and has nothing. Being unable to ask
   * at all throws ProviderUnreachableError instead, so the cascade can tell the
   * two apart — otherwise an outage here would be recorded as "this word has no
   * pronunciation".
   */
  private async lookupAudioUrls(text: string): Promise<string[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${FD_BASE}/${encodeURIComponent(text)}`, {
        signal: controller.signal,
      });
    } catch (err) {
      throw new ProviderUnreachableError(
        this.name,
        `lookup failed for "${text}": ${String(err)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    // 404 is this API's "word not in the dictionary" — a real answer.
    if (response.status === 404) return [];
    if (!response.ok) {
      throw new ProviderUnreachableError(
        this.name,
        `API returned ${response.status} for "${text}"`,
      );
    }

    const entries: unknown = await response.json();
    if (!Array.isArray(entries)) return [];

    const urls: string[] = [];
    for (const entry of entries as FdAudioEntry[]) {
      for (const phonetic of entry.phonetics ?? []) {
        // The API returns `audio: ""` for entries that have a transcription but
        // no recording — very common, and not an error.
        const url = phonetic.audio?.trim();
        if (url) urls.push(url);
      }
    }
    return urls;
  }
}

/**
 * Picks the recording that matches the requested accent.
 *
 * Free Dictionary encodes the accent in the filename, e.g.
 * `.../rabbit-us.mp3`, `.../rabbit-uk.mp3`. An exact match always wins.
 *
 * When nothing matches, only the US default accepts an unlabelled recording:
 * serving an unknown accent as "British" would be a worse lie than serving it as
 * the generic default, and a wrong accent in a pronunciation feature is more
 * harmful than no audio at all — UK/AU simply fall through to Polly, which can
 * voice any accent on demand.
 *
 * Exported for unit testing.
 */
export function pickByAccent(
  urls: string[],
  accent: PronunciationAccent,
): string | null {
  const suffix = `-${accent}.mp3`;
  const exact = urls.find((url) => url.toLowerCase().endsWith(suffix));
  if (exact) return exact;

  if (accent !== PronunciationAccent.US) return null;

  const labelled = /-(us|uk|au|ca|nz|in)\.mp3$/i;
  return urls.find((url) => !labelled.test(url)) ?? null;
}
