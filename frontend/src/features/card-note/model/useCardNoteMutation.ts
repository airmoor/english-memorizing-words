import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateCardNote } from '../api/cardNoteApi'

export function useCardNoteMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, notes }: { cardId: string; notes: string }) =>
      updateCardNote(cardId, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })
}
