/**
 * Provider-independent representation of a translation result.
 * Vendor-specific request/response shapes MUST stay inside provider directories.
 */

import { TranslationProvider } from '../../database/enums/translation-provider.enum';
export { TranslationProvider } from '../../database/enums/translation-provider.enum';

export interface NormalizedTranslation {
  /** The translated text in the target language. */
  text: string;
  provider: TranslationProvider;
}

/**
 * Contract every translation provider must implement.
 *
 *   - `isAvailable()`     — synchronous gate (API key present, etc.)
 *   - `supports(target)`  — whether this provider can translate into `target`
 *   - `translate()`       — returns null when no translation is produced;
 *                           throws when the provider itself is unavailable.
 *
 * The selector service uses these primitives to choose / cascade providers,
 * hiding provider identity from the rest of the app.
 */
export interface ITranslationProvider {
  readonly name: TranslationProvider;
  isAvailable(): boolean;
  supports(targetLang: string): boolean;
  translate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<NormalizedTranslation | null>;
}
