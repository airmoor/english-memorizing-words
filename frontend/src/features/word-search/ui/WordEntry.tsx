import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../../shared/ui/Card/Card'
import { WordDetailContent } from '../../../shared/ui/WordDetail/WordDetailContent'
import { useSaveSelectedMeaningsMutation } from '../../meaning-picker/api/useSaveSelectedMeaningsMutation'
import { deleteWord } from '../../vocabulary/api/vocabularyApi'
import type { WordPayload } from '../../../shared/ui/WordDetail/types'
import type { WordResult } from '../../../entities/word/model/types'
import styles from './WordEntry.module.css'

interface Props {
  word: WordResult
  isSaved: boolean
  onSave: (wordId: string) => void
  isSaving: boolean
  /** IDs of meanings already saved — drives persistent highlights and edit-mode pre-selection */
  savedMeaningIds?: string[]
  /** Called when user clicks a "see also" cross-reference chip */
  onSeeAlso?: (term: string) => void
}

/**
 * Search-page wrapper for WordDetailContent.
 *
 * Two selection flows:
 *  - New save: "Save word" button → selection mode (≤3 pre-checked, >3 empty)
 *  - Edit:     "Saved ✓" badge   → edit mode (saved meanings pre-checked)
 *
 * Escape key cancels either mode.
 * MeaningPickerSheet is intentionally not rendered here — kept for other contexts.
 */
export function WordEntry({ word, isSaved, onSave, isSaving, savedMeaningIds = [], onSeeAlso }: Props) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const saveMutation = useSaveSelectedMeaningsMutation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const wordPayload: WordPayload = word

  const removeMutation = useMutation({
    mutationFn: () => deleteWord(word.id),
    onSuccess: () => {
      setSelectionMode(false)
      setIsEditMode(false)
      queryClient.invalidateQueries({ queryKey: ['saved-words'] })
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      // Notify parent so the "Saved ✓" badge resets
      // Parent drives isSaved from cache so invalidation is enough
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
    // Pre-check whatever is already saved
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
    saveMutation.mutate(
      { wordId: word.id, meaningIds: selectedIds },
      {
        onSuccess: () => {
          setSelectionMode(false)
          setIsEditMode(false)
          onSave(word.id)
        },
      }
    )
  }

  function handleRemoveFromVocabulary() {
    removeMutation.mutate()
  }

  function handleViewInVocabulary() {
    navigate(`/vocabulary?word=${encodeURIComponent(word.text)}`)
  }

  return (
    <Card padding="lg" className={styles.entry}>
      <WordDetailContent
        word={wordPayload}
        learningState={isSaved ? { nextReview: '', lastReviewedAt: null, intervalDays: 0, easeFactor: 2.5 } : null}
        onSave={handleOpenNewSave}
        onRemove={() => {}}
        isMutating={isSaving}
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
    </Card>
  )
}
