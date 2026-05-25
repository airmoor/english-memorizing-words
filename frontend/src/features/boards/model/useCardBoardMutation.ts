import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assignCardToBoard, removeCardFromBoard } from '../api/boardsApi'
import { BOARDS_KEY } from './useBoardsQuery'

interface CardBoardArgs {
  boardId: string
  cardId: string
  /** Optimistic: the wordId owning this card, for vocab cache update */
  wordId?: string
}

export function useAssignCardToBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, cardId }: CardBoardArgs) =>
      assignCardToBoard(boardId, cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      queryClient.invalidateQueries({ queryKey: BOARDS_KEY })
    },
  })
}

export function useRemoveCardFromBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, cardId }: CardBoardArgs) =>
      removeCardFromBoard(boardId, cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      queryClient.invalidateQueries({ queryKey: BOARDS_KEY })
    },
  })
}
