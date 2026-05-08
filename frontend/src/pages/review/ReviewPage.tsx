import { useQuery } from '@tanstack/react-query'
import { getNextCard } from '../../features/review/api/getNextCard'
import { getProgress } from '../../features/review/api/getProgress'
import { SessionProgress } from '../../features/review/ui/SessionProgress'
import { Flashcard } from '../../features/review/ui/Flashcard'
import { Spinner } from '../../shared/ui/Spinner'
import { Text } from '../../shared/ui/Typography/Typography'
import { Container } from '../../shared/ui/layout/Container'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import styles from './ReviewPage.module.css'

function formatReviewDate(isoDate: string): string {
  const date = new Date(isoDate)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === tomorrow.toDateString()) return 'tomorrow'

  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function ReviewPage() {
  const { data: card, isPending, isError, error } = useQuery({
    queryKey: ['nextCard'],
    queryFn: getNextCard,
  })

  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: getProgress,
    staleTime: 30_000,
  })

  return (
    <PageLayout className={styles.flexPage}>
      <SessionProgress />

      <Container as="main" width="narrow" className={styles.main}>
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
              {progress?.nextReviewDate
                ? `Next review scheduled for ${formatReviewDate(progress.nextReviewDate)}.`
                : 'Come back tomorrow to keep your streak going.'}
            </Text>
          </div>
        )}

        {card && <Flashcard key={card.cardId} card={card} />}
      </Container>
    </PageLayout>
  )
}
