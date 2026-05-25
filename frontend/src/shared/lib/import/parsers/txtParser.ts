import type { ImportParser, ParserInput, ParseResult } from './types'
import type { ParsedRow } from '../../../../entities/import-session/model/types'
import { normalizeWord } from '../normalizeWord'

/**
 * TXT parser — one word per line.
 *
 * Handles:
 * - Plain text paste
 * - .txt file uploads
 * - Whitespace-only lines (filtered out)
 * - Within-batch deduplication (first occurrence wins, subsequent → duplicate_within_batch)
 * - lineNumber and rawText on every row
 */
export const txtParser: ImportParser = {
  canParse(input: ParserInput): boolean {
    // Accept .txt filenames
    if (input.filename) {
      const ext = input.filename.split('.').pop()?.toLowerCase()
      if (ext === 'txt') return true
      // Reject CSV files — those should go through csvParser
      if (ext === 'csv') return false
    }

    // Fallback: accept plain text (no commas/tabs suggesting structure)
    // Only claim it if the text looks like a simple word list
    const sample = input.text.slice(0, 500)
    const lines = sample.split('\n').filter((l) => l.trim().length > 0)
    if (lines.length === 0) return true

    // If there are commas/tabs in multiple lines, defer to CSV parser
    const structuredLines = lines.filter((l) => l.includes(',') || l.includes('\t'))
    return structuredLines.length < lines.length * 0.5
  },

  parse(input: ParserInput): ParseResult {
    const lines = input.text.split('\n')
    const rows: ParsedRow[] = []

    // Track first occurrence: normalised word → lineNumber
    const firstOccurrence = new Map<string, number>()

    for (let i = 0; i < lines.length; i++) {
      const rawText = lines[i]
      const lineNumber = i + 1

      // Strip trailing \r (CRLF files)
      const stripped = rawText.replace(/\r$/, '')

      // Skip empty / whitespace-only lines
      if (stripped.trim().length === 0) continue

      const word = normalizeWord(stripped)

      if (!word) continue

      const existing = firstOccurrence.get(word)
      if (existing !== undefined) {
        // Subsequent occurrence — within-batch duplicate
        rows.push({
          word,
          lineNumber,
          rawText: stripped,
          status: 'duplicate_within_batch',
          reason: `Already in this list (line ${existing})`,
        })
      } else {
        firstOccurrence.set(word, lineNumber)
        rows.push({
          word,
          lineNumber,
          rawText: stripped,
          status: 'valid',
        })
      }
    }

    return { rows }
  },
}
