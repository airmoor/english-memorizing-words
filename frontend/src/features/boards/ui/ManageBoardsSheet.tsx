import { Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Icon } from '../../../shared/ui/Icon/Icon'
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
                          <Icon icon={Pencil} size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => toggleArchive(board.id, board.isArchived)}
                          aria-label={`Archive ${board.name}`}
                          title="Archive"
                        >
                          <Icon icon={Archive} size={15} />
                        </button>
                        <button
                          type="button"
                          className={[styles.actionBtn, styles.actionDanger].join(' ')}
                          onClick={() => setDeleteConfirmId(board.id)}
                          aria-label={`Delete ${board.name}`}
                          title="Delete"
                        >
                          <Icon icon={Trash2} size={15} />
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
                            <Icon icon={ArchiveRestore} size={15} />
                          </button>
                          <button
                            type="button"
                            className={[styles.actionBtn, styles.actionDanger].join(' ')}
                            onClick={() => setDeleteConfirmId(board.id)}
                            aria-label={`Delete ${board.name}`}
                            title="Delete"
                          >
                            <Icon icon={Trash2} size={15} />
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

