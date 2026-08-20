import { useParams } from 'react-router-dom'
import { Link } from '../../shared/lib/navigation'
import { useNavigate } from '../../shared/lib/useAppNavigate'
import { Library, Link2 } from 'lucide-react'
import { Icon } from '../../shared/ui/Icon/Icon'
import { Logo } from '../../shared/ui/Logo/Logo'
import { Text } from '../../shared/ui/Typography/Typography'
import { Spinner } from '../../shared/ui/Spinner'
import { Button } from '../../shared/ui/Button/Button'
import { useAuthStore } from '../../features/auth/model/authStore'
import { useSharedBoardQuery, useCloneSharedBoardMutation } from '../../features/boards'
import { SharedWordCard } from '../../features/boards/ui/SharedWordCard'
import { ApiError } from '../../shared/api/base'
import styles from './SharedBoardPage.module.css'

/**
 * Deliberately does NOT use PageLayout/AppHeader — that header assumes an
 * authenticated user (unconditional "Log out" button, nav links behind
 * RequireAuth). This is the app's first fully public page (reachable
 * signed-out), so it gets its own minimal shell — same pattern AuthPage
 * uses for /login and /register.
 */

export function SharedBoardPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  const { data: board, isLoading, isError, error } = useSharedBoardQuery(slug ?? '')
  const cloneMutation = useCloneSharedBoardMutation()

  const handleClone = async () => {
    if (!slug) return
    const result = await cloneMutation.mutateAsync(slug)
    navigate(`/vocabulary?board=${encodeURIComponent(result.id)}`)
  }

  const notFound = isError && error instanceof ApiError && error.status === 404

  return (
    <div className={styles.shell}>
      <header className={styles.shellHeader}>
        <Link to="/" className={styles.logoLink} aria-label="Lexis">
          <Logo />
        </Link>
      </header>

      <main className={styles.page}>
          {(isLoading || !isInitialized) && (
            <div className={styles.centered}><Spinner /></div>
          )}

          {!isLoading && (isError || !board) && (
            <div className={styles.centered}>
              <span className={styles.emptyIcon}><Icon icon={Library} size={32} muted /></span>
              <Text variant="title" as="h1" className={styles.emptyTitle}>
                This board isn&rsquo;t available
              </Text>
              <Text variant="body" color="secondary" as="p" className={styles.emptyText}>
                {notFound
                  ? "The link may be wrong, or the owner isn't sharing this board anymore."
                  : 'Something went wrong loading this board. Please try again.'}
              </Text>
              <Button variant="secondary" onClick={() => navigate('/')}>
                Go to Lexis
              </Button>
            </div>
          )}

          {!isLoading && board && (
            <>
              <div className={styles.header}>
                <div className={styles.headerBadge}>
                  <Icon icon={Link2} size={13} />
                  <span>Shared board</span>
                </div>
                <Text variant="title" as="h1" className={styles.title}>
                  {board.name}
                </Text>
                {board.description && (
                  <Text variant="body" color="secondary" as="p" className={styles.description}>
                    {board.description}
                  </Text>
                )}
                <Text variant="caption" color="secondary" as="p" className={styles.wordCount}>
                  {board.words.length} word{board.words.length !== 1 ? 's' : ''}
                </Text>
              </div>

              <div className={styles.cta}>
                {token ? (
                  <>
                    <Button onClick={handleClone} isLoading={cloneMutation.isPending}>
                      Add to my vocabulary
                    </Button>
                    <Text variant="caption" color="secondary" as="p" className={styles.ctaNote}>
                      You&rsquo;ll get a copy as of today — it won&rsquo;t update automatically.
                    </Text>
                  </>
                ) : isInitialized ? (
                  <>
                    <Button
                      onClick={() => navigate(`/login?next=${encodeURIComponent(`/board/${slug ?? ''}`)}`)}
                    >
                      Sign in to add this board
                    </Button>
                    <Text variant="caption" color="secondary" as="p" className={styles.ctaNote}>
                      You&rsquo;ll come right back here after signing in.
                    </Text>
                  </>
                ) : null}
              </div>

              {board.words.length > 0 ? (
                <ul className={styles.list}>
                  {board.words.map((word) => (
                    <SharedWordCard key={word.wordId} word={word} />
                  ))}
                </ul>
              ) : (
                <Text variant="body" color="secondary" as="p" className={styles.emptyList}>
                  This board doesn&rsquo;t have any words yet.
                </Text>
              )}
            </>
          )}
      </main>
    </div>
  )
}
