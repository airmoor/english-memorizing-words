import { ChevronLeft, Check, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet/AdaptiveSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import { Icon } from '../../../shared/ui/Icon/Icon'
import type { BoardSummary } from '../../../entities/board/model/types'
import { useBoardsQuery } from '../model/useBoardsQuery'
import { useAssignCardToBoard, useRemoveCardFromBoard } from '../model/useCardBoardMutation'
import { useCreateBoardMutation } from '../model/useCreateBoardMutation'
import styles from './BoardPickerSheet.module.css'

interface BoardPickerSheetProps {
  open: boolean
  onClose: () => void
  cardId: string
  wordId: string
  assignedBoards: BoardSummary[]
}

type View = 'list' | 'create'

/**
 * Sheet for picking which boards a card belongs to.
 * "New board" swaps to an in-place create-board view instead of stacking a
 * second sheet — one dismiss gesture always exits, and the word/card context
 * behind the sheet is never covered by a second layer.
 */
export function BoardPickerSheet({
  open,
  onClose,
  cardId,
  wordId,
  assignedBoards,
}: BoardPickerSheetProps) {
  const { data: boards = [] } = useBoardsQuery()
  const assignMutation        = useAssignCardToBoard()
  const removeMutation        = useRemoveCardFromBoard()
  const createMutation        = useCreateBoardMutation()

  const [view, setView] = useState<View>('list')
  const [name, setName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Always land on the board list when the sheet (re)opens.
  useEffect(() => {
    if (open) setView('list')
  }, [open])

  useEffect(() => {
    if (view === 'create') {
      setName('')
      setCreateError(null)
      requestAnimationFrame(() => nameInputRef.current?.focus({ preventScroll: true }))
    }
  }, [view])

  const assignedIds = new Set(assignedBoards.map((b) => b.id))

  const toggle = (boardId: string) => {
    if (assignedIds.has(boardId)) {
      removeMutation.mutate({ boardId, cardId, wordId })
    } else {
      assignMutation.mutate({ boardId, cardId, wordId })
    }
  }

  const activeBoards   = boards.filter((b) => !b.isArchived)
  const archivedBoards = boards.filter((b) => b.isArchived)

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setCreateError('Board name cannot be empty.')
      return
    }
    setCreateError(null)
    try {
      const board = await createMutation.mutateAsync({ name: trimmed })
      // Pre-select the board that prompted its own creation — no extra tap.
      assignMutation.mutate({ boardId: board.id, cardId, wordId })
      setView('list')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setCreateError(
        msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')
          ? 'A board with this name already exists.'
          : msg,
      )
    }
  }

  return (
    <AdaptiveSheet
      open={open}
      onClose={onClose}
      label={view === 'list' ? 'Add to board' : 'Create board'}
    >
      <div className={styles.viewport}>
        <div className={styles.track} data-view={view}>
          {/* ── List view ──────────────────────────────────────────────── */}
          <div className={styles.pane} inert={view !== 'list' ? true : undefined}>
            <BottomSheetContent>
              <div className={styles.header}>
                <h2 className={styles.title}>Add to board</h2>
                <div className={styles.headerActions}>
                  <button
                    type="button"
                    className={styles.newBoardLink}
                    onClick={() => setView('create')}
                  >
                    <Icon icon={Plus} size={14} />
                    New board
                  </button>
                  <button
                    type="button"
                    className={[styles.closeBtn, 'icon-action'].join(' ')}
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <Icon icon={X} size={18} />
                  </button>
                </div>
              </div>

              {activeBoards.length === 0 ? (
                <p className={styles.empty}>No boards yet.</p>
              ) : (
                <ul className={styles.list} role="list">
                  {activeBoards.map((board) => {
                    const checked = assignedIds.has(board.id)
                    return (
                      <li key={board.id}>
                        <button
                          type="button"
                          className={[styles.row, checked ? styles.rowChecked : ''].join(' ')}
                          onClick={() => toggle(board.id)}
                          aria-pressed={checked}
                        >
                          <span className={styles.rowName}>{board.name}</span>
                          <span className={[styles.checkbox, checked ? styles.checkboxChecked : ''].join(' ')} aria-hidden="true">
                            {checked && <Icon icon={Check} size={11} strokeWidth={2.5} />}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {archivedBoards.length > 0 && (
                <details className={styles.archivedSection}>
                  <summary className={styles.archivedToggle}>
                    Archived ({archivedBoards.length})
                  </summary>
                  <ul className={styles.list} role="list">
                    {archivedBoards.map((board) => {
                      const checked = assignedIds.has(board.id)
                      return (
                        <li key={board.id}>
                          <button
                            type="button"
                            className={[styles.row, styles.rowArchived, checked ? styles.rowChecked : ''].join(' ')}
                            onClick={() => toggle(board.id)}
                            aria-pressed={checked}
                          >
                            <span className={styles.rowName}>{board.name}</span>
                            <span className={[styles.checkbox, checked ? styles.checkboxChecked : ''].join(' ')} aria-hidden="true">
                              {checked && <Icon icon={Check} size={11} strokeWidth={2.5} />}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </details>
              )}

              <div className={styles.footer}>
                <button type="button" className={styles.doneBtn} onClick={onClose}>
                  Done
                </button>
              </div>
            </BottomSheetContent>
          </div>

          {/* ── Create view ────────────────────────────────────────────── */}
          <div className={styles.pane} inert={view !== 'create' ? true : undefined}>
            <BottomSheetContent>
              <form onSubmit={handleCreateSubmit} className={styles.createForm}>
                <div className={styles.header}>
                  <button
                    type="button"
                    className={[styles.closeBtn, 'icon-action'].join(' ')}
                    onClick={() => setView('list')}
                    aria-label="Back to board list"
                  >
                    <Icon icon={ChevronLeft} size={18} />
                  </button>
                  <h2 className={styles.title}>Create board</h2>
                  <button
                    type="button"
                    className={[styles.closeBtn, 'icon-action'].join(' ')}
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <Icon icon={X} size={18} />
                  </button>
                </div>

                <div className={styles.createBody}>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Board name</span>
                    <div className={styles.inputWrap}>
                      <input
                        ref={nameInputRef}
                        type="text"
                        className={[styles.input, createError ? styles.inputError : ''].join(' ')}
                        placeholder="e.g. Business English"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setCreateError(null) }}
                        maxLength={50}
                        autoComplete="off"
                        aria-invalid={createError !== null}
                        aria-describedby={createError ? 'board-name-error' : undefined}
                      />
                      <span className={styles.charCount} aria-hidden="true">
                        {name.length}/50
                      </span>
                    </div>
                  </label>

                  {createError && (
                    <p id="board-name-error" className={styles.error} role="alert">
                      {createError}
                    </p>
                  )}
                </div>

                <div className={styles.footer}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setView('list')}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.doneBtn}
                    disabled={createMutation.isPending || !name.trim()}
                  >
                    {createMutation.isPending ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            </BottomSheetContent>
          </div>
        </div>
      </div>
    </AdaptiveSheet>
  )
}
