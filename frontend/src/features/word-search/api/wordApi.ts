import { apiClient } from '../../../shared/api/base'
import type { WordResult } from '../../../entities/word/model/types'
import type { VocabularyEntry } from '../../../entities/vocabulary/model/types'

export const fetchWord = (text: string): Promise<WordResult> =>
  apiClient.get(`/words/${encodeURIComponent(text)}`)

export const fetchVocabulary = (): Promise<VocabularyEntry[]> =>
  apiClient.get('/vocabulary')

export const saveMeaning = (meaningId: string): Promise<void> =>
  apiClient.post(`/vocabulary/meanings/${meaningId}`)

export const saveAllMeanings = (wordId: string): Promise<{ saved: number }> =>
  apiClient.post(`/vocabulary/words/${wordId}/save-all`)
