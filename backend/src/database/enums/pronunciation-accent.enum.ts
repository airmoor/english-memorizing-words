/**
 * Canonical enum for pronunciation accents.
 * Values must match the PostgreSQL `pronunciation_accent` enum created in
 * migration 1751000001000-AddPronunciations.
 *
 * MVP serves US (default) and UK on demand. AU is reserved so an Australian
 * voice can be added later without a destructive migration.
 */
export enum PronunciationAccent {
  US = 'us',
  UK = 'uk',
  AU = 'au',
}

/** Accent surfaced when the client does not specify one. */
export const DEFAULT_ACCENT = PronunciationAccent.US;
