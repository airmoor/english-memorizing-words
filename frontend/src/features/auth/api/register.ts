import { apiClient } from '../../../shared/api/base'

export async function registerApi(email: string, password: string): Promise<string> {
  const res = await apiClient.post<{ accessToken: string }>('/auth/register', { email, password })
  return res.accessToken
}
