import type { VocabularyWord } from '../../../entities/vocabulary/model/types'

// ── Card State ────────────────────────────────────────────────────────────────

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

// ── Filter predicates ─────────────────────────────────────────────────────────

function isDueToday(word: VocabularyWord): boolean {
  return !!word.nextReview && new Date(word.nextReview) <= new Date()
}

function isSavedRecently(word: VocabularyWord): boolean {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return new Date(word.savedAt).getTime() >= sevenDaysAgo
}

function isReviewedRecently(word: VocabularyWord): boolean {
  if (!word.lastReviewedAt) return false
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return new Date(word.lastReviewedAt).getTime() >= sevenDaysAgo
}

function matchesFilter(word: VocabularyWord, filter: VocabularyFilter): boolean {
  switch (filter) {
    case 'dueToday':        return isDueToday(word)
    case 'neverReviewed':   return word.lastReviewedAt === null
    case 'savedRecently':   return isSavedRecently(word)
    case 'reviewedRecently': return isReviewedRecently(word)
    default:                return getCardState(word) === filter
  }
}

// ── Apply filters + sort ──────────────────────────────────────────────────────

export interface VocabularyViewOptions {
  query: string
  /** Active filters — matched with OR logic (any filter match shows the word). */
  activeFilters: VocabularyFilter[]
  sort: SortOption
}

export function applyVocabularyView(
  items: VocabularyWord[],
  { query, activeFilters, sort }: VocabularyViewOptions,
): VocabularyWord[] {
  let result = items.slice()

  // Text search — word text or any definition
  const q = query.trim().toLowerCase()
  if (q) {
    result = result.filter(
      (w) =>
        w.wordText.toLowerCase().includes(q) ||
        w.meanings.some((m) => m.definition.toLowerCase().includes(q)),
    )
  }

  // State/special filters — OR semantics
  if (activeFilters.length > 0) {
    result = result.filter((word) =>
      activeFilters.some((f) => matchesFilter(word, f)),
    )
  }

  // Sort
  result.sort((a, b) => {
    switch (sort) {
      case 'newest':
        return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      case 'oldest':
        return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
      case 'alphabetical':
        return a.wordText.localeCompare(b.wordText)
      case 'hardest': {
        // Lower ease = harder. Null (new cards) ranked as hardest.
        const ea = a.easeFactor ?? -1
        const eb = b.easeFactor ?? -1
        return ea - eb
      }
      case 'easiest': {
        // Higher ease = easier. Null ranked as easiest to avoid confusion.
        const ea = a.easeFactor ?? 999
        const eb = b.easeFactor ?? 999
        return eb - ea
      }
      case 'nextReview': {
        // Null (never reviewed) goes last
        if (!a.nextReview && !b.nextReview) return 0
        if (!a.nextReview) return 1
        if (!b.nextReview) return -1
        return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()
      }
      default:
        return 0
    }
  })

  return result
}
