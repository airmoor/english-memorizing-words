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
 * The back side of a review card — all meanings for the word.
 */
export interface CardAnswer {
  meanings: CardMeaning[]
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
