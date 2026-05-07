import { Card } from '../../../shared/ui/Card/Card'
import { Button } from '../../../shared/ui/Button/Button'
import { Text } from '../../../shared/ui/Typography/Typography'
import type { Meaning, WordResult } from '../../../entities/word/model/types'
import { Sense } from './Sense'
import styles from './WordEntry.module.css'

interface Props {
  word: WordResult
  savedIds: ReadonlySet<string>
  onSave: (meaningId: string) => void
  onSaveAll: (wordId: string, meaningIds: string[]) => void
  isSavingAll: boolean
  allSaved: boolean
}

/**
 * Determines whether a sense_number represents a sub-sense (e.g. "1a", "1b").
 * A pure-digit number ("1", "2") is a top-level sense.
 */
function isSubSense(senseNumber: string | null): boolean {
  return senseNumber !== null && /[a-zA-Z]/.test(senseNumber)
}

/**
 * Groups consecutive meanings sharing the same part of speech so a single
 * entry can render multiple POS sections (e.g. "noun", "verb").
 * Order is preserved exactly as the provider returned it.
 */
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

/**
 * Single canonical dictionary entry for a word.
 * Renders: word + transcription + provider tag → grouped senses by POS,
 * each sense numbered (1, 1a, 1b, 2) with definition / examples / synonyms.
 */
export function WordEntry({
  word,
  savedIds,
  onSave,
  onSaveAll,
  isSavingAll,
  allSaved,
}: Props) {
  const meaningIds = word.meanings.map((m) => m.id)
  const groups = groupByPos(word.meanings)

  return (
    <Card padding="lg" className={styles.entry}>
      {/* Header: word, transcription, save-all */}
      <header className={styles.header}>
        <div className={styles.wordBlock}>
          <Text variant="heading" as="h2" className={styles.word}>{word.text}</Text>
          {word.transcription && (
            <Text variant="caption" color="secondary" as="span" className={styles.transcription}>
              /{word.transcription}/
            </Text>
          )}
        </div>

        {allSaved ? (
          <span className={styles.allSavedBadge}>All saved ✓</span>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSaveAll(word.id, meaningIds)}
            disabled={isSavingAll}
          >
            {isSavingAll ? 'Saving…' : 'Save all'}
          </Button>
        )}
      </header>

      {/* Grouped senses by part of speech */}
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
                saved={savedIds.has(meaning.id)}
                onSave={() => onSave(meaning.id)}
                isSubSense={isSubSense(meaning.senseNumber)}
              />
            ))}
          </ol>
        </section>
      ))}

      {/* Provider attribution footer */}
      <footer className={styles.footer}>
        <Text variant="caption" color="secondary" as="span">
          Source: {word.provider === 'merriam-webster' ? 'Merriam-Webster Learner\'s' : 'Free Dictionary'}
        </Text>
      </footer>
    </Card>
  )
}
