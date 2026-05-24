/**
 * The front side of a review card — identifies the word, its pronunciation,
 * and a single example sentence for context before the answer is revealed.
 */
export interface NextCard {
  cardId: string
  wordId: string
  word: string
  transcription: string | null
  example: string | null
}

/**
 * A single sense/definition shown on the answer side of a review card.
 */
export interface CardMeaning {
  id: string
  definition: string
  partOfSpeech: string | null
  examples: string[]
  senseNumber: string | null
  synonyms: string[]
}

/**
 * Per-rating timing preview — what SM-2 would schedule if the user picks
 * that rating. Mirrors RatingPreviewDto from the backend.
 */
export interface RatingPreview {
  intervalDays: number
  nextReview: string   // ISO 8601
  human: string        // e.g. "In 3 days", "Tomorrow", "In a moment"
}

/**
 * All four rating previews, returned alongside the card answer so the
 * rating buttons can show their timing sub-labels without an extra request.
 */
export interface NextReviewPreviews {
  again: RatingPreview
  hard: RatingPreview
  good: RatingPreview
  easy: RatingPreview
}

/**
 * The back side of a review card — all meanings for the word, plus
 * timing previews for each rating option.
 */
export interface CardAnswer {
  meanings: CardMeaning[]
  nextReviewPreviews: NextReviewPreviews
}

export interface ReviewResult {
  nextReview: string
  interval: number
  easeFactor: number
}

export interface ReviewProgress {
  dueToday: number
  total: number
  reviewedToday: number
  streak: number
  nextReviewDate: string | null
}

export type Rating = 'again' | 'hard' | 'good' | 'easy'
