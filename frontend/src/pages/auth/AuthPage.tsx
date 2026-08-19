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

    // Preserve a return destination (e.g. a shared board link that prompted
    // sign-in). Restricted to same-origin relative paths to avoid an open
    // redirect via a crafted ?next= value.
    const next = new URLSearchParams(location.search).get('next')
    const isSafeRelativePath = next && next.startsWith('/') && !next.startsWith('//')
    navigate(isSafeRelativePath ? next : '/home')
  }

  function handleToggle() {
    navigate({
      pathname: mode === 'login' ? '/register' : '/login',
      search: location.search,
    })
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
