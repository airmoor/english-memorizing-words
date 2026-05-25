/**
 * Normalise a raw word string for storage and deduplication.
 * Steps:
 *   1. NFKC Unicode normalisation — collapses compatibility equivalents (e.g. ﬁ → fi)
 *   2. Trim surrounding whitespace
 *   3. Collapse internal runs of whitespace to a single space
 *   4. Locale-aware lowercase (en) — consistent across environments
 *
 * Must match backend `normalizeWord()` in import.service.ts.
 */
export function normalizeWord(raw: string): string {
  return raw.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
}
