/**
 * Canonical enum for pronunciation audio sources.
 * Values must match the PostgreSQL `pronunciation_provider` enum created in
 * migration 1751000001000-AddPronunciations.
 *
 * Human-voice sources are preferred over TTS (see PronunciationProviderService
 * cascade order):
 *   - 'merriam-webster'  — Learner's Dictionary recordings, spoken at a slower
 *                          pace for learners. US only. Free tier is
 *                          non-commercial and requires attribution.
 *   - 'free-dictionary'  — api.dictionaryapi.dev, sourced from Wiktionary /
 *                          Wikimedia Commons. No key. Coverage is partial.
 *   - 'amazon-polly'     — neural TTS. 100% coverage, used as the last resort.
 *
 * Reserved so future sources light up without a destructive migration:
 *   - 'azure'     — second TTS provider for failover
 *   - 'wikimedia' — recordings pulled straight from the Commons API (as opposed
 *                   to 'free-dictionary', which proxies them)
 *   - 'custom'    — our own studio recordings
 *   - 'manual'    — hand-curated entries
 * `provider` doubles as the provenance marker (no separate `source` column in v1),
 * matching the translation_provider convention.
 */
export enum PronunciationProvider {
  MERRIAM_WEBSTER  = 'merriam-webster',
  FREE_DICTIONARY  = 'free-dictionary',
  AMAZON_POLLY     = 'amazon-polly',
  AZURE            = 'azure',
  WIKIMEDIA        = 'wikimedia',
  CUSTOM           = 'custom',
  MANUAL           = 'manual',
}
