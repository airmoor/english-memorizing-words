import type { ParsedRow } from '../../../../entities/import-session/model/types'

// ── Parser input ──────────────────────────────────────────────────────────────

export interface ParserInput {
  /** Raw text content (from paste or file read) */
  text: string
  /** Original filename, if available — used for canParse heuristics */
  filename?: string
}

// ── Column mapping (used by Anki parser) ─────────────────────────────────────

export interface ColumnMap {
  /** 0-based index of the word column */
  wordColumnIndex: number
  /** 0-based index of the tags column, if mapped */
  tagsColumnIndex?: number
}

export interface ColumnSuggestion {
  /** 0-based column index */
  index: number
  /** Sample values from the first few rows */
  samples: string[]
  /** Heuristic confidence score (0–1) that this is the word column */
  confidence: number
}

// ── ParseResult ───────────────────────────────────────────────────────────────

export interface ParseResult {
  rows: ParsedRow[]
  /**
   * If true, the parser cannot determine the word column from the input alone.
   * The UI should route to the column-mapping step.
   */
  requiresColumnMapping?: boolean
  /** Candidate columns for the mapping UI (Anki parser populates this) */
  columnSuggestions?: ColumnSuggestion[]
  /** Non-fatal warnings about the parse (e.g. rows truncated) */
  warnings?: string[]
}

// ── ImportParser interface ────────────────────────────────────────────────────

/**
 * All parsers implement this interface.
 * `parserRegistry.selectParser(input)` picks the correct implementation.
 */
export interface ImportParser {
  /**
   * Returns true if this parser can handle the given input.
   * Called with the first few hundred chars of text and the filename (if any).
   */
  canParse(input: ParserInput): boolean

  /**
   * Parse the input into ParsedRow[].
   * Within-batch deduplication is handled inside parse().
   * No API calls, no side effects.
   *
   * @param input     The raw text input
   * @param columnMap Optional column map (provided after Anki column-mapping step)
   */
  parse(input: ParserInput, columnMap?: ColumnMap): ParseResult
}
