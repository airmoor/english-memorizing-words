import { ChevronLeft, Check, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import { Icon } from '../../../shared/ui/Icon/Icon'
import type { BoardSummary } from '../../../entities/board/model/types'
import { useBoardsQuery } from '../model/useBoardsQuery'
import { useAssignCardToBoard, useRemoveCardFromBoard } from '../model/useCardBoardMutation'
import { useCreateBoardMutation } from '../model/useCreateBoardMutation'
import styles from './BoardPickerPanel.module.css'

interface BoardPickerPanelProps {
  cardId: string
  wordId: string
  assignedBoards: BoardSummary[]
  /** Fired by the list view's primary dismiss button (top-right) and the "Done" footer button. */
  onDismiss: () => void
  /**
   * 'close' (✕) when this panel is the whole dialog (standalone sheet/modal).
   * 'back' (‹) when it's slid in as a secondary view over another view —
   * dismissing means "return to that view", not "close a dialog". Only
   * affects the list view's primary button; the create view's skip-to-exit
   * button stays ✕ either way, since "back to list" already has its own
   * dedicated chevron there.
   */
  dismissIcon?: 'close' | 'back'
  /** Applied to whichever pane's heading is currently visible, so a host dialog's aria-labelledby tracks the on-screen title. */
  titleId?: string
}

type View = 'list' | 'create'

/**
 * Board-picker content: assign a card to boards, with an in-place
 * "Create board" view — no second sheet stacked on top. Presentational only;
 * the host (a standalone sheet, or a secondary view inside another sheet)
 * controls its own open/close.
 */
export function BoardPickerPanel({
  cardId,
  wordId,
  assignedBoards,
  onDismiss,
  dismissIcon = 'close',
  titleId,
}: BoardPickerPanelProps) {
  const { data: boards = [] } = useBoardsQuery()
  const assignMutation        = useAssignCardToBoard()
  const removeMutation        = useRemoveCardFromBoard()
  const createMutation        = useCreateBoardMutation()

  const [view, setView] = useState<View>('list')
  const [name, setName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

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

  const listDismissIcon  = dismissIcon === 'back' ? ChevronLeft : X
  const listDismissLabel = dismissIcon === 'back' ? 'Back' : 'Close'

  return (
    <div className={styles.viewport}>
      <div className={styles.track} data-view={view}>
        {/* ── List view ──────────────────────────────────────────────── */}
        <div className={styles.pane} inert={view !== 'list' ? true : undefined}>
          <BottomSheetContent>
            <div className={styles.header}>
              <h2 id={view === 'list' ? titleId : undefined} className={styles.title}>Add to board</h2>
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
                  onClick={onDismiss}
                  aria-label={listDismissLabel}
                >
                  <Icon icon={listDismissIcon} size={18} />
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
              <button type="button" className={styles.doneBtn} onClick={onDismiss}>
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
                <h2 id={view === 'create' ? titleId : undefined} className={styles.title}>Create board</h2>
                <button
                  type="button"
                  className={[styles.closeBtn, 'icon-action'].join(' ')}
                  onClick={onDismiss}
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
  )
}
