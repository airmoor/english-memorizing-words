import { useState, useMemo, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchVocabulary, saveWord } from '../api/wordApi'

/**
 * Tracks which words the current user has saved.
 *
 * The learning unit is the canonical word — saving a word saves all its
 * meanings as a single vocabulary entry. There is no per-sense saving.
 */
export function useSavedWords() {
  const queryClient = useQueryClient()

  const { data: vocabulary } = useQuery({
    queryKey: ['vocabulary'],
    queryFn: fetchVocabulary,
    staleTime: 30_000,
  })

  // Optimistic set of word IDs added before server confirmation
  const [optimisticIds, setOptimisticIds] = useState<ReadonlySet<string>>(new Set())

  const serverIds = useMemo(
    () => new Set(vocabulary?.map((v) => v.wordId) ?? []),
    [vocabulary],
  )

  const savedIds = useMemo(
    () => new Set([...serverIds, ...optimisticIds]),
    [serverIds, optimisticIds],
  )

  const addOptimistic = useCallback((id: string) => {
    setOptimisticIds((prev) => new Set([...prev, id]))
  }, [])

  const removeOptimistic = useCallback((id: string) => {
    setOptimisticIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const saveMutation = useMutation({
    mutationFn: saveWord,
    onMutate: (wordId) => addOptimistic(wordId),
    onError: (_, wordId) => removeOptimistic(wordId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['vocabulary'] }),
  })

  return {
    isSaved: (wordId: string) => savedIds.has(wordId),
    save: (wordId: string) => saveMutation.mutate(wordId),
    isSaving: saveMutation.isPending,
  }
}
