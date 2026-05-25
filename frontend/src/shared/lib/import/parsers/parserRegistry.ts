import type { ImportParser, ParserInput } from './types'
import { txtParser } from './txtParser'
import { csvParser } from './csvParser'
import { ankiParser } from './ankiParser'
import { emitParserEvent } from './telemetry'

/**
 * Registered parsers.
 * Order is irrelevant — the registry selects by highest score(), not by position.
 */
const parsers: ImportParser[] = [
  csvParser,   // 1.0 for .csv files, 0.7 for comma-heavy content
  ankiParser,  // 0.9 for tab-separated, 0.6 for unrecognised multi-column CSV
  txtParser,   // 0.8 for .txt files, 0.2 plain-text fallback
]

/**
 * Select the appropriate parser for the given input.
 *
 * Each parser returns a confidence score [0–1] via score().
 * The parser with the highest score is chosen.
 * txtParser always returns a non-zero score for plain text so it acts
 * as the universal fallback when no other parser claims the input.
 */
export function selectParser(input: ParserInput): ImportParser {
  let best      = txtParser
  let bestScore = 0

  for (const parser of parsers) {
    const s = parser.score(input)
    if (s > bestScore) {
      bestScore = s
      best = parser
    }
  }

  emitParserEvent('parser_selected', {
    parser: best === txtParser ? 'txt' : best === csvParser ? 'csv' : 'anki',
    score: bestScore,
    filename: input.filename,
  })

  return best
}

/**
 * Register an additional parser.
 * The registry is score-based, so priority parameter is not used —
 * the parser competes purely on its score() return value.
 */
export function registerParser(parser: ImportParser): void {
  parsers.push(parser)
}
