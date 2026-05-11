import type { MeaningPayload } from './types'

/**
 * Groups meanings by part of speech, preserving order.
 * Consecutive meanings with the same POS are merged into one group.
 * Used by WordDetailContent to feed MeaningGroup[].
 */
export function groupByPos(
  meanings: MeaningPayload[],
): { pos: string | null; meanings: MeaningPayload[] }[] {
  const groups: { pos: string | null; meanings: MeaningPayload[] }[] = []
  for (const m of meanings) {
    const last = groups[groups.length - 1]
    if (last && last.pos === m.partOfSpeech) {
      last.meanings.push(m)
    } else {
      groups.push({ pos: m.partOfSpeech, meanings: [m] })
    }
  }
  return groups
}

/**
 * Returns true for sub-sense labels (e.g. "1a", "1b") that should be indented.
 * False for top-level senses ("1", "2") and null.
 */
export function isSubSense(senseNumber: string | null): boolean {
  return senseNumber !== null && /[a-zA-Z]/.test(senseNumber)
}
