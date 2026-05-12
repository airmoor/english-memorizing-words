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
 * One entry per canonical English word in the user's vocabulary.
 * Meanings are nested — the word is the learning unit, not individual senses.
 *
 * Includes full dictionary data (provider, synonyms, examples) and the
 * learning state (card SRS fields) so WordDetailContent can be rendered
 * without a secondary fetch. See §4.5 of the vocabulary-discovery spec.
 */
export interface PaginatedVocabulary {
  items: VocabularyWord[]
  total: number
  hasMore: boolean
}

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
  // Null when no card exists (should not occur — card is created on save).
  /** ISO 8601 — when the next review is due. */
  nextReview: string | null
  /** ISO 8601 — when the word was last reviewed. Null if never reviewed. */
  lastReviewedAt: string | null
  /** Current SRS interval in days. */
  intervalDays: number | null
  /** SM-2 ease factor. */
  easeFactor: number | null
  meanings: VocabularyMeaning[]
}
