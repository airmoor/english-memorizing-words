import { useNavigate, useLocation } from 'react-router-dom'
import { loginApi } from '../../features/auth/api/login'
import { registerApi } from '../../features/auth/api/register'
import { useAuthStore } from '../../features/auth/model/authStore'
import { AuthForm } from '../../features/auth/ui/AuthForm'
import styles from './AuthPage.module.css'

export function AuthPage() {
  const location = useLocation()
  const mode: 'login' | 'register' = location.pathname === '/register' ? 'register' : 'login'

  const setToken = useAuthStore((s) => s.setToken)
  const navigate = useNavigate()

  async function handleSubmit(email: string, password: string) {
    const token = mode === 'login'
      ? await loginApi(email, password)
      : await registerApi(email, password)
    setToken(token)
    navigate('/home')
  }

  function handleToggle() {
    navigate(mode === 'login' ? '/register' : '/login')
  }

  return (
    <div className={styles.page}>
      <AuthForm
        mode={mode}
        onSubmit={handleSubmit}
        onToggle={handleToggle}
      />
    </div>
  )
}
