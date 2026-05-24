import type { ReviewState } from './types'

/** Part-of-speech values accepted by the backend vocabulary query */
export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'determiner'

/** Sort direction for the vocabulary list */
export type SortDir = 'asc' | 'desc'

/**
 * All possible active filters on the vocabulary list.
 * Each field is optional; omitting it (or setting to `undefined`) means
 * "no filter on this dimension".
 *
 * Mirrors the extended `GET /vocabulary` query parameters from the backend:
 *   boardId, tagIds, reviewState, partOfSpeech, sortDir
 */
export interface VocabularyFilters {
  /** Filter to cards belonging to a specific board */
  boardId?: string
  /** Filter to cards that have ALL of these tags (AND logic) */
  tagIds?: string[]
  /** Filter by computed review state */
  reviewState?: ReviewState
  /** Filter by part-of-speech */
  partOfSpeech?: PartOfSpeech
  /** Sort direction for `savedAt` (default is desc — newest first) */
  sortDir?: SortDir
}
