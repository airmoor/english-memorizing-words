/**
 * Utilities for parsing Merriam-Webster definition strings.
 *
 * MW definitions contain two common patterns that benefit from distinct rendering:
 *
 *  1. "see also" suffixes — cross-reference terms appended to the main definition.
 *     Examples:
 *       "large in size see also the big city at city"
 *       "large in number or amount see also big bucks"
 *       "to obtain (something): such as see also big deal, big picture"
 *
 *  2. Editorial notes — inline glosses in [=...] brackets.
 *     Examples:
 *       "He is a big [=tall and heavy] man."
 *       "She was earning big money [=a lot of money]"
 *
 * All parsers are defensive: if a definition does not match the expected
 * pattern it is returned unchanged. They never throw on malformed input.
 */

// ─────────────────────────────────────────────────────────────────────────────
// See-also extraction
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedDefinition {
  /** Clean definition text with the "see also …" suffix removed. */
  text: string
  /** Zero or more cross-reference terms extracted from the "see also" suffix. */
  seeAlso: string[]
}

/**
 * Detect patterns like:
 *   "…  see also term"
 *   "…; such as see also term a, term b"
 *
 * The regex anchors to the end of the string and captures everything after
 * "see also". Multiple terms are comma-separated.
 *
 * Known unhandled patterns (flagged for follow-up):
 *   - "see [word] at [entry]" — MW "at" cross-references are not extracted
 *     because the link target ("at city") is not a searchable term as-is.
 *   - Inline "see …" without "also" (e.g. "see usage at X") — not matched.
 */
const SEE_ALSO_RE = /\bsee\s+also\b(.+)$/i

export function parseDefinition(raw: string): ParsedDefinition {
  try {
    const match = SEE_ALSO_RE.exec(raw)
    if (!match) {
      return { text: raw, seeAlso: [] }
    }

    const cleanText = raw.slice(0, match.index).trim()
      // Remove trailing punctuation left after stripping the "see also" clause
      .replace(/[;:,\s]+$/, '')

    const refString = match[1].trim()
    const terms = refString
      .split(/,\s+/)
      .map((t) => t.trim())
      .filter(Boolean)

    return { text: cleanText || raw, seeAlso: terms }
  } catch {
    // Never crash on malformed MW data
    return { text: raw, seeAlso: [] }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Editorial note rendering
// ─────────────────────────────────────────────────────────────────────────────

export type TextPart =
  | { type: 'text';      content: string }
  | { type: 'editorial'; content: string }

/**
 * Splits a string on [=...] editorial notes.
 *
 * Input:  "He is a big [=tall and heavy] man."
 * Output: [
 *   { type: 'text',      content: 'He is a big ' },
 *   { type: 'editorial', content: '[=tall and heavy]' },
 *   { type: 'text',      content: ' man.' },
 * ]
 *
 * If no editorial notes are found, returns a single text part.
 * Never throws.
 */
const EDITORIAL_RE = /\[=([^\]]+)\]/g

export function renderWithEditorialNotes(text: string): TextPart[] {
  try {
    const parts: TextPart[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    EDITORIAL_RE.lastIndex = 0 // reset stateful global regex

    while ((match = EDITORIAL_RE.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
      }
      // Keep the full [=...] brackets as the editorial note content
      parts.push({ type: 'editorial', content: match[0] })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) })
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }]
  } catch {
    return [{ type: 'text', content: text }]
  }
}
