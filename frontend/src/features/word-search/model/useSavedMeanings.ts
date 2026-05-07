import { useState, useMemo, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchVocabulary, saveMeaning, saveAllMeanings } from '../api/wordApi'

export function useSavedMeanings() {
  const queryClient = useQueryClient()

  // Server-authoritative list of saved meaning IDs
  const { data: vocabulary } = useQuery({
    queryKey: ['vocabulary'],
    queryFn: fetchVocabulary,
    staleTime: 30_000,
  })

  // Optimistic local additions not yet confirmed by server
  const [optimisticIds, setOptimisticIds] = useState<ReadonlySet<string>>(new Set())

  const serverIds = useMemo(
    () => new Set(vocabulary?.map((v) => v.meaningId) ?? []),
    [vocabulary],
  )

  // Union of server state and optimistic additions
  const savedIds = useMemo(
    () => new Set([...serverIds, ...optimisticIds]),
    [serverIds, optimisticIds],
  )

  const addOptimistic = useCallback((ids: string[]) => {
    setOptimisticIds((prev) => new Set([...prev, ...ids]))
  }, [])

  const removeOptimistic = useCallback((ids: string[]) => {
    setOptimisticIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }, [])

  const saveMutation = useMutation({
    mutationFn: saveMeaning,
    onMutate: (meaningId) => addOptimistic([meaningId]),
    onError: (_, meaningId) => removeOptimistic([meaningId]),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['vocabulary'] }),
  })

  const saveAllMutation = useMutation({
    mutationFn: ({ wordId }: { wordId: string; meaningIds: string[] }) =>
      saveAllMeanings(wordId),
    onMutate: ({ meaningIds }) => addOptimistic(meaningIds),
    onError: (_, { meaningIds }) => removeOptimistic(meaningIds),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['vocabulary'] }),
  })

  return {
    savedIds,
    isSaved: (id: string) => savedIds.has(id),
    save: (meaningId: string) => saveMutation.mutate(meaningId),
    saveAll: (wordId: string, meaningIds: string[]) =>
      saveAllMutation.mutate({ wordId, meaningIds }),
    isSavingAll: saveAllMutation.isPending,
    allSaved: (meaningIds: string[]) =>
      meaningIds.length > 0 && meaningIds.every((id) => savedIds.has(id)),
  }
}
