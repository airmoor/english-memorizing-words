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
 * On success invalidates both caches that track saved words:
 *   - ['saved-words']   → powers the "Save" button state on search results
 *   - ['vocabulary']    → powers the vocabulary list
 */
export function useSaveSelectedMeaningsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ wordId, meaningIds }: SaveSelectedMeaningsArgs) =>
      saveWord(wordId, meaningIds),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-words'] })
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })
}
