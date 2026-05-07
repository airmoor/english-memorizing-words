import { apiClient } from '../../../shared/api/base'
import type { VocabularyEntry } from '../../../entities/vocabulary/model/types'

export const fetchVocabulary = (): Promise<VocabularyEntry[]> =>
  apiClient.get('/vocabulary')

export const deleteMeaning = (meaningId: string): Promise<void> =>
  apiClient.delete(`/vocabulary/meanings/${meaningId}`)
