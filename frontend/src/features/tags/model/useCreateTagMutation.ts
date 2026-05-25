import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTag, updateTag, deleteTag } from '../api/tagsApi'
import { TAGS_KEY } from './useTagsQuery'
import { toast } from '../../../shared/ui/Toast'

export function useCreateTagMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createTag({ name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TAGS_KEY }),
    onError: () => { toast.error("Couldn't create tag. Please try again.") },
  })
}

export function useUpdateTagMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateTag(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TAGS_KEY })
      qc.invalidateQueries({ queryKey: ['vocabulary'] })
    },
    onError: () => { toast.error("Couldn't rename tag. Please try again.") },
  })
}

export function useDeleteTagMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TAGS_KEY })
      qc.invalidateQueries({ queryKey: ['vocabulary'] })
    },
    onError: () => { toast.error("Couldn't delete tag. Please try again.") },
  })
}
