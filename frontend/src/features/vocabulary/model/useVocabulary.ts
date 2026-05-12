import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchVocabularyPage, deleteWord } from '../api/vocabularyApi'

export function useVocabulary() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['vocabulary'],
    queryFn: () => fetchVocabularyPage({}),
    staleTime: 30_000,
  })

  const removeMutation = useMutation({
    mutationFn: (wordId: string) => deleteWord(wordId),

    onMutate: async (wordId) => {
      await queryClient.cancelQueries({ queryKey: ['vocabulary'] })
      return { wordId }
    },

    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })

  return {
    items: query.data?.items ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    remove: (wordId: string) => removeMutation.mutate(wordId),
  }
}
