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

  // Board-scoped (or global) unfiltered total — always provided by the backend
  // so "X of Y words" works correctly even on direct URL loads with filters.
  const contextTotal: number = infiniteQuery.data?.pages[0]?.totalCount ?? 0

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
          // The ['vocabulary'] prefix also matches non-infinite entries (e.g.
          // useWordSuggestions' ['vocabulary', 'suggestion-pool'], a plain
          // PaginatedVocabulary with no `pages`) — skip anything that isn't
          // actually InfiniteData, or `.pages.some/.map` throws and aborts the mutation.
          if (!old || !Array.isArray(old.pages)) return old
          // Only update cache entries that actually contain this word.
          // Queries for other boards/filters may not have it — decrementing
          // their totals would corrupt their counts.
          const wordExists = old.pages.some((p) =>
            p.items.some((item) => item.wordId === wordId),
          )
          if (!wordExists) return old
          return {
            ...old,
            pages: old.pages.map((page, i) => ({
              ...page,
              items: page.items.filter((item) => item.wordId !== wordId),
              // Only decrement counts on the first page — it's the canonical
              // source for both totals. Other pages carry the same values.
              total:      i === 0 ? Math.max(page.total - 1, 0)      : page.total,
              totalCount: i === 0 ? Math.max(page.totalCount - 1, 0) : page.totalCount,
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

    onSettled: (_data, _err, wordId) => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      // Invalidate the per-word saved status so the Search page badge resets
      // if the user looks up this word again after removing it.
      queryClient.invalidateQueries({ queryKey: ['saved-status', wordId] })
    },
  })

  return {
    items,
    total,
    contextTotal,
    isLoading:          infiniteQuery.isPending,
    isError:            infiniteQuery.isError,
    isFetching:         infiniteQuery.isFetching,
    isPlaceholderData:  infiniteQuery.isPlaceholderData,
    hasNextPage:        infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    fetchNextPage:      infiniteQuery.fetchNextPage,
    remove:             (wordId: string) => removeMutation.mutate(wordId),
  }
}
