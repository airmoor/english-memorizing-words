import { useNavigate } from 'react-router-dom'
import type { VocabularyEntry } from '../../../entities/vocabulary/model/types'
import { Text } from '../../../shared/ui/Typography/Typography'
import { Button } from '../../../shared/ui/Button/Button'
import { Stack } from '../../../shared/ui/Stack/Stack'
import { VocabularyItem } from './VocabularyItem'
import styles from './VocabularyList.module.css'

interface Props {
  items: VocabularyEntry[]
  onRemove: (meaningId: string) => void
}

export function VocabularyList({ items, onRemove }: Props) {
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📚</span>
        <Text variant="title" as="h3" className={styles.emptyTitle}>
          No words saved yet
        </Text>
        <Text variant="body" color="secondary" as="p" className={styles.emptyText}>
          Search for English words and save meanings to build your vocabulary.
        </Text>
        <Button onClick={() => navigate('/search')} variant="secondary">
          Go to Search
        </Button>
      </div>
    )
  }

  return (
    <Stack gap="sm">
      <div className={styles.header}>
        <Text variant="body" color="secondary" as="span">
          {items.length} saved meaning{items.length !== 1 ? 's' : ''}
        </Text>
      </div>

      <ul className={styles.list}>
        {items.map((item) => (
          <VocabularyItem
            key={item.meaningId}
            item={item}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </Stack>
  )
}
