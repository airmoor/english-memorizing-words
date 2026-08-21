import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveWord } from '../../word-search/api/wordApi'

interface SaveSelectedMeaningsArgs {
  wordId: string
  /** IDs of the meanings the user selected. Empty = save all. */
  meaningIds: string[]
}

/**
 * Saves a word with only the user-selected meanings.
 *
 * On success, invalidates and *awaits* the refetch of:
 *   - ['saved-status', wordId]  → the per-word saved status on the Search page
 *   - ['vocabulary']            → the vocabulary list / infinite pages
 *
 * Awaiting here (rather than firing invalidateQueries from onSettled without
 * returning it) matters: React Query runs a mutation's hook-level onSuccess
 * before any onSuccess passed to this call's `mutate()`. Callers that clear
 * an optimistic override in their own onSuccess (WordEntry does, to flip the
 * "Saved" badge back to reading real cache data) would otherwise run before
 * the invalidated query had refetched — reading the still-stale pre-save
 * data and flashing back to "unsaved" for a moment.
 */
export function useSaveSelectedMeaningsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ wordId, meaningIds }: SaveSelectedMeaningsArgs) =>
      saveWord(wordId, meaningIds),

    onSuccess: (_data, { wordId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['saved-status', wordId] }),
        queryClient.invalidateQueries({ queryKey: ['vocabulary'] }),
      ]),
  })
}
