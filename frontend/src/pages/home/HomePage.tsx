import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Flame } from 'lucide-react'
import { Icon } from '../../shared/ui/Icon/Icon'
import { getProgress } from '../../features/review/api/getProgress'
import { fetchVocabularyPage } from '../../features/vocabulary/api/vocabularyApi'
import { BoardsHomeSection } from '../../features/boards/ui/BoardsHomeSection'
import { Card } from '../../shared/ui/Card/Card'
import { Button } from '../../shared/ui/Button/Button'
import { Container } from '../../shared/ui/layout/Container'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import { featureFlags } from '../../shared/lib/featureFlags'
import styles from './HomePage.module.css'

// Recent row widths: [wordWidth, posWidth] — varying lengths look natural
const RECENT_ROWS: [number, number][] = [[80, 38], [114, 52], [62, 42], [96, 58], [74, 36]]

function HomePageSkeleton() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <Card variant="flat" padding="lg" className={styles.hero}>
        <div className={styles.skeletonHeroContent}>
          <div className={styles.skeletonLine} style={{ width: '48%' }} />
          <div className={styles.skeletonLine} style={{ width: '72%', height: 15 }} />
          <div className={styles.skeletonLine} style={{ width: '100%', height: 4, marginTop: 8 }} />
        </div>
        <div className={styles.skeletonBtn} />
      </Card>

      {/* Boards */}
      {featureFlags.boardsTags && (
        <Card variant="flat" padding="lg">
          <div className={styles.skeletonBoards}>
            <div className={styles.skeletonBoardsHeader}>
              <div className={styles.skeletonLine} style={{ width: 92, height: 13 }} />
            </div>
            {([88, 112, 72, 96] as const).map((w, i) => (
              <div key={i} className={styles.skeletonBoardsRow}>
                <div className={styles.skeletonBoardsDot} />
                <div className={styles.skeletonLine} style={{ width: w, height: 13, flexShrink: 0 }} />
                <div className={styles.skeletonLine} style={{ width: 44, height: 11, marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recently saved */}
      <Card variant="flat" padding="lg" className={styles.recent}>
        <div className={styles.recentHeader}>
          <div className={styles.skeletonLine} style={{ width: 132, height: 20 }} />
          <div className={styles.skeletonLine} style={{ width: 52, height: 14 }} />
        </div>
        <ul className={styles.recentList}>
          {RECENT_ROWS.map(([wordW, posW], i) => (
            <li key={i} className={styles.recentItem}>
              <div className={styles.skeletonLine} style={{ width: wordW, height: 15 }} />
              <div className={styles.skeletonLine} style={{ width: posW, height: 13 }} />
              <div className={styles.skeletonLine} style={{ height: 13 }} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()

  const progressQuery = useQuery({
    queryKey: ['progress'],
    queryFn: () => getProgress(),
    staleTime: 30_000,
  })

  const vocabQuery = useQuery({
    queryKey: ['vocabulary-home'],
    queryFn: () => fetchVocabularyPage({ sort: 'newest', limit: 5 }),
    staleTime: 30_000,
  })

  const isLoading = progressQuery.isPending || vocabQuery.isPending

  const stats  = progressQuery.data
  const recent = vocabQuery.data?.items ?? []

  const dueToday      = stats?.dueToday      ?? 0
  const reviewedToday = stats?.reviewedToday  ?? 0
  const total         = stats?.total          ?? 0
  const streak        = stats?.streak         ?? 0

  return (
    <PageLayout>
      <Container as="main">
        {isLoading ? (
          <HomePageSkeleton />
        ) : (
          <div className={styles.page}>
            {/* ── 1. Hero CTA ──────────────────────────────────────── */}
            <Card variant="flat" padding="lg" className={styles.hero}>
              <div className={styles.heroBody}>
                {streak > 0 && (
                  <span className={styles.streakPill}>
                    <Icon icon={Flame} size={13} style={{ color: 'var(--color-warning)' }} aria-hidden />
                    {streak} day{streak !== 1 ? 's' : ''}
                  </span>
                )}
                {dueToday > 0 ? (
                  <>
                    <h2 className={styles.heroTitle}>
                      {dueToday} card{dueToday !== 1 ? 's' : ''} due today
                    </h2>
                    <p className={styles.heroSubtitle}>
                      {reviewedToday === 0
                        ? "You haven't reviewed anything yet today."
                        : reviewedToday < dueToday
                          ? `Good progress — ${reviewedToday} done, ${dueToday - reviewedToday} to go.`
                          : 'All done for today. Come back tomorrow.'}
                    </p>
                  </>
                ) : total === 0 ? (
                  <>
                    <h2 className={styles.heroTitle}>Start building your vocabulary</h2>
                    <p className={styles.heroSubtitle}>
                      Search any English word and save its meanings to begin.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className={styles.heroTitle}>You're all caught up 🎉</h2>
                    <p className={styles.heroSubtitle}>Come back tomorrow for more reviews.</p>
                  </>
                )}

                {dueToday > 0 && (
                  <div className={styles.progressRow}>
                    <div
                      className={styles.progress}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={dueToday}
                      aria-valuenow={Math.min(reviewedToday, dueToday)}
                      aria-label="Today's review progress"
                    >
                      <div
                        className={styles.progressFill}
                        style={{ width: `${Math.min(100, (reviewedToday / dueToday) * 100)}%` }}
                      />
                    </div>
                    <span className={styles.progressCount}>
                      {Math.min(reviewedToday, dueToday)} / {dueToday}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.heroActions}>
                {dueToday > 0 && (
                  <Button onClick={() => navigate('/review')}>Start review</Button>
                )}
                {/* Search is the page's single primary action whenever there's
                    no review to start (empty + caught-up states). */}
                <Button
                  variant={dueToday > 0 ? 'secondary' : 'primary'}
                  onClick={() => navigate('/search')}
                >
                  Search words
                </Button>
              </div>
            </Card>

            {/* ── 2. Boards ─────────────────────────────────────────── */}
            {featureFlags.boardsTags && (
              <Card variant="flat" padding="lg">
                <BoardsHomeSection />
              </Card>
            )}

            {/* ── 3. Recently saved ─────────────────────────────────── */}
            {recent.length > 0 && (
              <Card variant="flat" padding="lg" className={styles.recent}>
                <div className={styles.recentHeader}>
                  <div className={styles.recentHeading}>
                    <h3 className={styles.recentTitle}>Recently saved</h3>
                    {/* Mobile-only count (variant B): subtitle under the title. */}
                    {total > 0 && (
                      <p className={styles.recentSubcount}>
                        {total} word{total !== 1 ? 's' : ''} in your vocabulary
                      </p>
                    )}
                  </div>
                  <div className={styles.recentMeta}>
                    {/* Desktop-only count (variant A): grouped with the link. */}
                    {total > 0 && (
                      <span className={styles.recentCount}>{total} word{total !== 1 ? 's' : ''}</span>
                    )}
                    <button
                      onClick={() => navigate('/vocabulary')}
                      className={styles.recentLink}
                    >
                      View all →
                    </button>
                  </div>
                </div>
                <ul className={styles.recentList}>
                  {recent.map((entry) => {
                    const firstMeaning = entry.meanings[0]
                    return (
                      <li key={entry.wordId} className={styles.recentItem}>
                        <span className={styles.recentWord}>{entry.wordText}</span>
                        {firstMeaning?.partOfSpeech && (
                          <span className={styles.recentPos}>{firstMeaning.partOfSpeech}</span>
                        )}
                        {firstMeaning && (
                          <span className={styles.recentDef}>{firstMeaning.definition}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )}
          </div>
        )}
      </Container>
    </PageLayout>
  )
}
