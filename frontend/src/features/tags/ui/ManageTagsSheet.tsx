import { useState } from 'react'
import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet/AdaptiveSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import { useTagsQuery } from '../model/useTagsQuery'
import { useUpdateTagMutation, useDeleteTagMutation } from '../model/useCreateTagMutation'
import styles from './ManageTagsSheet.module.css'

interface ManageTagsSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * Tag management sheet — accessible from Settings.
 * Lists all tags with card counts, allows rename and delete with confirmation.
 */
export function ManageTagsSheet({ open, onClose }: ManageTagsSheetProps) {
  const { data: tags = [], isLoading } = useTagsQuery()
  const updateMutation = useUpdateTagMutation()
  const deleteMutation = useDeleteTagMutation()

  const [editingId,      setEditingId]      = useState<string | null>(null)
  const [editName,       setEditName]       = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id)
    setEditName(currentName)
  }

  const commitEdit = (id: string) => {
    const trimmed = editName.trim()
    if (trimmed) {
      updateMutation.mutate({ id, name: trimmed })
    }
    setEditingId(null)
  }

  const confirmDelete = (id: string) => {
    deleteMutation.mutate(id)
    setDeleteConfirmId(null)
  }

  return (
    <AdaptiveSheet open={open} onClose={onClose} label="Manage tags">
      <BottomSheetContent>
        <div className={styles.header}>
          <h2 className={styles.title}>Manage tags</h2>
        </div>

        {isLoading ? (
          <p className={styles.loading}>Loading…</p>
        ) : tags.length === 0 ? (
          <p className={styles.empty}>No tags yet. Add tags to your vocabulary cards.</p>
        ) : (
          <ul className={styles.list} role="list">
            {tags.map((tag) => (
              <li key={tag.id} className={styles.row}>
                {editingId === tag.id ? (
                  <input
                    className={styles.editInput}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitEdit(tag.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(tag.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    aria-label="Tag name"
                  />
                ) : (
                  <span className={styles.tagName}>{tag.name}</span>
                )}

                <span className={styles.cardCount} title={`${tag.cardCount} cards`}>
                  {tag.cardCount}
                </span>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => startEdit(tag.id, tag.name)}
                    aria-label={`Rename ${tag.name}`}
                    title="Rename"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className={[styles.actionBtn, styles.actionDanger].join(' ')}
                    onClick={() => setDeleteConfirmId(tag.id)}
                    aria-label={`Delete ${tag.name}`}
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>

                {deleteConfirmId === tag.id && (
                  <div className={styles.deleteConfirm} role="alert">
                    <span>
                      Delete &ldquo;{tag.name}&rdquo;?{' '}
                      {tag.cardCount > 0 && (
                        <strong>Removes from {tag.cardCount} card{tag.cardCount !== 1 ? 's' : ''}.</strong>
                      )}
                    </span>
                    <button type="button" className={styles.confirmDeleteBtn} onClick={() => confirmDelete(tag.id)}>
                      Delete
                    </button>
                    <button type="button" className={styles.cancelDeleteBtn} onClick={() => setDeleteConfirmId(null)}>
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </BottomSheetContent>
    </AdaptiveSheet>
  )
}

function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}

function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}
