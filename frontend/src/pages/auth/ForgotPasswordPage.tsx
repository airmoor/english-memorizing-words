import { useState, type FormEvent } from 'react'
import { Link } from '../../shared/lib/navigation'
import { forgotPasswordApi } from '../../features/auth/api/forgotPassword'
import { Card } from '../../shared/ui/Card/Card'
import { Button } from '../../shared/ui/Button/Button'
import { Text } from '../../shared/ui/Typography/Typography'
import { Stack } from '../../shared/ui/Stack/Stack'
import { Logo } from '../../shared/ui/Logo/Logo'
import styles from './AuthPage.module.css'
import formStyles from '../../features/auth/ui/AuthForm.module.css'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await forgotPasswordApi(email)
      setSubmitted(true)
    } catch {
      // Show generic error to avoid leaking state
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={formStyles.wrapper}>
        <Stack gap="md" align="center" className={formStyles.header}>
          <Logo size={44} />
          <Text variant="body" color="secondary">Reset your password</Text>
        </Stack>

        <Card variant="flat" padding="lg" className={formStyles.card}>
          {submitted ? (
            <Stack gap="md">
              <Stack gap="xs">
                <Text variant="label" as="p">Check your inbox</Text>
                <Text variant="body" color="secondary" as="p">
                  If an account with <strong>{email}</strong> exists, we've sent a reset
                  link. It expires in 30 minutes.
                </Text>
              </Stack>
              <Text variant="caption" color="secondary" as="p">
                Didn't receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setSubmitted(false)}
                  className={formStyles.link}
                >
                  try again
                </button>.
              </Text>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <Text variant="body" color="secondary" as="p">
                  Enter your account email and we'll send a reset link.
                </Text>
                <label className={formStyles.label}>
                  <Text variant="label" as="span">Email</Text>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={formStyles.input}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </label>

                {error && (
                  <Text variant="caption" color="danger" as="p">{error}</Text>
                )}

                <Button type="submit" fullWidth disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
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
