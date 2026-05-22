import { apiClient } from '../../../shared/api/base'

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiClient.post('/auth/update-password', { currentPassword, newPassword })
}
