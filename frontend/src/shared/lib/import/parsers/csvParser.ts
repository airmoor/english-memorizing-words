import type { ImportParser, ParserInput, ParseResult } from './types'
import type { ParsedRow } from '../../../../entities/import-session/model/types'
import { normalizeWord } from '../normalizeWord'

const MAX_ROWS = 500

// ── Known column header names ─────────────────────────────────────────────────

const WORD_HEADERS = new Set(['word', 'term', 'vocabulary', 'english'])
const TAGS_HEADERS = new Set(['tags', 'tag', 'labels', 'label'])
const BOARD_HEADERS = new Set(['board', 'deck', 'list', 'group', 'category'])
const NOTES_HEADERS = new Set(['notes', 'note', 'definition', 'description', 'meaning', 'comment'])

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
}

function hasLexisHeader(headers: string[]): boolean {
  return headers.some((h) => WORD_HEADERS.has(normalizeHeader(h)))
}

// ── canParse ──────────────────────────────────────────────────────────────────

function canParse(input: ParserInput): boolean {
  if (input.filename) {
    const ext = input.filename.split('.').pop()?.toLowerCase()
    return ext === 'csv'
  }

  // Heuristic: if a significant fraction of lines contain commas or semicolons
  const sample = input.text.slice(0, 1000)
  const lines = sample.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length < 2) return false
  const delimited = lines.filter((l) => l.includes(',') || l.includes(';'))
  return delimited.length >= lines.length * 0.5
}

// ── Detect delimiter ──────────────────────────────────────────────────────────

function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] ?? ''
  const commas = (firstLine.match(/,/g) ?? []).length
  const semis = (firstLine.match(/;/g) ?? []).length
  return semis > commas ? ';' : ','
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
  canParse,

  parse(input: ParserInput): ParseResult {
    const text = input.text

    // Lazy-load papaparse (Vite handles dynamic import correctly)
    // Since we're in a synchronous parse() call, we use PapaParse's sync API
    // by importing it statically (it's bundled at build time).
    // Dynamic import is not suitable for the synchronous ImportParser.parse() contract.
    // PapaParse is small (< 50KB) so static import is fine.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Papa = require('papaparse') as typeof import('papaparse')

    const delimiter = detectDelimiter(text)

    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      delimiter,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    })

    const headers = result.meta.fields ?? []
    const warnings: string[] = []

    // ── Single-column fallback ────────────────────────────────────────────────
    if (headers.length <= 1 && !hasLexisHeader(headers)) {
      return singleColumnFallback(text, warnings)
    }

    // ── Column detection ──────────────────────────────────────────────────────
    const wordCol = headers.find((h) => WORD_HEADERS.has(normalizeHeader(h))) ?? headers[0]
    const tagsCol = headers.find((h) => TAGS_HEADERS.has(normalizeHeader(h)))
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
    const firstOccurrence = new Map<string, number>()

    for (let i = 0; i < data.length; i++) {
      const record = data[i]
      const rawWord = record[wordCol] ?? ''
      const lineNumber = i + 2 // header is line 1, data starts at line 2

      if (errorLines.has(i)) {
        rows.push({
          word: rawWord.trim(),
          lineNumber,
          rawText: Object.values(record).join(delimiter),
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

      const tags = tagsCol ? parseTags(record[tagsCol] ?? '') : undefined
      const board = boardCol ? (record[boardCol] ?? '').trim() || undefined : undefined
      const notes = notesCol ? (record[notesCol] ?? '').trim() || undefined : undefined

      const existing = firstOccurrence.get(word)
      if (existing !== undefined) {
        rows.push({
          word,
          lineNumber,
          rawText: rawWord,
          status: 'duplicate_within_batch',
          reason: `Already in this list (line ${existing})`,
          ...(tags && tags.length > 0 ? { tags } : {}),
          ...(board ? { board } : {}),
          ...(notes ? { notes } : {}),
        })
      } else {
        firstOccurrence.set(word, lineNumber)
        rows.push({
          word,
          lineNumber,
          rawText: rawWord,
          status: 'valid',
          ...(tags && tags.length > 0 ? { tags } : {}),
          ...(board ? { board } : {}),
          ...(notes ? { notes } : {}),
        })
      }
    }

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
    const stripped = lines[i].replace(/\r$/, '').replace(/,/g, '').trim()
    const lineNumber = i + 1
    if (!stripped) continue
    const word = normalizeWord(stripped)
    if (!word) continue

    const existing = firstOccurrence.get(word)
    if (existing !== undefined) {
      rows.push({
        word,
        lineNumber,
        rawText: stripped,
        status: 'duplicate_within_batch',
        reason: `Already in this list (line ${existing})`,
      })
    } else {
      firstOccurrence.set(word, lineNumber)
      rows.push({ word, lineNumber, rawText: stripped, status: 'valid' })
    }

    if (rows.length >= MAX_ROWS) {
      warnings.push(`Only the first ${MAX_ROWS} rows will be imported.`)
      break
    }
  }

  return { rows, warnings: warnings.length > 0 ? warnings : undefined }
}
