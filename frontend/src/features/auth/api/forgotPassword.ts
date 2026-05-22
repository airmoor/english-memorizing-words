import { apiClient } from '../../../shared/api/base'

export async function forgotPasswordApi(email: string): Promise<void> {
  await apiClient.post('/auth/request-password-reset', { email })
}
