/**
 * The provider-independent representation of a dictionary word lookup.
 * This is the only shape that crosses the provider boundary.
 * Vendor-specific DTOs (MW, FD) MUST stay inside their provider directories.
 */

export type ProviderName = 'merriam-webster' | 'free-dictionary';

export interface NormalizedMeaning {
  definition: string;
  partOfSpeech: string | null;
  synonyms: string[];
  examples: string[];
  /** Dictionary sense label like "1", "1a", "1b", "2". Null when provider does not supply one. */
  senseNumber: string | null;
}

export interface NormalizedWord {
  text: string;
  transcription: string | null;
  provider: ProviderName;
  meanings: NormalizedMeaning[];
}

/**
 * Contract every dictionary provider must implement.
 *
 *   - `isAvailable()` — synchronous gate (e.g. API key present, not locally rate-limited)
 *   - `fetchWord()` — returns null for "word not found"; throws for "provider unavailable"
 *
 * The selector service uses these two primitives to cascade between providers.
 */
export interface IDictionaryProvider {
  readonly name: ProviderName;
  isAvailable(): boolean;
  fetchWord(text: string): Promise<NormalizedWord | null>;
}
