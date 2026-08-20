export type BoardVisibility = 'private' | 'unlisted'

/** Full board as returned by GET /boards */
export interface Board {
  id: string
  name: string
  description: string | null
  position: number
  isArchived: boolean
  cardCount: number
  visibility: BoardVisibility
  /** Only set while visibility is 'unlisted'. */
  shareSlug: string | null
  createdAt: string
}

export interface SharedBoardMeaning {
  definition: string
  partOfSpeech: string | null
}

export interface SharedBoardWord {
  wordId: string
  wordText: string
  transcription: string | null
  meanings: SharedBoardMeaning[]
}

/** Public, read-only shape returned by GET /boards/shared/:slug */
export interface SharedBoard {
  name: string
  description: string | null
  colorAccent: string | null
  words: SharedBoardWord[]
}

/** Lightweight board reference embedded in vocabulary card responses */
export interface BoardSummary {
  id: string
  name: string
}
