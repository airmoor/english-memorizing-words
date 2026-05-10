import { apiClient } from '../../../shared/api/base'
import type { WordResult } from '../../../entities/word/model/types'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'

export const fetchWord = (text: string): Promise<WordResult> =>
  apiClient.get(`/words/${encodeURIComponent(text)}`)

export const fetchVocabulary = (): Promise<VocabularyWord[]> =>
  apiClient.get('/vocabulary')

export const saveWord = (wordId: string): Promise<void> =>
  apiClient.post(`/vocabulary/words/${wordId}`)
