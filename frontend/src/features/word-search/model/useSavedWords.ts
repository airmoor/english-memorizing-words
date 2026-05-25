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

  // Key: ['saved-words'] — intentionally separate from the vocabulary page's
  // ['vocabulary', {...}] infinite-query namespace. Both keys share no cache
  // slot, which prevents WordDetailContainer's getQueriesData({ queryKey:
  // ['vocabulary'] }) from receiving a VocabularyWord[] (flat array) and
  // crashing when it tries to iterate `.pages` on it.
  const { data: vocabulary } = useQuery({
    queryKey: ['saved-words'],
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
    onSettled: () => {
      // Refresh own cache so the "saved" button state is up-to-date
      queryClient.invalidateQueries({ queryKey: ['saved-words'] })
      // Also refresh the vocabulary list so it reflects the new word
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })

  /**
   * Returns the meaning IDs saved for a word, or [] if unknown.
   * Used by MeaningPickerSheet to pre-select on re-open.
   * Empty array means "all meanings" (legacy save or word not in cache).
   */
  const getSavedMeaningIds = (wordId: string): string[] => {
    const entry = vocabulary?.find((v) => v.wordId === wordId)
    return entry?.meanings.map((m) => m.id) ?? []
  }

  return {
    isSaved: (wordId: string) => savedIds.has(wordId),
    save: (wordId: string) => saveMutation.mutate(wordId),
    isSaving: saveMutation.isPending,
    getSavedMeaningIds,
  }
}
