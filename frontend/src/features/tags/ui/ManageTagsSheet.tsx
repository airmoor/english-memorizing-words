import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Icon } from '../../../shared/ui/Icon/Icon'
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
                    <Icon icon={Pencil} size={15} />
                  </button>
                  <button
                    type="button"
                    className={[styles.actionBtn, styles.actionDanger].join(' ')}
                    onClick={() => setDeleteConfirmId(tag.id)}
                    aria-label={`Delete ${tag.name}`}
                    title="Delete"
                  >
                    <Icon icon={Trash2} size={15} />
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

