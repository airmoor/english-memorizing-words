import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProgress } from '../../features/review/api/getProgress'
import { fetchVocabulary } from '../../features/vocabulary/api/vocabularyApi'
import { AppHeader } from '../../shared/ui/AppHeader/AppHeader'
import { Card } from '../../shared/ui/Card/Card'
import { Button } from '../../shared/ui/Button/Button'
import { Text } from '../../shared/ui/Typography/Typography'
import { Spinner } from '../../shared/ui/Spinner'
import { Container } from '../../shared/ui/layout/Container'
import styles from './HomePage.module.css'

export function HomePage() {
  const navigate = useNavigate()

  const progressQuery = useQuery({
    queryKey: ['progress'],
    queryFn: getProgress,
    staleTime: 30_000,
  })

  // Re-uses the existing vocabulary cache key so /vocabulary and /home share one fetch
  const vocabQuery = useQuery({
    queryKey: ['vocabulary'],
    queryFn: fetchVocabulary,
    staleTime: 30_000,
  })

  const isLoading = progressQuery.isPending || vocabQuery.isPending

  const stats = progressQuery.data
  const recent = vocabQuery.data?.slice(0, 5) ?? []

  const dueToday = stats?.dueToday ?? 0
  const reviewedToday = stats?.reviewedToday ?? 0
  const total = stats?.total ?? 0
  const streak = stats?.streak ?? 0

  return (
    <div className={styles.page}>
      <AppHeader />

      <Container as="main">
        <div className={styles.content}>
          {/* Greeting */}
          <Text variant="heading" as="h1" className={styles.greeting}>
            Welcome back
          </Text>

          {isLoading && (
            <div className={styles.loading}><Spinner /></div>
          )}

          {!isLoading && (
            <>
              {/* Hero CTA: due today */}
              <Card padding="lg" className={styles.hero}>
                <div className={styles.heroBody}>
                  {dueToday > 0 ? (
                    <>
                      <Text variant="title" as="h2" className={styles.heroTitle}>
                        {dueToday} card{dueToday !== 1 ? 's' : ''} due today
                      </Text>
                      <Text variant="body" color="secondary" as="p" className={styles.heroSubtitle}>
                        Keep your streak going — review them now.
                      </Text>
                    </>
                  ) : total === 0 ? (
                    <>
                      <Text variant="title" as="h2" className={styles.heroTitle}>
                        Start building your vocabulary
                      </Text>
                      <Text variant="body" color="secondary" as="p" className={styles.heroSubtitle}>
                        Search any English word and save its meanings to begin.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text variant="title" as="h2" className={styles.heroTitle}>
                        You're all caught up 🎉
                      </Text>
                      <Text variant="body" color="secondary" as="p" className={styles.heroSubtitle}>
                        Come back tomorrow for more reviews.
                      </Text>
                    </>
                  )}
                </div>

                <div className={styles.heroActions}>
                  {dueToday > 0 && (
                    <Button onClick={() => navigate('/review')}>Start review</Button>
                  )}
                  <Button variant="secondary" onClick={() => navigate('/search')}>
                    Search words
                  </Button>
                </div>
              </Card>

              {/* Stats grid */}
              <div className={styles.stats}>
                <StatTile
                  icon="🔥"
                  label="Streak"
                  value={streak}
                  unit={streak === 1 ? 'day' : 'days'}
                  accent={streak > 0}
                />
                <StatTile
                  icon="📚"
                  label="Saved"
                  value={total}
                  unit={total === 1 ? 'meaning' : 'meanings'}
                />
                <StatTile
                  icon="✓"
                  label="Reviewed today"
                  value={reviewedToday}
                  unit={reviewedToday === 1 ? 'card' : 'cards'}
                />
                <StatTile
                  icon="⏰"
                  label="Due today"
                  value={dueToday}
                  unit={dueToday === 1 ? 'card' : 'cards'}
                />
              </div>

              {/* Recently saved */}
              {recent.length > 0 && (
                <Card padding="lg" className={styles.recent}>
                  <div className={styles.recentHeader}>
                    <Text variant="title" as="h3">Recently saved</Text>
                    <button
                      onClick={() => navigate('/vocabulary')}
                      className={styles.recentLink}
                    >
                      View all →
                    </button>
                  </div>
                  <ul className={styles.recentList}>
                    {recent.map((entry) => (
                      <li key={entry.userMeaningId} className={styles.recentItem}>
                        <span className={styles.recentWord}>{entry.wordText}</span>
                        {entry.partOfSpeech && (
                          <span className={styles.recentPos}>{entry.partOfSpeech}</span>
                        )}
                        <span className={styles.recentDef}>{entry.definition}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
        </div>
      </Container>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: string
  label: string
  value: number
  unit: string
  accent?: boolean
}) {
  return (
    <Card padding="md" className={[styles.statTile, accent ? styles.statAccent : ''].join(' ')}>
      <div className={styles.statIcon} aria-hidden>{icon}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>
        {label} <span className={styles.statUnit}>· {unit}</span>
      </div>
    </Card>
  )
}
