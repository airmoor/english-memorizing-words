import { apiClient } from '../../../shared/api/base'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'

export const fetchVocabulary = (): Promise<VocabularyWord[]> =>
  apiClient.get('/vocabulary')

export const saveWord = (wordId: string): Promise<void> =>
  apiClient.post(`/vocabulary/words/${wordId}`)

export const deleteWord = (wordId: string): Promise<void> =>
  apiClient.delete(`/vocabulary/words/${wordId}`)
