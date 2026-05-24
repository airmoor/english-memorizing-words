import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchVocabularyPage, deleteWord } from '../api/vocabularyApi'

export function useVocabulary() {
  const queryClient = useQueryClient()

  // Key intentionally differs from the infinite-query ['vocabulary', {...}] key
  // to avoid shape collisions in the query cache.
  // NOTE: this hook is currently unused; kept for potential future use.
  const query = useQuery({
    queryKey: ['vocabulary', 'all'],
    queryFn: () => fetchVocabularyPage({}),
    staleTime: 30_000,
  })

  const removeMutation = useMutation({
    mutationFn: (wordId: string) => deleteWord(wordId),

    onMutate: async (wordId) => {
      await queryClient.cancelQueries({ queryKey: ['vocabulary', 'all'] })
      return { wordId }
    },

    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary', 'all'] })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary', 'all'] })
    },
  })

  return {
    items: query.data?.items ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    remove: (wordId: string) => removeMutation.mutate(wordId),
  }
}
