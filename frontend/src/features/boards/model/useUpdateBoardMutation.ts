import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateBoard, deleteBoard, type UpdateBoardDto } from '../api/boardsApi'
import { BOARDS_KEY } from './useBoardsQuery'
import { toast } from '../../../shared/ui/Toast'

export function useUpdateBoardMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBoardDto }) => updateBoard(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARDS_KEY })
    },
    onError: () => {
      toast.error("Couldn't update board. Please try again.")
    },
  })
}

export function useDeleteBoardMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBoard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARDS_KEY })
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
    },
    onError: () => {
      toast.error("Couldn't delete board. Please try again.")
    },
  })
}
