import { Card } from '../../../shared/ui/Card/Card'
import { Button } from '../../../shared/ui/Button/Button'
import { Text } from '../../../shared/ui/Typography/Typography'
import { Stack } from '../../../shared/ui/Stack/Stack'
import type { Meaning } from '../../../entities/word/model/types'
import styles from './MeaningCard.module.css'

interface Props {
  word: string
  meaning: Meaning
  saved: boolean
  onSave: () => void
}

export function MeaningCard({ word, meaning, saved, onSave }: Props) {
  return (
    <Card padding="md" className={styles.card}>
      <Stack gap="md">
        {/* Header row: word + save button */}
        <div className={styles.headerRow}>
          <div className={styles.wordBlock}>
            <Text variant="title" as="h3" className={styles.word}>{word}</Text>
            {meaning.transcription && (
              <Text variant="caption" color="secondary" as="span" className={styles.transcription}>
                {meaning.transcription}
              </Text>
            )}
          </div>

          {saved ? (
            <span className={styles.savedBadge} aria-label="Saved">
              Saved ✓
            </span>
          ) : (
            <Button size="sm" variant="secondary" onClick={onSave} className={styles.saveBtn}>
              Save
            </Button>
          )}
        </div>

        {/* Part of speech */}
        {meaning.partOfSpeech && (
          <span className={styles.pos}>{meaning.partOfSpeech}</span>
        )}

        {/* Definition */}
        <Text variant="body" as="p" className={styles.definition}>
          {meaning.definition}
        </Text>

        {/* Synonyms */}
        {meaning.synonyms.length > 0 && (
          <div className={styles.section}>
            <Text variant="label" color="secondary" as="span" className={styles.sectionLabel}>
              Synonyms
            </Text>
            <div className={styles.pills}>
              {meaning.synonyms.slice(0, 8).map((syn) => (
                <span key={syn} className={styles.pill}>{syn}</span>
              ))}
            </div>
          </div>
        )}

        {/* Examples */}
        {meaning.examples.length > 0 && (
          <div className={styles.section}>
            <Text variant="label" color="secondary" as="span" className={styles.sectionLabel}>
              Examples
            </Text>
            <ul className={styles.examples}>
              {meaning.examples.slice(0, 3).map((ex, i) => (
                <li key={i} className={styles.example}>
                  <Text variant="caption" color="secondary" as="span">
                    "{ex}"
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Stack>
    </Card>
  )
}
