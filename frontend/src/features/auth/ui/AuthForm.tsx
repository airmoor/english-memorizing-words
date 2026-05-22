import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../../shared/ui/Card/Card'
import { Button } from '../../../shared/ui/Button/Button'
import { Text } from '../../../shared/ui/Typography/Typography'
import { Stack } from '../../../shared/ui/Stack/Stack'
import { Logo } from '../../../shared/ui/Logo/Logo'
import styles from './AuthForm.module.css'

interface Props {
  mode: 'login' | 'register'
  onSubmit: (email: string, password: string) => Promise<void>
  onToggle: () => void
}

export function AuthForm({ mode, onSubmit, onToggle }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      await onSubmit(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className={styles.wrapper}>
      <Stack gap="md" align="center" className={styles.header}>
        <Logo size={44} />
        <Text variant="body" color="secondary">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </Text>
      </Stack>

      <Card padding="lg" className={styles.card}>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <label className={styles.label}>
              <Text variant="label" as="span">Email</Text>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </label>

            <label className={styles.label}>
              <span className={styles.labelRow}>
                <Text variant="label" as="span">Password</Text>
                {isLogin && (
                  <Link to="/forgot-password" className={styles.forgotLink}>
                    Forgot password?
                  </Link>
                )}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••"
                required
              />
            </label>

            {error && (
              <Text variant="caption" color="danger" as="p">{error}</Text>
            )}

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Please wait…' : isLogin ? 'Log in' : 'Register'}
            </Button>
          </Stack>
        </form>
      </Card>

      <Text variant="caption" color="secondary" as="p" className={styles.toggle}>
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button onClick={onToggle} className={styles.link}>
          {isLogin ? 'Register' : 'Log in'}
        </button>
      </Text>
    </div>
  )
}
