import { apiClient } from '../../../shared/api/base'
import type { TokenResponse } from '../../../entities/auth/model/types'

export async function loginApi(email: string, password: string): Promise<string> {
  const res = await apiClient.post<TokenResponse>('/auth/login', { email, password })
  return res.accessToken
}
