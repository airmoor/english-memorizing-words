import { apiClient } from '../../../shared/api/base'

export interface Profile {
  id: string
  email: string
  nativeLanguageCode: string | null
}

export const fetchProfile = (): Promise<Profile> =>
  apiClient.get<Profile>('/users/me')

export const updateNativeLanguage = (
  nativeLanguageCode: string | null,
): Promise<Profile> =>
  apiClient.patch<Profile>('/users/me', { nativeLanguageCode })
