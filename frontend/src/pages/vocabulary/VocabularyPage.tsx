import { AppHeader } from '../../shared/ui/AppHeader/AppHeader'
import { Spinner } from '../../shared/ui/Spinner'
import { Text } from '../../shared/ui/Typography/Typography'
import { Container } from '../../shared/ui/layout/Container'
import { VocabularyList } from '../../features/vocabulary/ui/VocabularyList'
import { useVocabulary } from '../../features/vocabulary/model/useVocabulary'
import styles from './VocabularyPage.module.css'

export function VocabularyPage() {
  const { items, isLoading, isError, remove } = useVocabulary()

  return (
    <div className={styles.page}>
      <AppHeader />
      <Container as="main">
        <Text variant="title" as="h1" className={styles.heading}>
          My Vocabulary
        </Text>

        {isLoading && <Spinner />}

        {isError && (
          <Text variant="body" color="secondary" as="p">
            Failed to load vocabulary. Please try again.
          </Text>
        )}

        {!isLoading && !isError && (
          <VocabularyList items={items} onRemove={remove} />
        )}
      </Container>
    </div>
  )
}
