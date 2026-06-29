import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProfile, updateNativeLanguage, type Profile } from '../api/profileApi'

/** The current user's profile, including their native language code. */
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 5 * 60_000,
  })
}

/** Mutation to set the native language; writes the result straight into cache. */
export function useUpdateNativeLanguage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string | null) => updateNativeLanguage(code),
    onSuccess: (profile: Profile) => {
      queryClient.setQueryData(['profile'], profile)
      // Translations are language-scoped — drop cached glosses for the old language.
      queryClient.invalidateQueries({ queryKey: ['translation'] })
    },
  })
}
