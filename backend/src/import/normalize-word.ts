/**
 * Normalise a raw word string for storage and deduplication.
 *
 * Steps applied in order:
 *   1. NFKC Unicode normalisation — collapses compatibility equivalents
 *      (e.g. ligature ﬁ → fi, full-width Ａ → A)
 *   2. Trim surrounding whitespace (including Unicode whitespace via NFKC)
 *   3. Collapse internal runs of whitespace to a single ASCII space
 *   4. Locale-aware lowercase with explicit 'en' locale — consistent across
 *      server environments regardless of OS/libc locale setting
 *
 * This function must remain byte-for-byte behavior-compatible with the
 * frontend implementation in shared/lib/import/normalizeWord.ts.
 * Any change here must be mirrored there.
 */
export function normalizeWord(raw: string): string {
  return raw.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}
