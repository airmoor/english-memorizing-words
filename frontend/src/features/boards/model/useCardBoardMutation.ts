import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { assignCardToBoard, removeCardFromBoard } from '../api/boardsApi'
import { BOARDS_KEY } from './useBoardsQuery'
import type { PaginatedVocabulary } from '../../../entities/vocabulary/model/types'
import type { Board } from '../../../entities/board/model/types'

interface CardBoardArgs {
  boardId: string
  cardId: string
  /** The wordId owning this card — required for optimistic vocab cache update */
  wordId: string
}

export function useAssignCardToBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, cardId }: CardBoardArgs) =>
      assignCardToBoard(boardId, cardId),

    onMutate: async ({ boardId, wordId }) => {
      await queryClient.cancelQueries({ queryKey: ['vocabulary'] })

      const snapshots = queryClient.getQueriesData<InfiniteData<PaginatedVocabulary>>(
        { queryKey: ['vocabulary'] },
      )

      // Resolve board name from boards cache (may be undefined if cache is cold)
      const boards = queryClient.getQueryData<Board[]>(BOARDS_KEY)
      const boardName = boards?.find((b) => b.id === boardId)?.name ?? ''

      queryClient.setQueriesData<InfiniteData<PaginatedVocabulary>>(
        { queryKey: ['vocabulary'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.wordId !== wordId) return item
                // Avoid duplicates if already assigned
                if (item.boards.some((b) => b.id === boardId)) return item
                return {
                  ...item,
                  boards: [...item.boards, { id: boardId, name: boardName }],
                }
              }),
            })),
          }
        },
      )

      return { snapshots }
    },

    onError: (_err, _args, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },

    onSettled: () => {
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

    onMutate: async ({ boardId, wordId }) => {
      await queryClient.cancelQueries({ queryKey: ['vocabulary'] })

      const snapshots = queryClient.getQueriesData<InfiniteData<PaginatedVocabulary>>(
        { queryKey: ['vocabulary'] },
      )

      queryClient.setQueriesData<InfiniteData<PaginatedVocabulary>>(
        { queryKey: ['vocabulary'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.wordId !== wordId) return item
                return {
                  ...item,
                  boards: item.boards.filter((b) => b.id !== boardId),
                }
              }),
            })),
          }
        },
      )

      return { snapshots }
    },

    onError: (_err, _args, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      queryClient.invalidateQueries({ queryKey: BOARDS_KEY })
    },
  })
}
