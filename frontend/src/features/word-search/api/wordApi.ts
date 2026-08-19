import { apiClient } from '../../../shared/api/base'
import type { WordResult } from '../../../entities/word/model/types'
import type { BoardSummary } from '../../../entities/board/model/types'

export const fetchWord = (text: string): Promise<WordResult> =>
  apiClient.get(`/words/${encodeURIComponent(text)}`)

/** Shape returned by GET /vocabulary/words/:wordId/status */
export interface WordSavedStatus {
  isSaved: boolean
  meaningIds: string[]
  /** The saved word's card id — null when isSaved is false. */
  cardId: string | null
  /** Boards the word's card currently belongs to — empty when isSaved is false. */
  boards: BoardSummary[]
}

/**
 * Fetches the saved status for a single word.
 * Returns { isSaved: false, meaningIds: [] } when the word is not in vocabulary.
 */
export const fetchWordSavedStatus = (wordId: string): Promise<WordSavedStatus> =>
  apiClient.get<WordSavedStatus>(`/vocabulary/words/${wordId}/status`)

/**
 * Save a word to the user's vocabulary.
 * Optional `meaningIds` restricts which meanings are stored.
 * Omitting `meaningIds` (or passing an empty array) saves all meanings.
 */
export const saveWord = (
  wordId: string,
  meaningIds?: string[],
): Promise<void> =>
  meaningIds && meaningIds.length > 0
    ? apiClient.post(`/vocabulary/words/${wordId}`, { meaningIds })
    : apiClient.post(`/vocabulary/words/${wordId}`)
