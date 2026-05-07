import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginApi } from '../../features/auth/api/login'
import { registerApi } from '../../features/auth/api/register'
import { useAuthStore } from '../../features/auth/model/authStore'
import { AuthForm } from '../../features/auth/ui/AuthForm'
import styles from './AuthPage.module.css'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const setToken = useAuthStore((s) => s.setToken)
  const navigate = useNavigate()

  async function handleSubmit(email: string, password: string) {
    const token = mode === 'login'
      ? await loginApi(email, password)
      : await registerApi(email, password)
    setToken(token)
    navigate('/search')
  }

  return (
    <div className={styles.page}>
      <AuthForm
        mode={mode}
        onSubmit={handleSubmit}
        onToggle={() => setMode(mode === 'login' ? 'register' : 'login')}
      />
    </div>
  )
}
