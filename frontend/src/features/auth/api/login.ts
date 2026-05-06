import { apiClient } from '../../../shared/api/base'

export async function loginApi(email: string, password: string): Promise<string> {
  const res = await apiClient.post<{ accessToken: string }>('/auth/login', { email, password })
  return res.accessToken
}
