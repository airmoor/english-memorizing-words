import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchVocabulary, deleteMeaning } from '../api/vocabularyApi'
import type { VocabularyEntry } from '../../../entities/word/model/types'

export function useVocabulary() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['vocabulary'],
    queryFn: fetchVocabulary,
    staleTime: 30_000,
  })

  const removeMutation = useMutation({
    mutationFn: (meaningId: string) => deleteMeaning(meaningId),

    onMutate: async (meaningId) => {
      // Cancel any in-flight refetch so it doesn't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey: ['vocabulary'] })

      const prev = queryClient.getQueryData<VocabularyEntry[]>(['vocabulary'])

      queryClient.setQueryData<VocabularyEntry[]>(['vocabulary'], (old = []) =>
        old.filter((item) => item.meaningId !== meaningId),
      )

      return { prev }
    },

    onError: (_err, _id, ctx) => {
      // Roll back on failure
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(['vocabulary'], ctx.prev)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })

  return {
    items: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    remove: (meaningId: string) => removeMutation.mutate(meaningId),
  }
}
