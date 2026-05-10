import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchVocabulary, deleteWord } from '../api/vocabularyApi'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'

export function useVocabulary() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['vocabulary'],
    queryFn: fetchVocabulary,
    staleTime: 30_000,
  })

  const removeMutation = useMutation({
    mutationFn: (wordId: string) => deleteWord(wordId),

    onMutate: async (wordId) => {
      await queryClient.cancelQueries({ queryKey: ['vocabulary'] })

      const prev = queryClient.getQueryData<VocabularyWord[]>(['vocabulary'])

      queryClient.setQueryData<VocabularyWord[]>(['vocabulary'], (old = []) =>
        old.filter((item) => item.wordId !== wordId),
      )

      return { prev }
    },

    onError: (_err, _id, ctx) => {
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
    remove: (wordId: string) => removeMutation.mutate(wordId),
  }
}
