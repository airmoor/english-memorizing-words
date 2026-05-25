import { useMutation, useQueryClient } from '@tanstack/react-query'
import { upsertCardNote } from '../api/cardNoteApi'

export function useCardNoteMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, body }: { cardId: string; body: string }) =>
      upsertCardNote(cardId, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })
}
