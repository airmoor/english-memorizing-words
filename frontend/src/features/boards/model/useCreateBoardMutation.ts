import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBoard, type CreateBoardDto } from '../api/boardsApi'
import { BOARDS_KEY } from './useBoardsQuery'
import { toast } from '../../../shared/ui/Toast'

export function useCreateBoardMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateBoardDto) => createBoard(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARDS_KEY })
    },
    onError: () => {
      toast.error("Couldn't create board. Please try again.")
    },
  })
}
