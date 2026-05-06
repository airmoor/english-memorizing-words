export interface NextCard {
  cardId: string
  meaningId: string
  word: string
  partOfSpeech: string | null
  example: string | null
  meaningCount: number
}

export interface CardAnswer {
  definition: string
  examples: string[]
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
}

export type Rating = 'again' | 'hard' | 'good' | 'easy'
