import { apiClient } from '../../../shared/api/base'
import type { PaginatedVocabulary } from '../../../entities/vocabulary/model/types'
import type { VocabularyFilters } from '../../../entities/vocabulary/model/filters'

export interface VocabularyPageParams {
  q?: string
  /** Legacy comma-separated filter string (kept for backwards compat) */
  filters?: string
  sort?: string
  limit?: number
  offset?: number
  /** Structured API filters (boards-tags-review-v2) */
  apiFilters?: VocabularyFilters
}

// apiClient resolves an empty 2xx body to `null` (see shared/api/base.ts) —
// a valid contract for single-resource endpoints, but every caller here
// destructures PaginatedVocabulary's fields directly (items.find, etc.), so
// coerce that edge case to an honestly-empty page rather than leaking null.
const EMPTY_PAGE: PaginatedVocabulary = { items: [], total: 0, totalCount: 0, hasMore: false }

export const fetchVocabularyPage = async (params: VocabularyPageParams): Promise<PaginatedVocabulary> => {
  const search = new URLSearchParams()
  if (params.q)       search.set('q',       params.q)
  if (params.filters) search.set('filters', params.filters)
  if (params.sort)    search.set('sort',    params.sort)
  if (params.limit  !== undefined) search.set('limit',  String(params.limit))
  if (params.offset !== undefined) search.set('offset', String(params.offset))

  const f = params.apiFilters
  if (f) {
    if (f.boardId)       search.set('boardId',       f.boardId)
    if (f.tagIds?.length) search.set('tagIds',       f.tagIds.join(','))
    if (f.reviewState)   search.set('reviewState',   f.reviewState)
    if (f.partOfSpeech)  search.set('partOfSpeech',  f.partOfSpeech)
    if (f.sortDir)       search.set('sortDir',        f.sortDir)
  }

  const qs = search.toString()
  const page = await apiClient.get<PaginatedVocabulary | null>(`/vocabulary${qs ? `?${qs}` : ''}`)
  return page ?? EMPTY_PAGE
}

export const saveWord = (wordId: string): Promise<void> =>
  apiClient.post(`/vocabulary/words/${wordId}`)

export const deleteWord = (wordId: string): Promise<void> =>
  apiClient.delete(`/vocabulary/words/${wordId}`)
