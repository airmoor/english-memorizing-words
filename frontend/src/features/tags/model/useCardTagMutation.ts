import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  assignTagToCard,
  removeTagFromCard,
  assignTagByName,
} from '../api/tagsApi'
import { TAGS_KEY } from './useTagsQuery'
import { toast } from '../../../shared/ui/Toast'

export function useAssignTagByName() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, name }: { cardId: string; name: string }) =>
      assignTagByName(cardId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      queryClient.invalidateQueries({ queryKey: TAGS_KEY })
    },
    onError: () => {
      toast.error("Couldn't add tag. Please try again.")
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
    onError: () => {
      toast.error("Couldn't add tag. Please try again.")
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
    onError: () => {
      toast.error("Couldn't remove tag. Please try again.")
    },
  })
}
