import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneSharedBoard } from '../api/boardsApi'
import { BOARDS_KEY } from './useBoardsQuery'
import { toast } from '../../../shared/ui/Toast'

export function useCloneSharedBoardMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) => cloneSharedBoard(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARDS_KEY })
    },
    onError: () => {
      toast.error("Couldn't add this board. Please try again.")
    },
  })
}
