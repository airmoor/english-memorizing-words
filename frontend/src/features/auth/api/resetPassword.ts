import { apiClient } from '../../../shared/api/base'

export async function resetPasswordApi(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, newPassword })
}
