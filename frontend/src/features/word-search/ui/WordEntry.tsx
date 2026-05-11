import { Card } from '../../../shared/ui/Card/Card'
import { WordDetailContent } from '../../../shared/ui/WordDetail/WordDetailContent'
import type { WordPayload } from '../../../shared/ui/WordDetail/types'
import type { WordResult } from '../../../entities/word/model/types'
import styles from './WordEntry.module.css'

interface Props {
  word: WordResult
  isSaved: boolean
  onSave: (wordId: string) => void
  isSaving: boolean
}

/**
 * Search-page wrapper for WordDetailContent.
 *
 * Converts WordResult (search API DTO) to WordPayload (detail boundary type)
 * and renders it inside a Card with the search-page animation.
 *
 * Learning state from the search context: we pass `learningState = null` when
 * not saved (save action is the primary CTA) and a minimal stub when saved
 * (the Saved ✓ badge is shown; full card state is not available here).
 *
 * TODO(Phase 5): pass real LearningState derived from vocabulary cache when
 * the word is saved, so the detail shows review status from search context.
 */
export function WordEntry({ word, isSaved, onSave, isSaving }: Props) {
  // Convert WordResult → WordPayload (structurally identical shapes)
  const wordPayload: WordPayload = word

  return (
    <Card padding="lg" className={styles.entry}>
      <WordDetailContent
        word={wordPayload}
        // When saved, we don't have card state in search context yet (Phase 5).
        // Pass a sentinel non-null value so DictionaryHeader shows "Saved ✓".
        // LearningSection is omitted (no real state to show).
        learningState={isSaved ? { nextReview: '', lastReviewedAt: null, intervalDays: 0, easeFactor: 2.5 } : null}
        onSave={() => onSave(word.id)}
        onRemove={() => {
          // TODO(Phase 5): wire remove from search context via useSavedWords
        }}
        isMutating={isSaving}
      />
    </Card>
  )
}
