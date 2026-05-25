import { useQuery } from '@tanstack/react-query'
import { fetchTags } from '../api/tagsApi'

export const TAGS_KEY = ['tags'] as const

export function useTagsQuery() {
  return useQuery({
    queryKey: TAGS_KEY,
    queryFn: () => fetchTags(),
    staleTime: 60_000,
  })
}
