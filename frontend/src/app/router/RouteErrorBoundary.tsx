import { isRouteErrorResponse, useRouteError, useNavigate } from 'react-router-dom'
import { Button } from '../../shared/ui/Button/Button'
import { Text } from '../../shared/ui/Typography/Typography'
import { Logo } from '../../shared/ui/Logo/Logo'
import styles from './RouteErrorBoundary.module.css'

/**
 * Catches any render-time throw from the route tree (e.g. a null/undefined
 * dereference in a page or a hook it calls) so the user sees a recoverable
 * screen instead of React Router's raw "Unexpected Application Error" page.
 * Wired as the errorElement on the root route in AppRouter.tsx — every route
 * bubbles up to this one shared boundary.
 */
export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Logo className={styles.logo} size={24} />
        <Text variant="heading" as="h1" className={styles.heading}>
          Something went wrong
        </Text>
        <Text variant="body" color="secondary" className={styles.message}>
          {message}
        </Text>
        <div className={styles.actions}>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <Button variant="secondary" onClick={() => navigate('/home')}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  )
}
