import { apiClient } from '../../../shared/api/base'
import type { TokenResponse } from '../../../entities/auth/model/types'

export async function registerApi(email: string, password: string): Promise<string> {
  const res = await apiClient.post<TokenResponse>('/auth/register', { email, password })
  return res.accessToken
}
