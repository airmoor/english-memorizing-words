import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  assignTagToCard,
  removeTagFromCard,
  assignTagByName,
} from '../api/tagsApi'
import { TAGS_KEY } from './useTagsQuery'

export function useAssignTagByName() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, name }: { cardId: string; name: string }) =>
      assignTagByName(cardId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      queryClient.invalidateQueries({ queryKey: TAGS_KEY })
    },
  })
}

export function useAssignTagToCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, tagId }: { cardId: string; tagId: string }) =>
      assignTagToCard(cardId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      queryClient.invalidateQueries({ queryKey: TAGS_KEY })
    },
  })
}

export function useRemoveTagFromCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, tagId }: { cardId: string; tagId: string }) =>
      removeTagFromCard(cardId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      queryClient.invalidateQueries({ queryKey: TAGS_KEY })
    },
  })
}
