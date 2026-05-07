import { Button } from '../../../shared/ui/Button/Button'
import { Text } from '../../../shared/ui/Typography/Typography'
import { Stack } from '../../../shared/ui/Stack/Stack'
import type { WordResult } from '../../../entities/word/model/types'
import { MeaningCard } from './MeaningCard'
import styles from './MeaningList.module.css'

interface Props {
  word: WordResult
  savedIds: ReadonlySet<string>
  onSave: (meaningId: string) => void
  onSaveAll: (wordId: string, meaningIds: string[]) => void
  isSavingAll: boolean
  allSaved: boolean
}

export function MeaningList({ word, savedIds, onSave, onSaveAll, isSavingAll, allSaved }: Props) {
  const meaningIds = word.meanings.map((m) => m.id)

  return (
    <Stack gap="lg" className={styles.list}>
      {/* Result header */}
      <div className={styles.resultHeader}>
        <div className={styles.wordInfo}>
          <Text variant="heading" as="h2" className={styles.wordHeading}>
            {word.text}
          </Text>
          <Text variant="caption" color="secondary" as="span">
            {word.meanings.length} meaning{word.meanings.length !== 1 ? 's' : ''}
          </Text>
        </div>

        {allSaved ? (
          <span className={styles.allSavedBadge}>All saved ✓</span>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSaveAll(word.id, meaningIds)}
            disabled={isSavingAll}
            className={styles.saveAllBtn}
          >
            {isSavingAll ? 'Saving…' : 'Save all'}
          </Button>
        )}
      </div>

      {/* Meaning cards */}
      <Stack gap="md">
        {word.meanings.map((meaning, i) => (
          <div
            key={meaning.id}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <MeaningCard
              word={word.text}
              meaning={meaning}
              saved={savedIds.has(meaning.id)}
              onSave={() => onSave(meaning.id)}
            />
          </div>
        ))}
      </Stack>
    </Stack>
  )
}
