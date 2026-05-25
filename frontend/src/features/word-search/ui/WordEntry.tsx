import { useState } from 'react'
import { Card } from '../../../shared/ui/Card/Card'
import { WordDetailContent } from '../../../shared/ui/WordDetail/WordDetailContent'
import { MeaningPickerSheet } from '../../meaning-picker'
import type { WordPayload } from '../../../shared/ui/WordDetail/types'
import type { WordResult } from '../../../entities/word/model/types'
import styles from './WordEntry.module.css'

interface Props {
  word: WordResult
  isSaved: boolean
  onSave: (wordId: string) => void
  isSaving: boolean
  /** IDs of meanings already saved — pre-selects them on re-open */
  savedMeaningIds?: string[]
}

/**
 * Search-page wrapper for WordDetailContent.
 *
 * Phase 5: Tapping "Save word" now opens MeaningPickerSheet so the user can
 * select which meanings to import. The sheet calls its own mutation; the
 * legacy `onSave` prop is kept for backwards compatibility (used elsewhere)
 * but is no longer called from the save button path.
 */
export function WordEntry({ word, isSaved, onSave, isSaving, savedMeaningIds = [] }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const wordPayload: WordPayload = word

  return (
    <>
      <Card padding="lg" className={styles.entry}>
        <WordDetailContent
          word={wordPayload}
          learningState={isSaved ? { nextReview: '', lastReviewedAt: null, intervalDays: 0, easeFactor: 2.5 } : null}
          onSave={() => setPickerOpen(true)}
          onRemove={() => {
            // TODO(Phase 5): wire remove from search context via useSavedWords
          }}
          isMutating={isSaving}
        />
      </Card>

      <MeaningPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        wordId={word.id}
        wordText={word.text}
        meanings={wordPayload.meanings}
        savedMeaningIds={savedMeaningIds}
        onSaved={() => {
          // Also notify parent so it can flip the "Saved ✓" badge
          onSave(word.id)
        }}
      />
    </>
  )
}
