import { apiClient } from '../../../shared/api/base'
import type { PaginatedVocabulary, VocabularyWord } from '../../../entities/vocabulary/model/types'
import type { WordResult } from '../../../entities/word/model/types'

export const fetchWord = (text: string): Promise<WordResult> =>
  apiClient.get(`/words/${encodeURIComponent(text)}`)

/**
 * Fetches all saved word IDs for the current user.
 * Used by useSavedWords to power the "Save" button state on search results.
 * Uses a high limit (1000) because we need the full ID set, not a single page.
 */
export const fetchVocabulary = (): Promise<VocabularyWord[]> =>
  apiClient.get<PaginatedVocabulary>('/vocabulary?limit=1000').then((r) => r.items)

export const saveWord = (wordId: string): Promise<void> =>
  apiClient.post(`/vocabulary/words/${wordId}`)
