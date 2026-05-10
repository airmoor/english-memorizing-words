import { Card } from '../../../shared/ui/Card/Card'
import { Button } from '../../../shared/ui/Button/Button'
import { Text } from '../../../shared/ui/Typography/Typography'
import type { Meaning, WordResult } from '../../../entities/word/model/types'
import { Sense } from './Sense'
import styles from './WordEntry.module.css'

interface Props {
  word: WordResult
  isSaved: boolean
  onSave: (wordId: string) => void
  isSaving: boolean
}

function groupByPos(meanings: Meaning[]): { pos: string | null; meanings: Meaning[] }[] {
  const groups: { pos: string | null; meanings: Meaning[] }[] = []
  for (const m of meanings) {
    const last = groups[groups.length - 1]
    if (last && last.pos === m.partOfSpeech) {
      last.meanings.push(m)
    } else {
      groups.push({ pos: m.partOfSpeech, meanings: [m] })
    }
  }
  return groups
}

function isSubSense(senseNumber: string | null): boolean {
  return senseNumber !== null && /[a-zA-Z]/.test(senseNumber)
}

/**
 * Single canonical dictionary entry for a word.
 * Save is at the word level — the user saves the whole word, not individual senses.
 */
export function WordEntry({ word, isSaved, onSave, isSaving }: Props) {
  const groups = groupByPos(word.meanings)

  return (
    <Card padding="lg" className={styles.entry}>
      {/* Header: word, transcription, word-level save */}
      <header className={styles.header}>
        <div className={styles.wordBlock}>
          <Text variant="heading" as="h2" className={styles.word}>{word.text}</Text>
          {word.transcription && (
            <Text variant="caption" color="secondary" as="span" className={styles.transcription}>
              /{word.transcription}/
            </Text>
          )}
        </div>

        {isSaved ? (
          <span className={styles.allSavedBadge}>Saved ✓</span>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSave(word.id)}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save word'}
          </Button>
        )}
      </header>

      {/* Senses grouped by part of speech */}
      {groups.map((group, gi) => (
        <section key={gi} className={styles.group}>
          {group.pos && (
            <Text variant="label" color="secondary" as="span" className={styles.pos}>
              {group.pos}
            </Text>
          )}
          <ol className={styles.senses}>
            {group.meanings.map((meaning) => (
              <Sense
                key={meaning.id}
                meaning={meaning}
                isSubSense={isSubSense(meaning.senseNumber)}
              />
            ))}
          </ol>
        </section>
      ))}

      <footer className={styles.footer}>
        <Text variant="caption" color="secondary" as="span">
          Source: {word.provider === 'merriam-webster' ? 'Merriam-Webster Learner\'s' : 'Free Dictionary'}
        </Text>
      </footer>
    </Card>
  )
}
