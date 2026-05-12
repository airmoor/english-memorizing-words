import { useQuery, keepPreviousData } from '@tanstack/react-query'
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
    placeholderData: keepPreviousData,
  })

  if (!query) return { status: 'idle' }
  // isPending is only true when there is genuinely no data yet (including no
  // placeholder). With keepPreviousData, switching queries keeps the previous
  // result visible instead of flashing the spinner.
  if (isPending) return { status: 'loading' }
  if (isError) {
    if (error instanceof ApiError && error.status === 404) return { status: 'notFound' }
    if (error instanceof ApiError && error.status === 503) return { status: 'unavailable' }
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
  }
  if (data) return { status: 'success', word: data }
  return { status: 'idle' }
}
