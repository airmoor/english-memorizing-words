import type { ImportParser, ParserInput } from './types'
import { txtParser } from './txtParser'
import { csvParser } from './csvParser'
import { ankiParser } from './ankiParser'

/**
 * Ordered list of registered parsers.
 * Parsers are tried in order; the first one whose canParse() returns true is used.
 *
 * Priority order:
 *   1. csvParser  — .csv files and recognised-header delimited content
 *   2. ankiParser — tab-separated or unrecognised multi-column CSV (Anki exports)
 *   3. txtParser  — plain text / .txt files (fallback)
 */
const parsers: ImportParser[] = [
  csvParser,   // Highest: .csv with recognised headers
  ankiParser,  // Middle: tab-separated / unrecognised CSV → requires column mapping
  txtParser,   // Fallback: plain text word list
]

/**
 * Select the appropriate parser for the given input.
 * Falls back to txtParser if no parser claims the input.
 */
export function selectParser(input: ParserInput): ImportParser {
  for (const parser of parsers) {
    if (parser.canParse(input)) return parser
  }
  // Safe fallback — txtParser handles anything
  return txtParser
}

/**
 * Register a parser at a given priority (0 = highest).
 * Used by Phase 3+ to insert csvParser and ankiParser.
 */
export function registerParser(parser: ImportParser, priority = parsers.length): void {
  parsers.splice(priority, 0, parser)
}
