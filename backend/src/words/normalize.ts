// Search-text normalisation. Provider-specific normalisation lives under providers/.

export function normalizeSearchText(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
