import { useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { fetchVocabularyPage, deleteWord } from '../api/vocabularyApi'
import type { PaginatedVocabulary, VocabularyWord } from '../../../entities/vocabulary/model/types'
import type { VocabularyFilter, SortOption } from './cardState'
import type { VocabularyFilters } from '../../../entities/vocabulary/model/filters'

const PAGE_SIZE = 50

export interface VocabularyQueryParams {
  query: string
  activeFilters: VocabularyFilter[]
  sort: SortOption
  /** Structured API filters (boards-tags-review-v2) */
  apiFilters?: VocabularyFilters
}

export function useVocabularyInfinite(params: VocabularyQueryParams) {
  const queryClient = useQueryClient()
  const { query, activeFilters, sort, apiFilters } = params

  const filtersKey = activeFilters.join(',')
  const queryKey   = ['vocabulary', { query, filters: filtersKey, sort, apiFilters }] as const

  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchVocabularyPage({
        q:          query || undefined,
        filters:    filtersKey || undefined,
        sort:       sort !== 'newest' ? sort : undefined,
        limit:      PAGE_SIZE,
        offset:     pageParam as number,
        apiFilters: apiFilters,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const fetched = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return lastPage.hasMore ? fetched : undefined
    },
    staleTime: 30_000,
    // Keep the previous filter's results visible while the new query loads.
    // Prevents the vocabulary list from flashing empty on every filter change.
    placeholderData: keepPreviousData,
  })

  const items: VocabularyWord[] =
    infiniteQuery.data?.pages.flatMap((p) => p.items) ?? []

  const total: number = infiniteQuery.data?.pages[0]?.total ?? 0

  const removeMutation = useMutation({
    mutationFn: deleteWord,

    onMutate: async (wordId: string) => {
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
              items: page.items.filter((item) => item.wordId !== wordId),
              total: Math.max(page.total - 1, 0),
            })),
          }
        },
      )

      return { snapshots }
    },

    onError: (_err, _wordId, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      // Also refresh the saved-words cache used by the search page "Save" button
      queryClient.invalidateQueries({ queryKey: ['saved-words'] })
    },
  })

  return {
    items,
    total,
    isLoading:         infiniteQuery.isPending,
    isError:           infiniteQuery.isError,
    hasNextPage:       infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    fetchNextPage:     infiniteQuery.fetchNextPage,
    remove:            (wordId: string) => removeMutation.mutate(wordId),
  }
}
