import { useQuery } from '@tanstack/react-query'
import { fetchBoards } from '../api/boardsApi'
import type { Board } from '../../../entities/board/model/types'

export const BOARDS_KEY = ['boards'] as const

export function useBoardsQuery(includeArchived = false) {
  return useQuery({
    queryKey: [...BOARDS_KEY, { includeArchived }],
    queryFn: () => fetchBoards(includeArchived).then((r) => r.boards),
    staleTime: 60_000,
    select: (boards: Board[]) => boards,
  })
}
