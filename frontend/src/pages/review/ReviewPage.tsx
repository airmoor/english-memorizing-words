import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNavigate } from '../../shared/lib/useAppNavigate'
import { Check, Sparkles } from 'lucide-react'
import { Icon } from '../../shared/ui/Icon/Icon'
import { useQuery } from '@tanstack/react-query'
import { getNextCard } from '../../features/review/api/getNextCard'
import { getProgress } from '../../features/review/api/getProgress'
import { SessionProgress } from '../../features/review/ui/SessionProgress'
import { Flashcard } from '../../features/review/ui/Flashcard'
import { SessionSummary } from '../../features/review/ui/SessionSummary'
import type { RatingCounts } from '../../features/review/ui/SessionSummary'
import { Spinner } from '../../shared/ui/Spinner'
import { Text } from '../../shared/ui/Typography/Typography'
import { Container } from '../../shared/ui/layout/Container'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import type { Rating } from '../../entities/review/model/types'
import styles from './ReviewPage.module.css'

const INITIAL_COUNTS: RatingCounts = { again: 0, hard: 0, good: 0, easy: 0 }

/**
 * Formats a future ISO date into a human label like "tomorrow", "Monday, Jun 3".
 */
function formatReviewDate(isoDate: string): string {
  const date = new Date(isoDate)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) return 'tomorrow'
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

/**
 * Converts a nextReviewDate ISO string to a human label for SessionSummary.
 * Returns null if the date is null or in the past.
 */
function nextReviewHumanFromDate(isoDate: string | null): string | null {
  if (!isoDate) return null
  const date = new Date(isoDate)
  if (date <= new Date()) return null
  return formatReviewDate(isoDate)
}

export function ReviewPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  // Board-scoped session: boardId and boardName come from URL search params.
  // Set by "Review this board" on VocabularyPage.
  const boardId   = searchParams.get('boardId')   ?? undefined
  const boardName = searchParams.get('boardName') ?? undefined

  // Per-session rating count — local state, resets per page mount.
  const [counts, setCounts] = useState<RatingCounts>(INITIAL_COUNTS)
  const totalReviewed = Object.values(counts).reduce((sum, n) => sum + n, 0)

  const handleRated = useCallback((rating: Rating) => {
    setCounts((prev) => ({ ...prev, [rating]: prev[rating] + 1 }))
  }, [])

  const { data: card, isPending, isError, error } = useQuery({
    queryKey: ['nextCard', { boardId }],
    queryFn: () => getNextCard(boardId),
  })

  // Progress is board-scoped when boardId is present so that counts shown in
  // the header and summary ("N of M reviewed") reflect only the board's queue,
  // not the entire global queue.
  const { data: progress } = useQuery({
    queryKey: ['progress', { boardId }],
    queryFn: () => getProgress(boardId),
    staleTime: 30_000,
  })

  // ── Determine what to show ────────────────────────────────────────────────

  const queueEmpty = !isPending && !isError && card === null

  // A session just completed: queue is empty AND the user reviewed ≥1 card
  // during this page visit. This avoids showing "Session complete" on a fresh
  // page load when there was never anything due.
  const sessionDone = queueEmpty && totalReviewed > 0

  // Queue was empty from the start (no cards due, nothing reviewed yet)
  const neverHadCards = queueEmpty && totalReviewed === 0

  const nextHuman = nextReviewHumanFromDate(progress?.nextReviewDate ?? null)

  return (
    <PageLayout className={styles.flexPage}>
      <Container as="main" width="default">

        {/* ── Session header ─────────────────────────────────────────────── */}
        <div className={styles.sessionHeader}>
          <SessionProgress boardId={boardId} boardName={boardName} />
        </div>

        <div className={styles.main}>

          {/* Loading */}
          {isPending && <Spinner />}

          {/* Error */}
          {isError && (
            <Text variant="body" color="danger" as="p">
              {error instanceof Error ? error.message : 'Something went wrong.'}
            </Text>
          )}

          {/* Session complete — show rich summary */}
          {sessionDone && (
            <SessionSummary
              reviewedCount={totalReviewed}
              counts={counts}
              nextReviewHuman={nextHuman}
              boardName={boardName}
            />
          )}

          {/* Empty from the start — board-scoped no-cards state */}
          {neverHadCards && boardName && (
            <div className={styles.empty}>
              <p className={styles.emptyIcon}><Icon icon={Check} size={32} muted /></p>
              <Text variant="title" as="h2">No cards due</Text>
              <Text variant="body" color="secondary" as="p" className={styles.emptyText}>
                {`No cards due in "${boardName}".`}
                {nextHuman ? ` Next review ${nextHuman}.` : ''}
              </Text>
              <button
                type="button"
                className={styles.fullQueueBtn}
                onClick={() => navigate('/review')}
              >
                Review all cards
              </button>
            </div>
          )}

          {/* Empty from the start — global no-cards state */}
          {neverHadCards && !boardName && (
            <div className={styles.empty}>
              <p className={styles.emptyIcon}><Icon icon={Sparkles} size={32} muted /></p>
              <Text variant="title" as="h2">No cards due today!</Text>
              <Text variant="body" color="secondary" as="p" className={styles.emptyText}>
                {progress?.nextReviewDate
                  ? `Next review scheduled for ${formatReviewDate(progress.nextReviewDate)}.`
                  : 'Come back tomorrow to keep your streak going.'}
              </Text>
            </div>
          )}

          {/* Active card */}
          {card && (
            <Flashcard
              key={card.cardId}
              card={card}
              onRated={handleRated}
            />
          )}

        </div>
      </Container>
    </PageLayout>
  )
}
