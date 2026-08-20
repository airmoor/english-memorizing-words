import { useState, useEffect } from 'react'
import { useNavigate } from '../../../shared/lib/useAppNavigate'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderPlus } from 'lucide-react'
import { Card } from '../../../shared/ui/Card/Card'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { WordDetailContent } from '../../../shared/ui/WordDetail/WordDetailContent'
import { BoardPickerSheet } from '../../boards/ui/BoardPickerSheet'
import { featureFlags } from '../../../shared/lib/featureFlags'
import { useSaveSelectedMeaningsMutation } from '../../meaning-picker/api/useSaveSelectedMeaningsMutation'
import { deleteWord } from '../../vocabulary/api/vocabularyApi'
import { useWordSavedStatus } from '../model/useWordSavedStatus'
import type { WordPayload } from '../../../shared/ui/WordDetail/types'
import type { WordResult } from '../../../entities/word/model/types'
import styles from './WordEntry.module.css'

interface Props {
  word: WordResult
  /** Called when user clicks a "see also" cross-reference chip */
  onSeeAlso?: (term: string) => void
}

/**
 * Search-page wrapper for WordDetailContent.
 *
 * Owns the full save/edit/remove lifecycle for the currently viewed word:
 *   - Fetches per-word saved status via useWordSavedStatus (no global preload)
 *   - New save: "Save word" button → meaning selection mode
 *   - Edit:     "Saved ✓" badge   → edit mode with saved meanings pre-checked
 *   - Remove:   "Remove word" link in edit mode
 *
 * Escape key cancels selection mode.
 */
export function WordEntry({ word, onSeeAlso }: Props) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [boardPickerOpen, setBoardPickerOpen] = useState(false)

  const { isSaved, savedMeaningIds, cardId, boards, setOptimistic } = useWordSavedStatus(word.id)
  const saveMutation = useSaveSelectedMeaningsMutation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const wordPayload: WordPayload = word

  const removeMutation = useMutation({
    mutationFn: () => deleteWord(word.id),
    onMutate: () => {
      // Optimistically clear the saved badge so it disappears immediately
      setOptimistic(false)
    },
    onError: () => {
      setOptimistic(null) // revert — let real cache data decide
    },
    onSuccess: () => {
      setSelectionMode(false)
      setIsEditMode(false)
      setOptimistic(null)
      queryClient.invalidateQueries({ queryKey: ['saved-status', word.id] })
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })

  // Cancel selection on Escape
  useEffect(() => {
    if (!selectionMode) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectionMode(false)
        setIsEditMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectionMode])

  function handleOpenNewSave() {
    const allIds = wordPayload.meanings.map((m) => m.id)
    // ≤3 meanings: start fully checked; >3: start empty
    setSelectedIds(allIds.length <= 3 ? allIds : [])
    setIsEditMode(false)
    setSelectionMode(true)
  }

  function handleOpenEditMode() {
    setSelectedIds([...savedMeaningIds])
    setIsEditMode(true)
    setSelectionMode(true)
  }

  function handleCancelSelection() {
    setSelectionMode(false)
    setIsEditMode(false)
  }

  function handleToggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleSaveSelection() {
    // Flip badge immediately — user confirmed save, don't wait for server.
    // (Runs synchronously before mutate(), matching the old onMutate timing.)
    setOptimistic(true)
    saveMutation.mutate(
      { wordId: word.id, meaningIds: selectedIds },
      {
        onError: () => {
          setOptimistic(null) // revert on failure
        },
        onSuccess: () => {
          setSelectionMode(false)
          setIsEditMode(false)
          // Clear optimistic override — cache refetch (triggered by onSettled
          // in useSaveSelectedMeaningsMutation) will supply the real value
          setOptimistic(null)
        },
      }
    )
  }

  function handleRemoveFromVocabulary() {
    removeMutation.mutate()
  }

  function handleViewInVocabulary() {
    // ?q= pre-fills the search filter; ?word= tells useWordDetailUrl to open
    // the panel once vocabulary items load — no separate ?open= flag needed.
    navigate(`/vocabulary?q=${encodeURIComponent(word.text)}&word=${encodeURIComponent(word.text)}`)
  }

  return (
    <Card variant="flat" padding="lg" className={styles.entry}>
      <WordDetailContent
        word={wordPayload}
        learningState={isSaved ? { nextReview: '', lastReviewedAt: null, intervalDays: 0, easeFactor: 2.5 } : null}
        onSave={handleOpenNewSave}
        onRemove={() => {}}
        isMutating={saveMutation.isPending || removeMutation.isPending}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggle={handleToggle}
        onSaveSelection={handleSaveSelection}
        onCancelSelection={handleCancelSelection}
        isSavingSelection={saveMutation.isPending}
        isEditMode={isEditMode}
        onEdit={isSaved ? handleOpenEditMode : undefined}
        onRemoveFromVocabulary={handleRemoveFromVocabulary}
        savedMeaningIds={savedMeaningIds}
        onViewInVocabulary={isSaved ? handleViewInVocabulary : undefined}
        onSeeAlso={onSeeAlso}
      />

      {/* Board assignment — right where the word was just saved, rather than
          only reachable after navigating to the vocabulary page. */}
      {featureFlags.boardsTags && isSaved && cardId && (
        <div className={styles.boardAssignRow}>
          <button
            type="button"
            className={styles.boardAssignBtn}
            onClick={() => setBoardPickerOpen(true)}
          >
            <Icon icon={FolderPlus} size={14} />
            {boards.length > 0
              ? `On ${boards.length} board${boards.length !== 1 ? 's' : ''}`
              : 'Add to board'}
          </button>
        </div>
      )}

      {cardId && (
        <BoardPickerSheet
          open={boardPickerOpen}
          onClose={() => setBoardPickerOpen(false)}
          cardId={cardId}
          wordId={word.id}
          assignedBoards={boards}
        />
      )}
    </Card>
  )
}
