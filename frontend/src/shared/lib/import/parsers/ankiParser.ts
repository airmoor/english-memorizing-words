import type { ImportParser, ParserInput, ParseResult, ColumnSuggestion } from './types'
import type { ParsedRow } from '../../../../entities/import-session/model/types'
import { normalizeWord } from '../normalizeWord'

// Headers recognised by the CSV parser — if present, defer to csvParser
const LEXIS_HEADERS = new Set(['word', 'term', 'vocabulary', 'english', 'tags', 'tag', 'board', 'notes', 'note'])

function hasLexisHeader(firstLine: string): boolean {
  const cols = firstLine.split(/[\t,]/).map((h) => h.trim().toLowerCase())
  return cols.some((c) => LEXIS_HEADERS.has(c))
}

// ── Column heuristic ──────────────────────────────────────────────────────────

/**
 * Heuristic: the word column has the shortest median value length
 * and the highest ratio of single-token values (no spaces).
 *
 * Returns columns sorted by descending confidence.
 */
function scoreColumns(rows: string[][], delimiter: '\t' | ','): ColumnSuggestion[] {
  if (rows.length === 0) return []

  const colCount = Math.max(...rows.map((r) => r.length))
  const suggestions: ColumnSuggestion[] = []

  for (let col = 0; col < colCount; col++) {
    const values = rows.map((r) => (r[col] ?? '').trim()).filter(Boolean)
    if (values.length === 0) continue

    // Median length
    const lengths = values.map((v) => v.length).sort((a, b) => a - b)
    const medianLength = lengths[Math.floor(lengths.length / 2)]

    // Single-token ratio (no spaces, no HTML)
    const singleToken = values.filter((v) => !v.includes(' ') && !v.includes('<')).length
    const singleTokenRatio = singleToken / values.length

    // Combined score: low median length × high single-token ratio
    const maxMedian = 50
    const lengthScore = Math.max(0, 1 - medianLength / maxMedian)
    const confidence = (lengthScore * 0.6 + singleTokenRatio * 0.4)

    suggestions.push({
      index: col,
      samples: values.slice(0, 5),
      confidence,
    })
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

// ── canParse ──────────────────────────────────────────────────────────────────

function canParse(input: ParserInput): boolean {
  // Never claim .txt files
  if (input.filename) {
    const ext = input.filename.split('.').pop()?.toLowerCase()
    if (ext === 'txt') return false
  }

  const firstLine = input.text.split('\n')[0] ?? ''

  // If text looks like a plain word list (no delimiters), decline
  if (!firstLine.includes('\t') && !firstLine.includes(',')) return false

  // If it has a recognised Lexis header, let csvParser handle it
  if (hasLexisHeader(firstLine)) return false

  // Claim tab-separated or multi-column CSV with no recognised header
  const isTabSeparated = firstLine.includes('\t')
  const isMultiColumn = firstLine.split(',').length > 1

  return isTabSeparated || isMultiColumn
}

// ── parse ─────────────────────────────────────────────────────────────────────

function parseAnki(input: ParserInput, columnMap?: { wordColumnIndex: number; tagsColumnIndex?: number }): ParseResult {
  const text = input.text
  const firstLine = text.split('\n')[0] ?? ''

  // Determine delimiter
  const delimiter: '\t' | ',' = firstLine.includes('\t') ? '\t' : ','

  // Parse all non-empty lines into columns
  const rawRows = text
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(delimiter))

  // Filter out Anki metadata lines (lines starting with #)
  const dataRows = rawRows.filter((r) => !r[0].trim().startsWith('#'))

  if (dataRows.length === 0) {
    return { rows: [], requiresColumnMapping: false }
  }

  // If no column map provided, return suggestions and require mapping
  if (columnMap === undefined) {
    const columnSuggestions = scoreColumns(dataRows, delimiter)
    return {
      rows: [],
      requiresColumnMapping: true,
      columnSuggestions,
    }
  }

  // Column map is provided — parse rows
  const { wordColumnIndex, tagsColumnIndex } = columnMap
  const rows: ParsedRow[] = []
  const firstOccurrence = new Map<string, number>()

  // Check if first row looks like a header
  const firstRowWord = (dataRows[0]?.[wordColumnIndex] ?? '').trim()
  const startIndex = LEXIS_HEADERS.has(firstRowWord.toLowerCase()) ? 1 : 0

  for (let i = startIndex; i < dataRows.length; i++) {
    const record = dataRows[i]
    const rawWord = (record[wordColumnIndex] ?? '').trim()
    const lineNumber = i + 1

    if (!rawWord) continue

    const word = normalizeWord(rawWord)
    if (!word) continue

    // Parse tags if mapped (Anki uses space-separated tags)
    const tags =
      tagsColumnIndex !== undefined && record[tagsColumnIndex]
        ? record[tagsColumnIndex]
            .trim()
            .split(/\s+/)
            .map((t) => normalizeWord(t))
            .filter(Boolean)
        : undefined

    const existing = firstOccurrence.get(word)
    if (existing !== undefined) {
      rows.push({
        word,
        lineNumber,
        rawText: record.join(delimiter),
        status: 'duplicate_within_batch',
        reason: `Already in this list (line ${existing})`,
        ...(tags && tags.length > 0 ? { tags } : {}),
      })
    } else {
      firstOccurrence.set(word, lineNumber)
      rows.push({
        word,
        lineNumber,
        rawText: record.join(delimiter),
        status: 'valid',
        ...(tags && tags.length > 0 ? { tags } : {}),
      })
    }
  }

  return { rows, requiresColumnMapping: false }
}

export const ankiParser: ImportParser = {
  canParse,
  parse: parseAnki,
}
