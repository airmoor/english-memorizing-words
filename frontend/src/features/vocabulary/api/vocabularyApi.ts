import { apiClient } from '../../../shared/api/base'
import type { PaginatedVocabulary } from '../../../entities/vocabulary/model/types'

export interface VocabularyPageParams {
  q?: string
  filters?: string
  sort?: string
  limit?: number
  offset?: number
}

export const fetchVocabularyPage = (params: VocabularyPageParams): Promise<PaginatedVocabulary> => {
  const search = new URLSearchParams()
  if (params.q)       search.set('q',       params.q)
  if (params.filters) search.set('filters', params.filters)
  if (params.sort)    search.set('sort',    params.sort)
  if (params.limit  !== undefined) search.set('limit',  String(params.limit))
  if (params.offset !== undefined) search.set('offset', String(params.offset))
  const qs = search.toString()
  return apiClient.get(`/vocabulary${qs ? `?${qs}` : ''}`)
}

export const saveWord = (wordId: string): Promise<void> =>
  apiClient.post(`/vocabulary/words/${wordId}`)

export const deleteWord = (wordId: string): Promise<void> =>
  apiClient.delete(`/vocabulary/words/${wordId}`)
