import { FolderMinus, FolderPlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Icon } from '../../../shared/ui/Icon/Icon'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog'
import { useWordDetail } from '../../../shared/ui/WordDetail/WordDetailContext'
import { BoardPickerSheet } from '../../boards/ui/BoardPickerSheet'
import { useRemoveCardFromBoard } from '../../boards/model/useCardBoardMutation'
import { RowActionMenu, type RowActionMenuItem } from '../../../shared/ui/RowActionMenu/RowActionMenu'
import { featureFlags } from '../../../shared/lib/featureFlags'
import { useIsPointerDesktop } from '../../../shared/lib/useIsPointerDesktop'
import { useIsDesktop } from '../../../shared/lib/useIsDesktop'
import { getCardState } from '../model/cardState'
import { toast } from '../../../shared/ui/Toast'
import styles from './VocabularyItemCompact.module.css'

interface Props {
  item: VocabularyWord
  onRemove: (wordId: string) => void
  sourceList: string[]
  /** The board currently scoping this list, if the user is inside a board (not "All Vocabulary"). */
  activeBoard?: { id: string; name: string }
}


/**
 * A single-row compact vocabulary entry.
 * Shows: state dot · word · transcription · delete button.
 * Clicking the row opens the word detail panel.
 */
export function VocabularyItemCompact({ item, onRemove, sourceList, activeBoard }: Props) {
  const { open, close, activeWordId } = useWordDetail()
  const isActive = activeWordId === item.wordId
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const isPointerDesktop = useIsPointerDesktop()
  const isDesktop = useIsDesktop()
  const removeFromBoard = useRemoveCardFromBoard()

  const state = getCardState(item)

  // Below 1024px, every row action folds into a single overflow menu —
  // 2-3 dedicated 32px icon buttons in a row this narrow crowd out the
  // word/transcription text. Desktop keeps the always-visible icons.
  const foldAllActions = !isDesktop

  // Drag-to-board — desktop pointer only (no equivalent affordance on touch);
  // "Add to board" button above stays as the accessible/mobile path either way.
  const { listeners: dragListeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `card-${item.cardId}`,
    data: { wordId: item.wordId, cardId: item.cardId, wordText: item.wordText },
    disabled: !featureFlags.boardsTags || !item.cardId || !isPointerDesktop,
  })
  const dndActive = featureFlags.boardsTags && !!item.cardId && isPointerDesktop

  // Clicking an already-open card toggles it closed; otherwise opens it
  const handleOpen = () => {
    if (isActive) {
      close()
    } else {
      open(item.wordId, sourceList)
    }
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmOpen(true)
  }

  const runRemoveFromBoard = () => {
    if (!activeBoard || !item.cardId) return
    removeFromBoard.mutate({ boardId: activeBoard.id, cardId: item.cardId, wordId: item.wordId })
    toast.success(`Removed "${item.wordText}" from "${activeBoard.name}"`)
  }

  const handleRemoveFromBoardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    runRemoveFromBoard()
  }

  return (
    <>
      <li
        ref={setDragRef}
        className={[
          styles.row,
          isActive ? styles.rowActive : '',
          dndActive ? styles.rowDraggable : '',
          isDragging ? styles.rowDragging : '',
          activeBoard && item.cardId && !foldAllActions ? styles.rowBoardScoped : '',
          foldAllActions ? styles.rowFolded : '',
        ].join(' ')}
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen() }
        }}
        aria-label={isActive ? `Close detail for ${item.wordText}` : `Open detail for ${item.wordText}`}
        aria-pressed={isActive}
        {...dragListeners}
      >
        {/* State dot */}
        <span
          className={[styles.dot, styles[`dot_${state}`]].join(' ')}
          aria-label={state}
          title={state.charAt(0).toUpperCase() + state.slice(1)}
        />

        <div className={styles.wordBlock}>
          {/* Word */}
          <span className={styles.word}>{item.wordText}</span>

          {/* Transcription */}
          {item.transcription ? (
            <span className={styles.transcription}>/{item.transcription}/</span>
          ) : (
            <span />
          )}
        </div>

        {/* Below 1024px, all row actions collapse into one overflow menu —
            room is too tight for dedicated icons. Desktop keeps them
            always-visible: "add to board" is common enough to earn its own
            icon, and inside a board, unlinking (non-destructive) stays
            separate from "delete word" (destructive, tucked in the menu). */}
        {foldAllActions ? (
          <RowActionMenu
            triggerClassName={styles.menuBtn}
            iconSize={14}
            ariaLabel={`More actions for ${item.wordText}`}
            items={[
              ...(featureFlags.boardsTags && item.cardId
                ? [{ label: 'Add to board', onClick: () => setPickerOpen(true) } satisfies RowActionMenuItem]
                : []),
              ...(activeBoard && item.cardId
                ? [{ label: `Remove from "${activeBoard.name}"`, onClick: runRemoveFromBoard } satisfies RowActionMenuItem]
                : []),
              { label: 'Delete word', onClick: () => setConfirmOpen(true), danger: true },
            ]}
          />
        ) : (
          <>
            {featureFlags.boardsTags && item.cardId && (
              <button
                className={[styles.addBoardBtn, 'icon-action'].join(' ')}
                onClick={(e) => { e.stopPropagation(); setPickerOpen(true) }}
                aria-label={`Add ${item.wordText} to a board`}
                title="Add to board"
              >
                <Icon icon={FolderPlus} size={14} muted />
              </button>
            )}

            {activeBoard && item.cardId ? (
              <>
                <button
                  className={[styles.deleteBtn, 'icon-action'].join(' ')}
                  onClick={handleRemoveFromBoardClick}
                  aria-label={`Remove ${item.wordText} from ${activeBoard.name}`}
                  title={`Remove from "${activeBoard.name}"`}
                >
                  <Icon icon={FolderMinus} size={14} muted />
                </button>
                <RowActionMenu
                  triggerClassName={styles.menuBtn}
                  iconSize={14}
                  ariaLabel={`More actions for ${item.wordText}`}
                  items={[
                    { label: 'Delete word', onClick: () => setConfirmOpen(true), danger: true },
                  ]}
                />
              </>
            ) : (
              <button
                className={[styles.deleteBtn, 'icon-action'].join(' ')}
                onClick={handleRemoveClick}
                aria-label={`Delete ${item.wordText}`}
                title="Delete word"
              >
                <Icon icon={Trash2} size={14} muted />
              </button>
            )}
          </>
        )}
      </li>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Delete "${item.wordText}"?`}
        body="This word will be removed from your vocabulary. Any review progress will be lost."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={() => { setConfirmOpen(false); onRemove(item.wordId) }}
        onCancel={() => setConfirmOpen(false)}
        danger
      />

      {item.cardId && (
        <BoardPickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          cardId={item.cardId}
          wordId={item.wordId}
          assignedBoards={item.boards}
        />
      )}
    </>
  )
}
