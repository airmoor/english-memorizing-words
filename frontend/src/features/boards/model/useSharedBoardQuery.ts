import { useQuery } from '@tanstack/react-query'
import { fetchSharedBoard } from '../api/boardsApi'
import { ApiError } from '../../../shared/api/base'

export function useSharedBoardQuery(slug: string) {
  return useQuery({
    queryKey: ['shared-board', slug],
    queryFn: () => fetchSharedBoard(slug),
    staleTime: 60_000,
    retry: (failureCount, error) => {
      // A 404 means "not shared" — retrying won't change that.
      if (error instanceof ApiError && error.status === 404) return false
      return failureCount < 2
    },
  })
}
