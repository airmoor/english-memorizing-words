/**
 * WordDetail type contracts — the architecture boundary between the dictionary
 * domain and the learning domain. These interfaces are passed as props to
 * WordDetailContent and must never be merged.
 *
 * §4 of spec: Dictionary data vs. Learning objects.
 * §4.5: Data ownership rules.
 */

// ── Dictionary domain ──────────────────────────────────────────────────────
// Shared, immutable, global. Any user can fetch this data. Never mutated by
// user actions. Cached under ['word', wordId] with a long stale time.

/** String union matching the DictionaryProvider enum on the backend. */
export type DictionaryProvider = 'merriam-webster' | 'free-dictionary'

/**
 * A single dictionary sense as it appears in WordDetailContent.
 * Maps to backend Meaning entity. Sufficient for Sense component rendering.
 */
export interface MeaningPayload {
  id: string
  definition: string
  partOfSpeech: string | null
  /** Synonyms for this specific sense. */
  synonyms: string[]
  /** Example sentences for this specific sense. */
  examples: string[]
  /** Dictionary label: "1", "1a", "2" — null when provider has no sense numbers. */
  senseNumber: string | null
}

/**
 * The canonical dictionary payload for a word.
 *
 * Passed to WordDetailContent as the `word` prop. Never contains learning data.
 * Adapters in useWordDetailData convert VocabularyWord and WordResult into this.
 *
 * Note: Structurally equivalent to WordResult from entities/word/model/types.ts.
 * WordPayload is a deliberate separate type expressing the §4 boundary — it is
 * the dictionary layer contract, not a renamed alias.
 */
export interface WordPayload {
  id: string
  text: string
  transcription: string | null
  provider: DictionaryProvider
  meanings: MeaningPayload[]
}

// ── Learning domain ────────────────────────────────────────────────────────
// Private, mutable, user-scoped. Derived from Card entity. Cached under
// ['vocabulary'] with a short stale time. Invalidated by save/remove/review.

/**
 * The learning state for a single word.
 *
 * Passed to WordDetailContent as `learningState`. Null when the word is not
 * saved to the user's vocabulary. Never merged into WordPayload.
 *
 * Dates are ISO 8601 strings as returned by the API (timestamptz serialized).
 * Consumers that need Date objects must parse them at the call site.
 */
export interface LearningState {
  /** ISO 8601 date string — when the next review is due. */
  nextReview: string
  /** ISO 8601 date string — when the word was last reviewed. Null if never reviewed. */
  lastReviewedAt: string | null
  /** Current SRS interval in days. */
  intervalDays: number
  /** SM-2 ease factor. Default 2.5, range ~1.3–4.0. */
  easeFactor: number
}

// ── WordDetailContent props contract ──────────────────────────────────────

/**
 * The complete prop interface for WordDetailContent.
 * Defined here so all containers (BottomSheet, SidePanel, WordDetailPage) share
 * the same contract without importing from the component file.
 */
export interface WordDetailContentProps {
  /** Dictionary layer. Always present. */
  word: WordPayload
  /**
   * Learning layer. Null when the word is not in the user's vocabulary.
   * WordDetailContent renders LearningSection only when this is non-null.
   */
  learningState: LearningState | null
  /** Called when the user saves the word. Only rendered when learningState is null. */
  onSave: () => void
  /** Called when the user removes the word. Only rendered when learningState is non-null. */
  onRemove: () => void
  /** Whether a save or remove mutation is in flight. Disables the action button. */
  isMutating?: boolean
  /**
   * When provided, a close × button is rendered in the DictionaryHeader action area
   * instead of the save/remove button. Use in vocabulary context where the word is
   * always saved and the "Saved ✓" badge is redundant.
   */
  onClose?: () => void
}
