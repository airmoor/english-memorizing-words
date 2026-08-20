import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setBoardVisibility } from '../api/boardsApi'
import { BOARDS_KEY } from './useBoardsQuery'
import { toast } from '../../../shared/ui/Toast'
import type { BoardVisibility } from '../../../entities/board/model/types'

export function useSetBoardVisibilityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: BoardVisibility }) =>
      setBoardVisibility(id, visibility),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARDS_KEY })
    },
    onError: () => {
      toast.error("Couldn't update sharing. Please try again.")
    },
  })
}
