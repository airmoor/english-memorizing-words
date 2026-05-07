import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../../shared/api/base'
import { useAuthStore } from './authStore'

export function useLogout() {
  const clearToken = useAuthStore((s) => s.clearToken)
  const navigate = useNavigate()

  return async function logout() {
    await apiClient.post<void>('/auth/logout').catch(() => {})
    clearToken()
    navigate('/')
  }
}
