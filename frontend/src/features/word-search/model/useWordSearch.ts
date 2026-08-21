import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../../shared/api/base'
import { fetchWord } from '../api/wordApi'
import type { WordResult } from '../../../entities/word/model/types'

export type SearchStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }
  | { status: 'success'; word: WordResult }

export function useWordSearch(query: string): SearchStatus {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['word', query],
    queryFn: () => fetchWord(query),
    enabled: query.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  if (!query) return { status: 'idle' }
  // No keepPreviousData: each query key is a different word, not a page of
  // the same list, so carrying the old word's data across a query-key change
  // would render it — full meanings, examples, save state — under the new
  // search term until the fetch resolves. staleTime already makes revisiting
  // an already-fetched word instant, which is the only case worth avoiding a
  // spinner for.
  if (isPending) return { status: 'loading' }
  if (isError) {
    if (error instanceof ApiError && error.status === 404) return { status: 'notFound' }
    if (error instanceof ApiError && error.status === 503) return { status: 'unavailable' }
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
  }
  if (data) return { status: 'success', word: data }
  return { status: 'idle' }
}
