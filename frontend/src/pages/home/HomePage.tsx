import { useNavigate } from '../../shared/lib/useAppNavigate'
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
import { Crossfade } from '../../shared/ui/Crossfade/Crossfade'
import { featureFlags } from '../../shared/lib/featureFlags'
import type { ReviewProgress } from '../../entities/review/model/types'
import type { VocabularyWord } from '../../entities/vocabulary/model/types'
import styles from './HomePage.module.css'

function HeroSkeleton() {
  return (
    <div className={styles.heroInner} aria-hidden="true">
      <div className={styles.heroBody}>
        <h2 className={styles.heroTitle}>
          <span className={styles.skeletonText}>1 card due today</span>
        </h2>
        <p className={styles.heroSubtitle}>
          <span className={styles.skeletonText}>You haven't reviewed anything yet today.</span>
        </p>
        <div className={styles.progressRow}>
          <div className={styles.progress} />
          <span className={styles.progressCount}>
            <span className={styles.skeletonText}>0 / 1</span>
          </span>
        </div>
      </div>
      <div className={styles.heroActions}>
        <span className={styles.skeletonBtn}>Start review</span>
        <span className={styles.skeletonBtn}>Search words</span>
      </div>
    </div>
  )
}

function HeroContent({
  stats,
  onReview,
  onSearch,
}: {
  stats: ReviewProgress | undefined
  onReview: () => void
  onSearch: () => void
}) {
  const dueToday      = stats?.dueToday      ?? 0
  const reviewedToday = stats?.reviewedToday  ?? 0
  const total         = stats?.total          ?? 0
  const streak        = stats?.streak         ?? 0

  return (
    <div className={styles.heroInner}>
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
          <Button onClick={onReview}>Start review</Button>
        )}
        {/* Search is the page's single primary action whenever there's
            no review to start (empty + caught-up states). */}
        <Button
          variant={dueToday > 0 ? 'secondary' : 'primary'}
          onClick={onSearch}
        >
          Search words
        </Button>
      </div>
    </div>
  )
}

function RecentSkeleton() {
  return (
    <div aria-hidden="true">
      <div className={styles.recentHeader}>
        <div className={styles.recentHeading}>
          <h3 className={styles.recentTitle}>
            <span className={styles.skeletonText}>Recently saved</span>
          </h3>
        </div>
      </div>
      <ul className={styles.recentList}>
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className={styles.recentItem}>
            <span className={styles.recentWord}>
              <span className={styles.skeletonText}>word</span>
            </span>
            <span className={styles.recentPos}>
              <span className={styles.skeletonText}>noun</span>
            </span>
            <span className={styles.recentDef}>
              <span className={styles.skeletonText}>A short placeholder definition</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RecentBody({
  recent,
  total,
  onViewAll,
}: {
  recent: VocabularyWord[]
  total: number
  onViewAll: () => void
}) {
  return (
    <>
      <div className={styles.recentHeader}>
        <div className={styles.recentHeading}>
          <h3 className={styles.recentTitle}>Recently saved</h3>
          {total > 0 && (
            <p className={styles.recentSubcount}>
              {total} word{total !== 1 ? 's' : ''} in your vocabulary
            </p>
          )}
        </div>
        <div className={styles.recentMeta}>
          {total > 0 && (
            <span className={styles.recentCount}>{total} word{total !== 1 ? 's' : ''}</span>
          )}
          <button onClick={onViewAll} className={styles.recentLink}>
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

  const recent = vocabQuery.data?.items ?? []
  const total  = progressQuery.data?.total ?? 0

  return (
    <PageLayout>
      <Container as="main">
        <div className={styles.page}>
          {/* ── 1. Hero CTA ──────────────────────────────────────── */}
          <Card
            variant="flat"
            padding="lg"
            className={styles.hero}
            aria-busy={progressQuery.isPending || undefined}
          >
            <Crossfade ready={!progressQuery.isPending} fallback={<HeroSkeleton />}>
              <HeroContent
                stats={progressQuery.data}
                onReview={() => navigate('/review')}
                onSearch={() => navigate('/search')}
              />
            </Crossfade>
          </Card>

          {/* ── 2. Boards ─────────────────────────────────────────── */}
          {featureFlags.boardsTags && (
            <Card variant="flat" padding="lg">
              <BoardsHomeSection />
            </Card>
          )}

          {/* ── 3. Recently saved — gated on progressQuery's `total`
              (cards are 1:1 with saved words) rather than on vocabQuery
              itself, so we know whether this section will be non-empty
              before its own data has loaded. That lets an existing user's
              always-there section reserve its space and skeleton in like
              the hero above, while a genuinely empty vocabulary (total
              stays 0) still never mounts a card that would just collapse. */}
          {!progressQuery.isPending && total > 0 && (
            <Card
              variant="flat"
              padding="lg"
              className={styles.recent}
              aria-busy={vocabQuery.isPending || undefined}
            >
              <Crossfade ready={!vocabQuery.isPending} fallback={<RecentSkeleton />}>
                <RecentBody
                  recent={recent}
                  total={total}
                  onViewAll={() => navigate('/vocabulary')}
                />
              </Crossfade>
            </Card>
          )}
        </div>
      </Container>
    </PageLayout>
  )
}
