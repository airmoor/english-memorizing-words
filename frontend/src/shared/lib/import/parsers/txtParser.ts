import type { ImportParser, ParserInput, ParseResult } from './types'
import type { ParsedRow } from '../../../../entities/import-session/model/types'
import { normalizeWord } from '../normalizeWord'
import { emitParserEvent } from './telemetry'

/**
 * TXT parser — one word per line.
 *
 * Handles:
 * - Plain text paste
 * - .txt file uploads
 * - Whitespace-only lines (filtered out)
 * - Within-batch deduplication (first occurrence wins, subsequent → duplicate_within_batch)
 * - lineNumber and rawText on every row
 * - clientRowId (crypto.randomUUID()) on every row
 *
 * Score: 0.8 for .txt filename, 0.2 for plain text (fallback), 0 for .csv
 */
export const txtParser: ImportParser = {
  score(input: ParserInput): number {
    if (input.filename) {
      const ext = input.filename.split('.').pop()?.toLowerCase()
      if (ext === 'txt') return 0.8
      // CSV files go through csvParser — explicitly decline
      if (ext === 'csv') return 0
    }

    // Plain text with no structural signals → low-confidence fallback
    const sample = input.text.slice(0, 500)
    const lines = sample.split('\n').filter((l) => l.trim().length > 0)
    if (lines.length === 0) return 0.2 // even empty input goes to txt

    // If there are commas/tabs in multiple lines, defer to CSV/Anki parsers
    const structuredLines = lines.filter((l) => l.includes(',') || l.includes('\t'))
    return structuredLines.length >= lines.length * 0.5 ? 0 : 0.2
  },

  async parse(input: ParserInput): Promise<ParseResult> {
    const lines = input.text.split('\n')
    const rows: ParsedRow[] = []

    // Track first occurrence: normalised word → lineNumber
    const firstOccurrence = new Map<string, number>()
    let duplicateCount = 0

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
        duplicateCount++
        // Subsequent occurrence — within-batch duplicate
        rows.push({
          clientRowId: crypto.randomUUID(),
          word,
          lineNumber,
          rawText: stripped.slice(0, 500),
          status: 'duplicate_within_batch',
          reason: `Already in this list (line ${existing})`,
        })
      } else {
        firstOccurrence.set(word, lineNumber)
        rows.push({
          clientRowId: crypto.randomUUID(),
          word,
          lineNumber,
          rawText: stripped.slice(0, 500),
          status: 'valid',
        })
      }
    }

    emitParserEvent('parse_complete', {
      parser: 'txt',
      rowsParsed: rows.length,
      duplicates: duplicateCount,
    })

    return { rows }
  },
}
