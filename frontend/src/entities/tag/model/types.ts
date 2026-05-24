/** Full tag as returned by GET /tags */
export interface Tag {
  id: string
  name: string
  cardCount: number
  createdAt: string
}

/** Lightweight tag reference embedded in vocabulary card responses */
export interface TagSummary {
  id: string
  name: string
}
