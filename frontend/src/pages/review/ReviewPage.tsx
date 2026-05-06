import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getNextCard } from '../../features/review/api/getNextCard'
import { useAuth } from '../../features/auth/model/AuthContext'
import { useTheme } from '../../shared/design/ThemeProvider'
import { ProgressHeader } from '../../features/review/ui/ProgressHeader'
import { Flashcard } from '../../features/review/ui/Flashcard'
import { Spinner } from '../../shared/ui/Spinner'
import { Text } from '../../shared/ui/Typography/Typography'
import styles from './ReviewPage.module.css'

export function ReviewPage() {
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const { data: card, isPending, isError, error } = useQuery({
    queryKey: ['nextCard'],
    queryFn: getNextCard,
  })

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <ProgressHeader />
        <div className={styles.headerActions}>
          <button
            onClick={toggleTheme}
            className={styles.themeToggle}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={handleLogout} className={styles.logout}>
            Log out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {isPending && <Spinner />}

        {isError && (
          <Text variant="body" color="danger" as="p">
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </Text>
        )}

        {!isPending && !isError && card === null && (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>🎉</p>
            <Text variant="title" as="h2">No cards due today!</Text>
            <Text variant="body" color="secondary" as="p" className={styles.emptyText}>
              Come back tomorrow to keep your streak going.
            </Text>
          </div>
        )}

        {card && <Flashcard key={card.cardId} card={card} />}
      </main>
    </div>
  )
}
