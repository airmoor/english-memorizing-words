/** Full board as returned by GET /boards */
export interface Board {
  id: string
  name: string
  description: string | null
  position: number
  isArchived: boolean
  cardCount: number
  createdAt: string
}

/** Lightweight board reference embedded in vocabulary card responses */
export interface BoardSummary {
  id: string
  name: string
}
