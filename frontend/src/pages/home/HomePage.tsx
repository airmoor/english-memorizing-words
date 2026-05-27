import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Flame, BookOpen, Check, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Icon } from '../../shared/ui/Icon/Icon'
import { getProgress } from '../../features/review/api/getProgress'
import { fetchVocabularyPage } from '../../features/vocabulary/api/vocabularyApi'
import { BoardsHomeSection } from '../../features/boards/ui/BoardsHomeSection'
import { Card } from '../../shared/ui/Card/Card'
import { Button } from '../../shared/ui/Button/Button'
import { Text } from '../../shared/ui/Typography/Typography'
import { Container } from '../../shared/ui/layout/Container'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import { DashboardGrid, DashboardCell } from '../../shared/ui/layout/DashboardGrid'
import { featureFlags } from '../../shared/lib/featureFlags'
import styles from './HomePage.module.css'

// Skeleton label widths approximate real StatTile label lengths
const STAT_LABEL_WIDTHS = [68, 52, 104, 72]
// Recent row widths: [wordWidth, posWidth] — varying lengths look natural
const RECENT_ROWS: [number, number][] = [[80, 38], [114, 52], [62, 42], [96, 58], [74, 36]]

function HomePageSkeleton() {
  return (
    <>
      {/* Hero */}
      <DashboardCell span="full">
        <Card padding="lg" variant="flat" className={styles.hero}>
          <div className={styles.skeletonHeroContent}>
            <div className={styles.skeletonLine} style={{ width: '48%' }} />
            <div className={styles.skeletonLine} style={{ width: '72%', height: 15 }} />
          </div>
          <div className={styles.skeletonBtn} />
        </Card>
      </DashboardCell>

      {/* Boards — same position as the loaded boards card */}
      {featureFlags.boardsTags && (
        <DashboardCell span="full">
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
        </DashboardCell>
      )}

      {/* Stats */}
      <DashboardCell span="auto">
        <div className={styles.stats}>
          {STAT_LABEL_WIDTHS.map((w, i) => (
            <Card key={i} variant="flat" padding="md" className={styles.statTile}>
              <div className={styles.skeletonIcon} />
              <div className={styles.skeletonNum} />
              <div className={styles.skeletonLine} style={{ width: w }} />
            </Card>
          ))}
        </div>
      </DashboardCell>

      {/* Recent words */}
      <DashboardCell>
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
      </DashboardCell>
    </>
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

  const dueToday = stats?.dueToday ?? 0
  const reviewedToday = stats?.reviewedToday ?? 0
  const total = stats?.total ?? 0
  const streak = stats?.streak ?? 0

  return (
    <PageLayout>
      <Container as="main">
        <DashboardGrid>
          {isLoading ? (
            <HomePageSkeleton />
          ) : (
            <>
              {/* Hero CTA: due today — always full width */}
              <DashboardCell span="full" className={styles.contentCell}>
                <Card padding="lg" variant="flat" className={styles.hero}>
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
              </DashboardCell>

              {/* Your boards — quick re-entry into active collections */}
              {featureFlags.boardsTags && (
                <DashboardCell span="full" className={styles.contentCell}>
                  <Card variant="flat" padding="lg">
                    <BoardsHomeSection />
                  </Card>
                </DashboardCell>
              )}

              {/* Stats — Bento left column on desktop, full-width stack on mobile */}
              <DashboardCell span={recent.length === 0 ? 'full' : 'auto'} className={styles.contentCell}>
                <div className={styles.stats}>
                  {streak === 0 ? (
                    <Card variant="flat" padding="md" className={styles.statTile}>
                      <div className={styles.streakEmptyPrimary}>Start today</div>
                      <div className={styles.streakEmptySecondary}>Review cards to begin your streak</div>
                    </Card>
                  ) : (
                    <StatTile
                      icon={Flame}
                      label="Streak"
                      value={streak}
                      unit={streak === 1 ? 'day' : 'days'}
                      accent={streak > 0}
                    />
                  )}
                  <StatTile
                    icon={BookOpen}
                    label="Saved"
                    value={total}
                    unit={total === 1 ? 'meaning' : 'meanings'}
                  />
                  <StatTile
                    icon={Check}
                    label="Reviewed today"
                    value={reviewedToday}
                    unit={reviewedToday === 1 ? 'card' : 'cards'}
                  />
                  <StatTile
                    icon={Clock}
                    label="Due today"
                    value={dueToday}
                    unit={dueToday === 1 ? 'card' : 'cards'}
                  />
                </div>
              </DashboardCell>

              {/* Recently saved — Bento right column on desktop */}
              {recent.length > 0 && (
                <DashboardCell className={styles.contentCell}>
                  <Card variant="flat" padding="lg" className={styles.recent}>
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
                </DashboardCell>
              )}
            </>
          )}
        </DashboardGrid>
      </Container>
    </PageLayout>
  )
}

function StatTile({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: number
  unit: string
  accent?: boolean
}) {
  return (
    <Card variant="flat" padding="md" className={[styles.statTile, accent ? styles.statAccent : ''].join(' ')}>
      <div className={styles.statIcon} aria-hidden>
        <Icon icon={icon} size={18} muted />
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>
        {label} <span className={styles.statUnit}>· {unit}</span>
      </div>
    </Card>
  )
}
