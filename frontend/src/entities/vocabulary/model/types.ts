import type { BoardSummary } from '../../board/model/types'
import type { TagSummary } from '../../tag/model/types'
import type { CardNote } from '../../card-note/model/types'

export interface VocabularyMeaning {
  id: string
  definition: string
  partOfSpeech: string | null
  senseNumber: string | null
  /** Synonyms for this sense. Present in all API responses (may be empty array). */
  synonyms: string[]
  /** Example sentences for this sense. Present in all API responses (may be empty array). */
  examples: string[]
}

/**
 * Review state derived from card SRS fields.
 *
 * - `new`      — card has never been reviewed (intervalDays is null / 0)
 * - `due`      — nextReview is in the past
 * - `upcoming` — nextReview is in the future, within the next 7 days
 * - `mastered` — interval ≥ 21 days (card is well-established)
 */
export type ReviewState = 'new' | 'due' | 'upcoming' | 'mastered'

/**
 * One entry per canonical English word in the user's vocabulary.
 * Meanings are nested — the word is the learning unit, not individual senses.
 *
 * Includes full dictionary data (provider, synonyms, examples) and the
 * learning state (card SRS fields) so WordDetailContent can be rendered
 * without a secondary fetch.
 *
 * Extended in boards-tags-review-v2 to include boards, tags, note, and
 * a derived reviewState field.
 */
export interface VocabularyWord {
  userWordId: string
  wordId: string
  wordText: string
  transcription: string | null
  /** Dictionary provider that sourced this word. */
  provider: string
  /** ISO 8601 — when the user saved this word. */
  savedAt: string
  // ── Learning state (from cards table) ────────────────────────────────────
  cardId: string | null
  /** ISO 8601 — when the next review is due. */
  nextReview: string | null
  /** ISO 8601 — when the word was last reviewed. Null if never reviewed. */
  lastReviewedAt: string | null
  /** Current SRS interval in days. */
  intervalDays: number | null
  /** SM-2 ease factor. */
  easeFactor: number | null
  /** Humanised next-review string from backend (e.g. "Tomorrow", "In 3 days"). */
  nextReviewHuman: string | null
  /** Derived review state from the backend. */
  reviewState: ReviewState
  meanings: VocabularyMeaning[]
  // ── Organisation ─────────────────────────────────────────────────────────
  boards: BoardSummary[]
  tags: TagSummary[]
  note: CardNote | null
}

export interface PaginatedVocabulary {
  items: VocabularyWord[]
  total: number
  hasMore: boolean
}
