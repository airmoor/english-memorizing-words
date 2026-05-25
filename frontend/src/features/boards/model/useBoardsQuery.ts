import { useQuery } from '@tanstack/react-query'
import { fetchBoards } from '../api/boardsApi'

export const BOARDS_KEY = ['boards'] as const

export function useBoardsQuery(includeArchived = false) {
  return useQuery({
    queryKey: [...BOARDS_KEY, { includeArchived }],
    // fetchBoards returns Board[] directly — no .boards unwrapping needed
    queryFn: () => fetchBoards(includeArchived),
    staleTime: 60_000,
  })
}
