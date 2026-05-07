import { useQuery } from '@tanstack/react-query'
import { getNextCard } from '../../features/review/api/getNextCard'
import { SessionProgress } from '../../features/review/ui/SessionProgress'
import { Flashcard } from '../../features/review/ui/Flashcard'
import { AppHeader } from '../../shared/ui/AppHeader/AppHeader'
import { Spinner } from '../../shared/ui/Spinner'
import { Text } from '../../shared/ui/Typography/Typography'
import styles from './ReviewPage.module.css'

export function ReviewPage() {
  const { data: card, isPending, isError, error } = useQuery({
    queryKey: ['nextCard'],
    queryFn: getNextCard,
  })

  return (
    <div className={styles.page}>
      <AppHeader />
      <SessionProgress />

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
