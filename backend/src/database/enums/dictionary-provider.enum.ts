/**
 * Canonical enum for dictionary data sources.
 * Values must match the PostgreSQL `dictionary_provider` enum created in
 * migration 1747000007000-RefactorEntityLayer.
 */
export enum DictionaryProvider {
  MERRIAM = 'merriam-webster',
  FREE    = 'free-dictionary',
}
