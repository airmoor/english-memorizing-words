import { useState, type FormEvent } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { resetPasswordApi } from '../../features/auth/api/resetPassword'
import { Card } from '../../shared/ui/Card/Card'
import { Button } from '../../shared/ui/Button/Button'
import { Text } from '../../shared/ui/Typography/Typography'
import { Stack } from '../../shared/ui/Stack/Stack'
import { Logo } from '../../shared/ui/Logo/Logo'
import { PasswordInput } from '../../shared/ui/PasswordInput/PasswordInput'
import styles from './AuthPage.module.css'
import formStyles from '../../features/auth/ui/AuthForm.module.css'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={formStyles.wrapper}>
          <Card padding="lg" className={formStyles.card}>
            <Stack gap="md">
              <Text variant="label" as="p">Invalid link</Text>
              <Text variant="body" color="secondary" as="p">
                This reset link is missing a token. Please request a new one.
              </Text>
              <Link to="/forgot-password" className={formStyles.link}>
                Request new link
              </Link>
            </Stack>
          </Card>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await resetPasswordApi(token, password)
      setSuccess(true)
      // Redirect to login after short delay so user can read the success message
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      // Map common backend errors to friendly messages
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setError('This link has expired or already been used. Please request a new one.')
      } else if (msg.toLowerCase().includes('same') || msg.toLowerCase().includes('differ')) {
        setError('New password must be different from your current password.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={formStyles.wrapper}>
        <Stack gap="md" align="center" className={formStyles.header}>
          <Logo size={44} />
          <Text variant="body" color="secondary">Choose a new password</Text>
        </Stack>

        <Card padding="lg" className={formStyles.card}>
          {success ? (
            <Stack gap="md">
              <Text variant="label" as="p">Password updated!</Text>
              <Text variant="body" color="secondary" as="p">
                Your password has been reset. Redirecting you to log in…
              </Text>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <label className={formStyles.label}>
                  <Text variant="label" as="span">New password</Text>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={formStyles.input}
                    placeholder="Min. 8 characters"
                    required
                    autoFocus
                    autoComplete="new-password"
                  />
                </label>

                <label className={formStyles.label}>
                  <Text variant="label" as="span">Confirm new password</Text>
                  <PasswordInput
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={formStyles.input}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                </label>

                {error && (
                  <Stack gap="xs">
                    <Text variant="caption" color="danger" as="p">{error}</Text>
                    {error.includes('expired') || error.includes('already been used') ? (
                      <Link to="/forgot-password" className={formStyles.link} style={{ fontSize: '0.8rem' }}>
                        Request a new link
                      </Link>
                    ) : null}
                  </Stack>
                )}

                <Button type="submit" fullWidth disabled={loading}>
                  {loading ? 'Updating…' : 'Set new password'}
                </Button>
              </Stack>
            </form>
          )}
        </Card>

        <Text variant="caption" color="secondary" as="p" className={formStyles.toggle}>
          <Link to="/login" className={formStyles.link}>Back to log in</Link>
        </Text>
      </div>
    </div>
  )
}
