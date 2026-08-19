/**
 * The provider-independent representation of a synthesized pronunciation.
 * This is the only shape that crosses the provider boundary. Vendor-specific
 * concerns (Polly voice ids, Azure SSML, …) MUST stay inside their provider dirs.
 */

import { PronunciationProvider } from '../../database/enums/pronunciation-provider.enum';
import { PronunciationAccent } from '../../database/enums/pronunciation-accent.enum';

export { PronunciationProvider } from '../../database/enums/pronunciation-provider.enum';
export { PronunciationAccent } from '../../database/enums/pronunciation-accent.enum';

export interface NormalizedAudio {
  /** Raw audio bytes to persist in object storage. */
  audio: Buffer;
  /** Audio container/codec, e.g. 'mp3'. */
  format: string;
  /** MIME type for the stored object, e.g. 'audio/mpeg'. */
  contentType: string;
  /** Voice id used (e.g. 'Joanna'); null for human recordings. */
  voice: string | null;
  /** True for real human recordings; false for TTS. */
  isHuman: boolean;
  /** License under which we hold the bytes, e.g. 'amazon-polly-tos'. */
  license: string;
  /** Credit string for CC-BY-SA sources; null otherwise. */
  attribution: string | null;
  /** Origin of the audio (audit trail); null for TTS. */
  sourceRefUrl: string | null;
  provider: PronunciationProvider;
}

/**
 * Thrown by a provider that could not be reached — network failure, timeout,
 * 5xx, rejected API key.
 *
 * This is the difference between "this word has no recording" and "we could not
 * find out", and the two must never be conflated: the first is a stable fact
 * about the word and is worth caching for hours, the second is a transient
 * condition that would otherwise mark a perfectly pronounceable word as silent
 * for the whole cache window.
 *
 * The selector catches it, notes that the answer is degraded, and moves on to
 * the next provider — one flaky upstream must not shadow the ones behind it.
 */
export class ProviderUnreachableError extends Error {
  constructor(
    readonly provider: PronunciationProvider,
    message: string,
  ) {
    super(`${provider}: ${message}`);
    this.name = 'ProviderUnreachableError';
  }
}

/**
 * What the cascade concluded after trying every available provider.
 *
 * `audio === null && !degraded` is the only combination that licenses negative
 * caching: every provider answered, and none of them has a recording.
 */
export interface SynthesisOutcome {
  audio: NormalizedAudio | null;
  /** True when at least one provider could not be reached. */
  degraded: boolean;
}

/**
 * Contract every pronunciation provider must implement. Mirrors
 * IDictionaryProvider:
 *   - `isAvailable()` — synchronous gate (e.g. API/credentials present)
 *   - `synthesize()`  — returns null when the provider answered but has no
 *                       audio for this word; throws ProviderUnreachableError
 *                       when it could not answer at all.
 */
export interface IPronunciationProvider {
  readonly name: PronunciationProvider;
  isAvailable(): boolean;
  synthesize(
    text: string,
    accent: PronunciationAccent,
  ): Promise<NormalizedAudio | null>;
}
