import type { ParsedRow } from '../../../../entities/import-session/model/types'

// ── Parser input ──────────────────────────────────────────────────────────────

export interface ParserInput {
  /** Raw text content (from paste or file read) */
  text: string
  /** Original filename, if available — used for score() heuristics */
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
 * `parserRegistry.selectParser(input)` picks the highest-scoring implementation.
 */
export interface ImportParser {
  /**
   * Returns a confidence score [0–1] for how well this parser handles the input.
   *
   *   0   = cannot handle this input at all (will never be selected unless all
   *         parsers return 0, in which case txtParser is the safe fallback)
   *   0.1 = weak claim (plain-text fallback)
   *   0.7 = good heuristic match
   *   1.0 = definitive match (e.g. explicit .csv extension)
   *
   * The registry selects the parser with the highest non-zero score.
   * txtParser always returns a low non-zero score so it acts as the fallback.
   */
  score(input: ParserInput): number

  /**
   * Parse the input into ParsedRow[].
   * Returns a Promise to support future parsers that may need async work
   * (e.g. XLSX decompression, large-file streaming).
   *
   * Current implementations resolve synchronously via Promise.resolve().
   *
   * Within-batch deduplication is handled inside parse().
   * No API calls, no side effects.
   * Each row receives a stable `clientRowId` (crypto.randomUUID()).
   *
   * @param input     The raw text input
   * @param columnMap Optional column map (provided after Anki column-mapping step)
   */
  parse(input: ParserInput, columnMap?: ColumnMap): Promise<ParseResult>
}
