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
 * On settlement invalidates:
 *   - ['saved-status', wordId]  → the per-word saved status on the Search page
 *   - ['vocabulary']            → the vocabulary list / infinite pages
 */
export function useSaveSelectedMeaningsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ wordId, meaningIds }: SaveSelectedMeaningsArgs) =>
      saveWord(wordId, meaningIds),

    onSettled: (_data, _error, { wordId }) => {
      queryClient.invalidateQueries({ queryKey: ['saved-status', wordId] })
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })
}
