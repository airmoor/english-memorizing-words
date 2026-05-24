/**
 * Humanises a review timestamp into a readable label.
 *
 * Mirrors `humaniseReviewTime()` from the backend's ReviewTimingService
 * (src/reviews/review-timing.service.ts) so that client-side labels
 * match what the API sends as `nextReviewHuman`.
 *
 * Pure function — no side-effects, no Date.now() calls, timezone-safe
 * (operates on absolute millisecond offsets, not calendar arithmetic).
 *
 * Format table:
 *   past                     → "Overdue" | "Overdue by N days"
 *   ≤ 10 minutes             → "In a moment"
 *   ≤ 60 minutes             → "In N min"
 *   < 24 hours, ≤ 1 hour     → "Today"
 *   < 24 hours, > 1 hour     → "In N hours"
 *   < 48 hours               → "Tomorrow"
 *   < 6 days                 → "In N days"
 *   < 28 days                → "In N week(s)"
 *   < 365 days               → "In N month(s)"
 *   ≥ 365 days               → "In over a year"
 */

const MS_PER_MIN  = 60 * 1_000
const MS_PER_HOUR = 60 * MS_PER_MIN
const MS_PER_DAY  = 24 * MS_PER_HOUR

export function formatReviewTime(targetDate: Date, now: Date): string {
  const diffMs = targetDate.getTime() - now.getTime()

  // ── Past ────────────────────────────────────────────────────────────────
  if (diffMs < 0) {
    const overdueDays = Math.round(Math.abs(diffMs) / MS_PER_DAY)
    return overdueDays >= 2 ? `Overdue by ${overdueDays} days` : 'Overdue'
  }

  // ── ≤ 10 minutes (covers SM-2 "again" 0-day preview) ────────────────────
  if (diffMs <= 10 * MS_PER_MIN) return 'In a moment'

  // ── Within 60 minutes ───────────────────────────────────────────────────
  if (diffMs < MS_PER_HOUR) {
    const mins = Math.round(diffMs / MS_PER_MIN)
    return `In ${mins} min`
  }

  // ── Same day, < 24h ─────────────────────────────────────────────────────
  if (diffMs < MS_PER_DAY) {
    const hours = Math.round(diffMs / MS_PER_HOUR)
    return hours <= 1 ? 'Today' : `In ${hours} hours`
  }

  // ── Tomorrow (24–48h) ───────────────────────────────────────────────────
  if (diffMs < 2 * MS_PER_DAY) return 'Tomorrow'

  // ── Within 6 days ───────────────────────────────────────────────────────
  if (diffMs < 6 * MS_PER_DAY) {
    const days = Math.round(diffMs / MS_PER_DAY)
    return `In ${days} days`
  }

  // ── Within 4 weeks ──────────────────────────────────────────────────────
  if (diffMs < 28 * MS_PER_DAY) {
    const weeks = Math.round(diffMs / (7 * MS_PER_DAY))
    return `In ${weeks} week${weeks === 1 ? '' : 's'}`
  }

  // ── Within 12 months ────────────────────────────────────────────────────
  if (diffMs < 365 * MS_PER_DAY) {
    const months = Math.round(diffMs / (30 * MS_PER_DAY))
    return `In ${months} month${months === 1 ? '' : 's'}`
  }

  return 'In over a year'
}
