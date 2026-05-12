import type { VocabularyWord } from '../../../entities/vocabulary/model/types'

// ── Card State (derived client-side for UI display) ───────────────────────────

/**
 * Simplified learning lifecycle states, inspired by Anki's model but
 * presented in plain language suitable for non-technical learners.
 *
 * Derivation priority: difficult > new > learning > review > mature
 *
 * Suspended is intentionally excluded here — it requires a backend field
 * (isSuspended) not yet available. The architecture is designed to add it
 * by extending VocabularyWord and the getCardState priority chain.
 */
export type CardState = 'new' | 'learning' | 'review' | 'mature' | 'difficult'

/** User-readable labels for each state. Kept plain — no SRS jargon. */
export const CARD_STATE_LABELS: Record<CardState, string> = {
  new:       'New',
  learning:  'Learning',
  review:    'Review',
  mature:    'Mature',
  difficult: 'Difficult',
}

/**
 * Derives a single card state from the word's SRS fields.
 *
 * - difficult: easeFactor below 2.0 (SM-2 threshold for low retention)
 * - new: never reviewed (no lastReviewedAt / intervalDays)
 * - learning: active repetition phase (< 7 day interval)
 * - review: graduated SRS (7–20 days)
 * - mature: high-stability card (≥ 21 days)
 */
export function getCardState(word: VocabularyWord): CardState {
  if (word.easeFactor !== null && word.easeFactor < 2.0) return 'difficult'
  if (word.lastReviewedAt === null || word.intervalDays === null) return 'new'
  if (word.intervalDays < 7) return 'learning'
  if (word.intervalDays < 21) return 'review'
  return 'mature'
}

// ── Filter / Sort options ─────────────────────────────────────────────────────

export type VocabularyFilter =
  | CardState
  | 'dueToday'
  | 'neverReviewed'
  | 'savedRecently'
  | 'reviewedRecently'

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'alphabetical'
  | 'hardest'
  | 'easiest'
  | 'nextReview'

export const SORT_LABELS: Record<SortOption, string> = {
  newest:      'Newest first',
  oldest:      'Oldest first',
  alphabetical: 'A → Z',
  hardest:     'Hardest first',
  easiest:     'Easiest first',
  nextReview:  'Next review',
}
