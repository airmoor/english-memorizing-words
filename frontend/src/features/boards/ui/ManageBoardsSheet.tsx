import { useState } from 'react'
import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet/AdaptiveSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog'
import { useBoardsQuery } from '../model/useBoardsQuery'
import { useUpdateBoardMutation, useDeleteBoardMutation } from '../model/useUpdateBoardMutation'
import { CreateBoardSheet } from './CreateBoardSheet'
import styles from './ManageBoardsSheet.module.css'

interface ManageBoardsSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * Full board management sheet — accessible from Settings.
 * Lists all boards (active + archived), allows rename, archive, and delete.
 */
export function ManageBoardsSheet({ open, onClose }: ManageBoardsSheetProps) {
  const { data: boards = [], isLoading } = useBoardsQuery(true)
  const updateMutation = useUpdateBoardMutation()
  const deleteMutation = useDeleteBoardMutation()

  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editName,  setEditName]        = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [createOpen, setCreateOpen]     = useState(false)

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id)
    setEditName(currentName)
  }

  const commitEdit = (id: string) => {
    const trimmed = editName.trim()
    if (trimmed) {
      updateMutation.mutate({ id, dto: { name: trimmed } })
    }
    setEditingId(null)
  }

  const toggleArchive = (id: string, isArchived: boolean) => {
    updateMutation.mutate({ id, dto: { isArchived: !isArchived } })
  }

  const confirmDelete = (id: string) => {
    deleteMutation.mutate(id)
    setDeleteConfirmId(null)
  }

  const activeBoards   = boards.filter((b) => !b.isArchived)
  const archivedBoards = boards.filter((b) => b.isArchived)
  const boardToDelete  = boards.find((b) => b.id === deleteConfirmId)

  return (
    <>
      <AdaptiveSheet open={open} onClose={onClose} label="Manage boards">
        <BottomSheetContent>
          <div className={styles.header}>
            <h2 className={styles.title}>Manage boards</h2>
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => setCreateOpen(true)}
              aria-label="Create new board"
            >
              + New
            </button>
          </div>

          {isLoading ? (
            <p className={styles.loading}>Loading…</p>
          ) : boards.length === 0 ? (
            <p className={styles.empty}>No boards yet. Create one above.</p>
          ) : (
            <>
              {activeBoards.length > 0 && (
                <ul className={styles.list} role="list">
                  {activeBoards.map((board) => (
                    <li key={board.id} className={styles.row}>
                      {editingId === board.id ? (
                        <input
                          className={styles.editInput}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => commitEdit(board.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(board.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                          aria-label="Board name"
                        />
                      ) : (
                        <span className={styles.boardName}>{board.name}</span>
                      )}

                      <span className={styles.cardCount}>{board.cardCount}</span>

                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => startEdit(board.id, board.name)}
                          aria-label={`Rename ${board.name}`}
                          title="Rename"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => toggleArchive(board.id, board.isArchived)}
                          aria-label={`Archive ${board.name}`}
                          title="Archive"
                        >
                          <ArchiveIcon />
                        </button>
                        <button
                          type="button"
                          className={[styles.actionBtn, styles.actionDanger].join(' ')}
                          onClick={() => setDeleteConfirmId(board.id)}
                          aria-label={`Delete ${board.name}`}
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>

                    </li>
                  ))}
                </ul>
              )}

              {archivedBoards.length > 0 && (
                <details className={styles.archivedSection}>
                  <summary className={styles.archivedToggle}>
                    Archived ({archivedBoards.length})
                  </summary>
                  <ul className={styles.list} role="list">
                    {archivedBoards.map((board) => (
                      <li key={board.id} className={[styles.row, styles.rowArchived].join(' ')}>
                        <span className={styles.boardName}>{board.name}</span>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => toggleArchive(board.id, board.isArchived)}
                            aria-label={`Unarchive ${board.name}`}
                            title="Unarchive"
                          >
                            <UnarchiveIcon />
                          </button>
                          <button
                            type="button"
                            className={[styles.actionBtn, styles.actionDanger].join(' ')}
                            onClick={() => setDeleteConfirmId(board.id)}
                            aria-label={`Delete ${board.name}`}
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </BottomSheetContent>
      </AdaptiveSheet>

      <CreateBoardSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title={`Delete "${boardToDelete?.name ?? ''}"?`}
        body="Words in this board will remain in your vocabulary."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteConfirmId) confirmDelete(deleteConfirmId)
        }}
        onCancel={() => setDeleteConfirmId(null)}
        danger
      />
    </>
  )
}

function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}

function ArchiveIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
}

function UnarchiveIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><polyline points="10 15 12 13 14 15"/><line x1="12" y1="13" x2="12" y2="17"/></svg>
}

function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}
