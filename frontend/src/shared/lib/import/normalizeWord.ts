/**
 * Normalise a raw word string: trim whitespace and convert to lowercase.
 * This matches the backend normalisation in ImportService.
 */
export function normalizeWord(raw: string): string {
  return raw.trim().toLowerCase()
}
