/**
 * Canonical enum for translation sources.
 * Values must match the PostgreSQL `translation_provider` enum created in
 * migration 1750000001000-AddTranslations.
 *
 * Machine providers (deepl, google, …) are filled by the translation pipeline.
 * 'manual' / 'user' are reserved for future curated and user-submitted
 * translations — they let `provider` double as the provenance marker without a
 * separate `source` column in v1.
 */
export enum TranslationProvider {
  DEEPL     = 'deepl',
  GOOGLE    = 'google',
  MICROSOFT = 'microsoft',
  LIBRE     = 'libre',
  OPENAI    = 'openai',
  ANTHROPIC = 'anthropic',
  MANUAL    = 'manual',
  USER      = 'user',
}
