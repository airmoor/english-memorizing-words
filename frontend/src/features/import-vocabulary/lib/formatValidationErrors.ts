import type { ValidationErrorDetail } from '../../../shared/api/base'
import type { ImportFlowError } from '../../../entities/import-session/model/types'

// ── Row-index extraction ───────────────────────────────────────────────────────

/**
 * Extract the 0-based row index from a path like "words[3].word".
 * Returns null when the path doesn't match the expected pattern.
 */
function extractRowIndex(path: string): number | null {
  const match = path.match(/^words\[(\d+)\]/)
  return match ? parseInt(match[1], 10) : null
}

// ── User-friendly message builder ─────────────────────────────────────────────

/**
 * Map a constraint name to a short human-readable label.
 * Covers the constraints that appear on ImportRowDto fields.
 */
function constraintLabel(constraint: string): string {
  switch (constraint) {
    case 'maxLength':     return 'too long'
    case 'minLength':     return 'too short'
    case 'isString':      return 'must be text'
    case 'isInt':         return 'must be a whole number'
    case 'min':           return 'value out of range'
    case 'isUUID':        return 'invalid ID format'
    case 'isIn':          return 'unrecognised value'
    case 'isArray':       return 'must be a list'
    default:              return 'invalid value'
  }
}

// ── Smart grouped summary ─────────────────────────────────────────────────────

/**
 * Produce a user-friendly summary line from a group of same-constraint errors.
 * Called once per constraint type after grouping.
 */
function summariseGroup(constraint: string, count: number, fieldName: string): string {
  const noun = fieldName === 'word' ? (count === 1 ? 'word' : 'words') : `${fieldName} value${count !== 1 ? 's' : ''}`

  if (constraint === 'maxLength') {
    return count === 1
      ? 'One word exceeds the 100 character limit.'
      : `${count} ${noun} exceed the 100 character limit.`
  }

  if (constraint === 'minLength' || constraint === 'isString') {
    return count === 1
      ? `One row has an invalid word.`
      : `${count} rows have invalid words.`
  }

  const label = constraintLabel(constraint)
  return count === 1
    ? `One row has an invalid value (${label}).`
    : `${count} rows have invalid values (${label}).`
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Convert a `ValidationErrorDetail[]` from the backend into a user-friendly
 * `ImportFlowError` of type 'validation'.
 *
 * Strategy:
 *   1. Group by (field, constraint) pair.
 *   2. Pick the most impactful group to headline the message.
 *   3. If multiple distinct groups exist, append a short "and N more…" note.
 *   4. Never expose raw class-validator paths or technical field names.
 */
export function buildValidationFlowError(
  details: ValidationErrorDetail[],
): ImportFlowError {
  if (details.length === 0) {
    return {
      type: 'validation',
      message: 'Some rows contain invalid values. Please review your input.',
      details,
    }
  }

  // Extract the field name from the path tail (e.g. "words[3].word" → "word")
  function fieldOf(path: string): string {
    return path.split('.').pop() ?? path
  }

  // Group errors: key = "field::constraint", value = count
  const groups = new Map<string, { field: string; constraint: string; count: number }>()
  for (const err of details) {
    const field = fieldOf(err.path)
    const key = `${field}::${err.constraint}`
    const existing = groups.get(key)
    if (existing) {
      existing.count++
    } else {
      groups.set(key, { field, constraint: err.constraint, count: 1 })
    }
  }

  const sorted = [...groups.values()].sort((a, b) => b.count - a.count)
  const primary = sorted[0]

  const primaryMessage = summariseGroup(primary.constraint, primary.count, primary.field)

  const totalGroups = sorted.length
  const message =
    totalGroups > 1
      ? `${primaryMessage} (and ${totalGroups - 1} other issue${totalGroups - 1 !== 1 ? 's' : ''})`
      : primaryMessage

  return { type: 'validation', message, details }
}

// ── Row-level error map ───────────────────────────────────────────────────────

/**
 * Build a Map from `clientRowId → reason` for rows that failed validation.
 *
 * `sentRows` is the list that was actually sent to the server (may be a
 * filtered subset of the full parsed row list). The path index in
 * "words[N].word" corresponds to `sentRows[N]`.
 */
export function buildRowErrorMap(
  details: ValidationErrorDetail[],
  sentRows: Array<{ clientRowId: string }>,
): Map<string, string> {
  const result = new Map<string, string>()

  for (const err of details) {
    const rowIndex = extractRowIndex(err.path)
    if (rowIndex === null) continue
    const row = sentRows[rowIndex]
    if (!row) continue

    // Use the most specific existing reason, or set a new one
    if (!result.has(row.clientRowId)) {
      const field = err.path.split('.').pop() ?? 'field'
      if (err.constraint === 'maxLength') {
        result.set(row.clientRowId, 'Word too long (max 100 characters)')
      } else {
        result.set(row.clientRowId, `Invalid ${field} (${constraintLabel(err.constraint)})`)
      }
    }
  }

  return result
}
