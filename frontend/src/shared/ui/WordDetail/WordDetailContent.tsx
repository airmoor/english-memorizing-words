import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { WordDetailContentProps } from './types'
import { DictionaryHeader } from './DictionaryHeader'
import { MeaningGroup } from './MeaningGroup'
import { Icon } from '../Icon/Icon'
import { groupByPos, takeTopSenses } from './utils'
import { NoteSection } from '../../../features/card-note/ui/NoteSection'
import { TagInputSection } from '../../../features/tags/ui/TagInputSection'
import { TranslationBlock } from '../../../features/translation/ui/TranslationBlock'
import { PronunciationCredit } from '../../../features/pronunciation/ui/PronunciationCredit'
import { BoardsSection } from './BoardsSection'
import { ReviewInfoSection } from './ReviewInfoSection'
import { featureFlags } from '../../../shared/lib/featureFlags'
import styles from './WordDetailContent.module.css'

/** Optional inline selection props — only used in search context. */
interface SelectionProps {
  selectionMode?: boolean
  selectedIds?: string[]
  onToggle?: (id: string) => void
  onSaveSelection?: () => void
  onCancelSelection?: () => void
  isSavingSelection?: boolean
  /** True when editing an already-saved word (changes button/bar labels). */
  isEditMode?: boolean
  /** Called when the destructive "Remove word" link is clicked in edit mode. */
  onRemoveFromVocabulary?: () => void
  /** IDs of meanings already saved — drives the persistent highlight on senses. */
  savedMeaningIds?: string[]
  /** Navigates to the vocabulary page filtered to this word. */
  onViewInVocabulary?: () => void
  /** Called when user clicks a "see also" cross-reference chip in a definition. */
  onSeeAlso?: (term: string) => void
  /** Called when user clicks "Saved ✓" and edit mode should open. */
  onEdit?: () => void
}

type Props = WordDetailContentProps & SelectionProps

// Long entries (e.g. "get" has 40+ senses) collapse to the first few top-level
// senses behind a "Show all" toggle. Counting top-level senses keeps the preview
// meaningful; the threshold avoids a toggle that would hide only a row or two.
const DEFAULT_VISIBLE_TOP_SENSES = 3
const COLLAPSE_MIN_TOTAL = 6

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
  selectionMode = false,
  selectedIds = [],
  onToggle,
  onSaveSelection,
  onCancelSelection,
  isSavingSelection = false,
  isEditMode = false,
  onRemoveFromVocabulary,
  savedMeaningIds,
  onViewInVocabulary,
  onSeeAlso,
  onEdit,
}: Props) {
  const totalMeanings = word.meanings.length
  const collapsedMeanings = takeTopSenses(word.meanings, DEFAULT_VISIBLE_TOP_SENSES)
  const canCollapse =
    totalMeanings >= COLLAPSE_MIN_TOTAL && collapsedMeanings.length < totalMeanings

  // Start expanded when a saved or pre-selected meaning would otherwise be
  // hidden under the cut — never bury the user's own selection behind the toggle.
  const [expanded, setExpanded] = useState(() => {
    if (!canCollapse) return false
    const visibleIds = new Set(collapsedMeanings.map((m) => m.id))
    const mustShow = [...(savedMeaningIds ?? []), ...(selectedIds ?? [])]
    return mustShow.some((id) => !visibleIds.has(id))
  })

  const groups = groupByPos(
    canCollapse && !expanded ? collapsedMeanings : word.meanings,
  )
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
        onEdit={onEdit}
        onViewInVocabulary={onViewInVocabulary}
      />

      {/* ── Inline selection bar — search context only ────────────────── */}
      {selectionMode && context !== 'vocabulary' && (
        <div className={styles.selectionBar}>
          <span className={styles.selectionBarText}>
            {isEditMode ? 'Edit saved meanings' : 'Select meanings to save'}
          </span>
          <button type="button" className={styles.selectionBarCancel} onClick={onCancelSelection}>
            Cancel
          </button>
        </div>
      )}

      {/* ── Native-language gloss — tap to reveal. Hidden during save selection
            so it never competes with the meaning-picker flow. ─────────────── */}
      {!selectionMode && (
        <div className={styles.translationRow}>
          <TranslationBlock wordId={word.id} />
        </div>
      )}

      <div className={styles.meanings}>
        {groups.map((group, i) => (
          <MeaningGroup
            key={`${group.pos ?? 'null'}-${i}`}
            pos={group.pos}
            meanings={group.meanings}
            selectionMode={selectionMode && context !== 'vocabulary'}
            selectedIds={selectedIds}
            onToggle={onToggle}
            savedMeaningIds={!selectionMode ? savedMeaningIds : undefined}
            onSeeAlso={onSeeAlso}
          />
        ))}

        {canCollapse && (
          <button
            type="button"
            className={styles.showMoreBtn}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <Icon icon={expanded ? ChevronUp : ChevronDown} size={16} />
            {expanded ? 'Show fewer meanings' : `Show all ${totalMeanings} meanings`}
          </button>
        )}
      </div>

      {/* ── Sticky save footer — inline selection mode ───────────────── */}
      {selectionMode && context !== 'vocabulary' && (
        <div className={styles.selectionFooter}>
          <span className={styles.selectionCount}>
            {selectedIds.length} of {word.meanings.length} selected
          </span>
          <button
            type="button"
            className={styles.selectionSaveBtn}
            onClick={onSaveSelection}
            disabled={selectedIds.length === 0 || isSavingSelection}
          >
            {isSavingSelection ? 'Saving…' : isEditMode ? 'Update' : 'Save meanings'}
          </button>
        </div>
      )}

      {/* ── Destructive remove link — edit mode only ─────────────────── */}
      {selectionMode && isEditMode && context !== 'vocabulary' && onRemoveFromVocabulary && (
        <button
          type="button"
          className={styles.editRemoveLink}
          onClick={onRemoveFromVocabulary}
        >
          Remove word from vocabulary
        </button>
      )}

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

      {/* ── Source credit — last thing in the card. Renders only once a
            recording has been loaded; required by the audio licenses. ────── */}
      <PronunciationCredit wordId={word.id} />
    </div>
  )
}
