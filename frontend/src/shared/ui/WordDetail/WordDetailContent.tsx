import { useState } from 'react'
import type { WordDetailContentProps } from './types'
import { DictionaryHeader } from './DictionaryHeader'
import { MeaningGroup } from './MeaningGroup'
import { groupByPos } from './utils'
import { NoteSection } from '../../../features/card-note/ui/NoteSection'
import { TagInputSection } from '../../../features/tags/ui/TagInputSection'
import { BoardsSection } from './BoardsSection'
import { ReviewInfoSection } from './ReviewInfoSection'
import { featureFlags } from '../../../shared/lib/featureFlags'
import styles from './WordDetailContent.module.css'

/**
 * The canonical word detail view — section-composed, layout-agnostic.
 *
 * Architecture (§4, §15):
 * - Renders the dictionary layer (DictionaryHeader + MeaningGroup[])
 * - Renders the learning layer (LearningSection) only when learningState is non-null
 * - Never fetches data, never mutates — receives everything via props
 * - Identical output inside BottomSheet, SidePanel, or a standalone page
 *
 * Section structure:
 *   DictionaryHeader    — word, transcription, source, save/remove
 *   MeaningGroup[]      — one section per part of speech
 *   (separator)         — visual rule between dictionary and learning layers
 *   NoteSection         — inline-edit personal note (Phase 4)
 *   BoardsSection       — board chips + add-to-board picker (Phase 4)
 *   TagInputSection     — tag chips + autocomplete input (Phase 4)
 *   ReviewInfoSection   — interval, next review, date added (Phase 4)
 */
export function WordDetailContent({
  word,
  learningState,
  vocabCard,
  onSave,
  onRemove,
  isMutating = false,
  context = 'search',
  onClose,
}: WordDetailContentProps) {
  const groups = groupByPos(word.meanings)
  const [removeConfirm, setRemoveConfirm] = useState(false)

  return (
    <div className={styles.content}>
      {/* ── Dictionary layer ──────────────────────────────────────────── */}
      <DictionaryHeader
        word={word}
        learningState={learningState}
        onSave={onSave}
        onRemove={onRemove}
        isMutating={isMutating}
        context={context}
        onClose={onClose}
      />

      <div className={styles.meanings}>
        {groups.map((group, i) => (
          <MeaningGroup
            key={`${group.pos ?? 'null'}-${i}`}
            pos={group.pos}
            meanings={group.meanings}
          />
        ))}
      </div>

      {/* ── Vocabulary card sections — only in vocabulary context ────── */}
      {context === 'vocabulary' && vocabCard?.cardId && (
        <div className={styles.vocabSections}>
          <NoteSection
            cardId={vocabCard.cardId}
            note={vocabCard.note}
          />

          {featureFlags.boardsTags && (
            <BoardsSection
              cardId={vocabCard.cardId}
              wordId={vocabCard.wordId}
              boards={vocabCard.boards}
            />
          )}

          {featureFlags.boardsTags && (
            <TagInputSection
              cardId={vocabCard.cardId}
              tags={vocabCard.tags}
            />
          )}

          <ReviewInfoSection
            reviewState={vocabCard.reviewState}
            nextReviewHuman={vocabCard.nextReviewHuman}
            lastReviewedAt={vocabCard.lastReviewedAt}
            savedAt={vocabCard.savedAt}
            intervalDays={vocabCard.intervalDays}
          />

          {/* ── Destructive: remove from vocabulary ───────────────────── */}
          <div className={styles.destructiveRow}>
            {!removeConfirm ? (
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => setRemoveConfirm(true)}
                disabled={isMutating}
              >
                Remove from vocabulary
              </button>
            ) : (
              <div className={styles.removeConfirm}>
                <span className={styles.removeConfirmText}>
                  Remove &ldquo;{word.text}&rdquo;? Review progress will be lost.
                </span>
                <button
                  type="button"
                  className={styles.removeConfirmYes}
                  onClick={onRemove}
                  disabled={isMutating}
                >
                  {isMutating ? 'Removing…' : 'Yes, remove'}
                </button>
                <button
                  type="button"
                  className={styles.removeConfirmNo}
                  onClick={() => setRemoveConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
