import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import { Text } from '../../../shared/ui/Typography/Typography'
import { Button } from '../../../shared/ui/Button/Button'
import { VocabularyItem } from './VocabularyItem'
import styles from './VocabularyList.module.css'

interface Props {
  items: VocabularyWord[]
  onRemove: (wordId: string) => void
}

export function VocabularyList({ items, onRemove }: Props) {
  const navigate = useNavigate()

  // The source list for panel navigation — stable word ID array in display order.
  // Passed to every VocabularyItem so they can provide it on open.
  // useMemo ensures referential stability when items hasn't changed.
  const sourceList = useMemo(
    () => items.map((item) => item.wordId),
    [items],
  )

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📚</span>
        <Text variant="title" as="h3" className={styles.emptyTitle}>
          No words saved yet
        </Text>
        <Text variant="body" color="secondary" as="p" className={styles.emptyText}>
          Search for English words and save them to build your vocabulary.
        </Text>
        <Button onClick={() => navigate('/search')} variant="secondary">
          Go to Search
        </Button>
      </div>
    )
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <VocabularyItem
          key={item.wordId}
          item={item}
          onRemove={onRemove}
          sourceList={sourceList}
        />
      ))}
    </ul>
  )
}
