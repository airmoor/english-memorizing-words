import { describe, it, expect } from 'vitest'
import { formatReviewTime } from './formatReviewTime'

// ── Helpers ───────────────────────────────────────────────────────────────────

const now = new Date('2024-06-15T12:00:00.000Z')

const at   = (ms: number) => new Date(now.getTime() + ms)
const min  = (n: number)  => n * 60 * 1_000
const hour = (n: number)  => n * 60 * min(1)
const day  = (n: number)  => n * 24 * hour(1)

// ── Overdue ───────────────────────────────────────────────────────────────────

describe('past (overdue)', () => {
  it('returns "Overdue" for 1 second in the past', () => {
    expect(formatReviewTime(at(-1_000), now)).toBe('Overdue')
  })

  it('returns "Overdue" for exactly 1 day overdue', () => {
    expect(formatReviewTime(at(-day(1)), now)).toBe('Overdue')
  })

  it('returns "Overdue by 2 days" for 2 days overdue', () => {
    expect(formatReviewTime(at(-day(2)), now)).toBe('Overdue by 2 days')
  })

  it('returns "Overdue by N days" for 5 days overdue', () => {
    expect(formatReviewTime(at(-day(5)), now)).toBe('Overdue by 5 days')
  })
})

// ── Within 10 minutes ─────────────────────────────────────────────────────────

describe('within 10 minutes ("In a moment")', () => {
  it('returns "In a moment" for 0ms (same instant)', () => {
    expect(formatReviewTime(now, now)).toBe('In a moment')
  })

  it('returns "In a moment" for exactly 10 minutes', () => {
    expect(formatReviewTime(at(min(10)), now)).toBe('In a moment')
  })

  it('returns "In a moment" for 5 minutes', () => {
    expect(formatReviewTime(at(min(5)), now)).toBe('In a moment')
  })

  it('returns "In a moment" for 1 minute', () => {
    expect(formatReviewTime(at(min(1)), now)).toBe('In a moment')
  })
})

// ── Within 60 minutes ─────────────────────────────────────────────────────────

describe('within 60 minutes', () => {
  it('returns "In 15 min" for 15 minutes', () => {
    expect(formatReviewTime(at(min(15)), now)).toBe('In 15 min')
  })

  it('returns "In 45 min" for 45 minutes', () => {
    expect(formatReviewTime(at(min(45)), now)).toBe('In 45 min')
  })

  it('returns "In 30 min" for 30 minutes', () => {
    expect(formatReviewTime(at(min(30)), now)).toBe('In 30 min')
  })
})

// ── Same day, <24h ───────────────────────────────────────────────────────────

describe('same day, less than 24h', () => {
  it('returns "Today" for exactly 1 hour (rounds to 1)', () => {
    expect(formatReviewTime(at(hour(1)), now)).toBe('Today')
  })

  it('returns "In 4 hours" for 4 hours', () => {
    expect(formatReviewTime(at(hour(4)), now)).toBe('In 4 hours')
  })

  it('returns "In 8 hours" for 8 hours', () => {
    expect(formatReviewTime(at(hour(8)), now)).toBe('In 8 hours')
  })
})

// ── Tomorrow ──────────────────────────────────────────────────────────────────

describe('tomorrow (24–48h)', () => {
  it('returns "Tomorrow" for 25 hours', () => {
    expect(formatReviewTime(at(day(1) + hour(1)), now)).toBe('Tomorrow')
  })

  it('returns "Tomorrow" for 36 hours', () => {
    expect(formatReviewTime(at(hour(36)), now)).toBe('Tomorrow')
  })
})

// ── Within 6 days ─────────────────────────────────────────────────────────────

describe('within 6 days', () => {
  it('returns "In 3 days" for 3 days', () => {
    expect(formatReviewTime(at(day(3)), now)).toBe('In 3 days')
  })

  it('returns "In 5 days" for 5 days', () => {
    expect(formatReviewTime(at(day(5)), now)).toBe('In 5 days')
  })
})

// ── Within 4 weeks ───────────────────────────────────────────────────────────

describe('within 4 weeks', () => {
  it('returns "In 1 week" for 7 days', () => {
    expect(formatReviewTime(at(day(7)), now)).toBe('In 1 week')
  })

  it('returns "In 2 weeks" for 14 days', () => {
    expect(formatReviewTime(at(day(14)), now)).toBe('In 2 weeks')
  })

  it('returns "In 3 weeks" for 21 days', () => {
    expect(formatReviewTime(at(day(21)), now)).toBe('In 3 weeks')
  })
})

// ── Within 12 months ─────────────────────────────────────────────────────────

describe('within 12 months', () => {
  it('returns "In 2 months" for 60 days', () => {
    expect(formatReviewTime(at(day(60)), now)).toBe('In 2 months')
  })

  it('returns "In 6 months" for 180 days', () => {
    expect(formatReviewTime(at(day(180)), now)).toBe('In 6 months')
  })

  it('returns "In 1 month" for 30 days', () => {
    expect(formatReviewTime(at(day(30)), now)).toBe('In 1 month')
  })
})

// ── Over a year ───────────────────────────────────────────────────────────────

describe('more than 12 months', () => {
  it('returns "In over a year" for 400 days', () => {
    expect(formatReviewTime(at(day(400)), now)).toBe('In over a year')
  })

  it('returns "In over a year" for exactly 365 days', () => {
    expect(formatReviewTime(at(day(365)), now)).toBe('In over a year')
  })
})

// ── Edge boundaries ──────────────────────────────────────────────────────────

describe('boundary edges', () => {
  it('1ms past boundary: 10min+1ms is "In 10 min" not "In a moment"', () => {
    // 10min + 1ms crosses the ≤10min threshold
    const result = formatReviewTime(at(min(10) + 1), now)
    expect(result).toBe('In 10 min')
  })

  it('deterministic: same inputs always produce same output', () => {
    const a = formatReviewTime(at(day(3)), now)
    const b = formatReviewTime(at(day(3)), now)
    expect(a).toBe(b)
  })

  it('does not mutate input dates', () => {
    const target = at(day(5))
    const nowCopy = new Date(now.getTime())
    const targetMs = target.getTime()
    const nowMs = now.getTime()
    formatReviewTime(target, now)
    expect(target.getTime()).toBe(targetMs)
    expect(now.getTime()).toBe(nowMs)
    expect(now.getTime()).toBe(nowCopy.getTime())
  })
})
