import Papa from 'papaparse'
import type { ImportParser, ParserInput, ParseResult } from './types'
import type { ParsedRow } from '../../../../entities/import-session/model/types'
import { normalizeWord } from '../normalizeWord'
import { emitParserEvent } from './telemetry'

const MAX_ROWS = 500

// ── Known column header names ─────────────────────────────────────────────────

const WORD_HEADERS  = new Set(['word', 'term', 'vocabulary', 'english'])
const TAGS_HEADERS  = new Set(['tags', 'tag', 'labels', 'label'])
const BOARD_HEADERS = new Set(['board', 'deck', 'list', 'group', 'category'])
const NOTES_HEADERS = new Set(['notes', 'note', 'definition', 'description', 'meaning', 'comment'])

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
}

function hasLexisHeader(headers: string[]): boolean {
  return headers.some((h) => WORD_HEADERS.has(normalizeHeader(h)))
}

// ── score ─────────────────────────────────────────────────────────────────────

/**
 * Scoring strategy:
 *   1.0 — explicit .csv extension (definitive)
 *   0.7 — majority of lines are comma/semicolon-delimited (good heuristic)
 *   0   — .txt extension or no structural signals
 */
function score(input: ParserInput): number {
  if (input.filename) {
    const ext = input.filename.split('.').pop()?.toLowerCase()
    if (ext === 'csv') return 1.0
    // Explicit non-CSV filenames — don't claim
    if (ext === 'txt') return 0
  }

  // Heuristic: if a significant fraction of lines contain commas or semicolons
  const sample = input.text.slice(0, 1000)
  const lines  = sample.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length < 2) return 0
  const delimited = lines.filter((l) => l.includes(',') || l.includes(';'))
  return delimited.length >= lines.length * 0.5 ? 0.7 : 0
}

// ── Parse tags column value ───────────────────────────────────────────────────

function parseTags(raw: string): string[] {
  if (!raw.trim()) return []
  return raw
    .split(';')
    .map((t) => normalizeWord(t))
    .filter(Boolean)
}

// ── CSV parser implementation ─────────────────────────────────────────────────

export const csvParser: ImportParser = {
  score,

  async parse(input: ParserInput): Promise<ParseResult> {
    const text = input.text
    const warnings: string[] = []

    // PapaParse auto-detects delimiter when delimiter is '' (empty string).
    // This correctly handles quoted commas (e.g. "a,b,c" stays one field)
    // and semicolon-delimited files without manual sniffing.
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      delimiter: '',       // '' = auto-detect
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    })

    // Use the detected delimiter for rawText reconstruction
    const delimiter = result.meta.delimiter ?? ','
    const headers   = result.meta.fields ?? []

    // ── Single-column fallback ────────────────────────────────────────────────
    if (headers.length <= 1 && !hasLexisHeader(headers)) {
      const fallback = singleColumnFallback(text, warnings)
      emitParserEvent('parse_complete', {
        parser: 'csv-single-column-fallback',
        rowsParsed: fallback.rows.length,
        warnings: fallback.warnings?.length ?? 0,
        filename: input.filename,
      })
      return fallback
    }

    // ── Column detection ──────────────────────────────────────────────────────
    const wordCol  = headers.find((h) => WORD_HEADERS.has(normalizeHeader(h)))  ?? headers[0]
    const tagsCol  = headers.find((h) => TAGS_HEADERS.has(normalizeHeader(h)))
    const boardCol = headers.find((h) => BOARD_HEADERS.has(normalizeHeader(h)))
    const notesCol = headers.find((h) => NOTES_HEADERS.has(normalizeHeader(h)))

    let data = result.data
    if (data.length > MAX_ROWS) {
      warnings.push(`Only the first ${MAX_ROWS} rows will be imported. The file has ${data.length} rows.`)
      data = data.slice(0, MAX_ROWS)
    }

    // ── Parse errors ──────────────────────────────────────────────────────────
    const errorLines = new Set<number>()
    for (const err of result.errors) {
      if (typeof err.row === 'number') errorLines.add(err.row)
    }

    // ── Build ParsedRow[] ─────────────────────────────────────────────────────
    const rows: ParsedRow[] = []
    const firstOccurrence   = new Map<string, number>()
    let duplicateCount = 0

    for (let i = 0; i < data.length; i++) {
      const record    = data[i]
      const rawWord   = record[wordCol] ?? ''
      const lineNumber = i + 2 // header is line 1, data starts at line 2

      if (errorLines.has(i)) {
        rows.push({
          clientRowId: crypto.randomUUID(),
          word: rawWord.trim(),
          lineNumber,
          rawText: Object.values(record).join(delimiter).slice(0, 500),
          status: 'error',
          reason: 'CSV parse error — check for unmatched quotes',
        })
        continue
      }

      if (!rawWord.trim()) {
        // Skip blank word cells silently (like empty lines in TXT)
        continue
      }

      const word = normalizeWord(rawWord)

      const tags  = tagsCol  ? parseTags(record[tagsCol]  ?? '') : undefined
      const board = boardCol ? (record[boardCol] ?? '').trim() || undefined : undefined
      const notes = notesCol ? (record[notesCol] ?? '').trim() || undefined : undefined

      const existing = firstOccurrence.get(word)
      if (existing !== undefined) {
        duplicateCount++
        rows.push({
          clientRowId: crypto.randomUUID(),
          word,
          lineNumber,
          rawText: rawWord.slice(0, 500),
          status: 'duplicate_within_batch',
          reason: `Already in this list (line ${existing})`,
          ...(tags  && tags.length > 0 ? { tags }  : {}),
          ...(board ? { board } : {}),
          ...(notes ? { notes } : {}),
        })
      } else {
        firstOccurrence.set(word, lineNumber)
        rows.push({
          clientRowId: crypto.randomUUID(),
          word,
          lineNumber,
          rawText: rawWord.slice(0, 500),
          status: 'valid',
          ...(tags  && tags.length > 0 ? { tags }  : {}),
          ...(board ? { board } : {}),
          ...(notes ? { notes } : {}),
        })
      }
    }

    emitParserEvent('parse_complete', {
      parser: 'csv',
      rowsParsed: rows.length,
      duplicates: duplicateCount,
      warnings: warnings.length,
      filename: input.filename,
    })

    return { rows, warnings: warnings.length > 0 ? warnings : undefined }
  },
}

// ── Single-column fallback ────────────────────────────────────────────────────
// Used when the CSV has only 1 column with no recognised header — treated like TXT.

function singleColumnFallback(text: string, warnings: string[]): ParseResult {
  const lines = text.split('\n')
  const rows: ParsedRow[] = []
  const firstOccurrence = new Map<string, number>()

  // Skip header if it looks like a header (non-word-like first line)
  let startLine = 0
  const firstNonEmpty = lines.find((l) => l.trim().length > 0)
  if (firstNonEmpty && WORD_HEADERS.has(normalizeHeader(firstNonEmpty.replace(/,/g, '').trim()))) {
    startLine = 1
  }

  for (let i = startLine; i < lines.length; i++) {
    const stripped   = lines[i].replace(/\r$/, '').replace(/,/g, '').trim()
    const lineNumber = i + 1
    if (!stripped) continue
    const word = normalizeWord(stripped)
    if (!word) continue

    const existing = firstOccurrence.get(word)
    if (existing !== undefined) {
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

    if (rows.length >= MAX_ROWS) {
      warnings.push(`Only the first ${MAX_ROWS} rows will be imported.`)
      break
    }
  }

  return { rows, warnings: warnings.length > 0 ? warnings : undefined }
}
