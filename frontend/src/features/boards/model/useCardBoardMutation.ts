import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { assignCardToBoard, removeCardFromBoard } from '../api/boardsApi'
import { BOARDS_KEY } from './useBoardsQuery'
import { toast } from '../../../shared/ui/Toast'
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

      // Resolve board name from boards cache (may be undefined if cache is cold).
      // BOARDS_KEY is only the prefix — the real cache entries are keyed
      // [...BOARDS_KEY, { includeArchived }], so an exact getQueryData(BOARDS_KEY)
      // never matches. Search all matching entries by prefix instead.
      const boardsEntries = queryClient.getQueriesData<Board[]>({ queryKey: BOARDS_KEY })
      const boardName = boardsEntries
        .flatMap(([, data]) => data ?? [])
        .find((b) => b.id === boardId)?.name ?? ''

      queryClient.setQueriesData<InfiniteData<PaginatedVocabulary>>(
        { queryKey: ['vocabulary'] },
        (old) => {
          // The ['vocabulary'] prefix also matches non-infinite entries (e.g.
          // useWordSuggestions' ['vocabulary', 'suggestion-pool'], a plain
          // PaginatedVocabulary with no `pages`) — skip anything that isn't
          // actually InfiniteData, or `.pages.map` throws and aborts the mutation.
          if (!old || !Array.isArray(old.pages)) return old
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
      toast.error("Couldn't add to board. Please try again.")
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      queryClient.invalidateQueries({ queryKey: BOARDS_KEY })
      // Search page's per-word status cache (5 min staleTime) also embeds
      // board membership — without this, "Add to board" on Search would keep
      // showing the pre-assignment state until that cache naturally expires.
      queryClient.invalidateQueries({ queryKey: ['saved-status'] })
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
          // See matching comment in useAssignCardToBoard — the ['vocabulary']
          // prefix also matches non-infinite entries without a `pages` array.
          if (!old || !Array.isArray(old.pages)) return old
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
      toast.error("Couldn't remove from board. Please try again.")
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      queryClient.invalidateQueries({ queryKey: BOARDS_KEY })
      queryClient.invalidateQueries({ queryKey: ['saved-status'] })
    },
  })
}
