import { FolderMinus, FolderPlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Icon } from '../../../shared/ui/Icon/Icon'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import { Card } from '../../../shared/ui/Card/Card'
import { Text } from '../../../shared/ui/Typography/Typography'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog'
import { useWordDetail } from '../../../shared/ui/WordDetail/WordDetailContext'
import { PosBadge } from '../../../shared/ui/PosBadge/PosBadge'
import { BoardPickerSheet } from '../../boards/ui/BoardPickerSheet'
import { useRemoveCardFromBoard } from '../../boards/model/useCardBoardMutation'
import { getCardState } from '../model/cardState'
import { featureFlags } from '../../../shared/lib/featureFlags'
import { useIsPointerDesktop } from '../../../shared/lib/useIsPointerDesktop'
import { toast } from '../../../shared/ui/Toast'
import styles from './VocabularyItem.module.css'

interface Props {
  item: VocabularyWord
  onRemove: (wordId: string) => void
  /** All word IDs in the current list, in display order. Used for panel navigation. */
  sourceList: string[]
  /** The board currently scoping this list, if the user is inside a board (not "All Vocabulary"). */
  activeBoard?: { id: string; name: string }
}

/**
 * A single vocabulary entry row.
 *
 * - Clicking anywhere on the card opens the word detail panel.
 * - The trash button opens a confirmation dialog before removing.
 * - Active state: accent dot shown while this word is open in the panel.
 */
export function VocabularyItem({ item, onRemove, sourceList, activeBoard }: Props) {
  const { open, close, activeWordId } = useWordDetail()
  const isActive = activeWordId === item.wordId
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const state = getCardState(item)
  const isPointerDesktop = useIsPointerDesktop()
  const removeFromBoard = useRemoveCardFromBoard()

  // Drag-to-board — desktop pointer only (no equivalent affordance on touch);
  // "Add to board" button below stays as the accessible/mobile path either way.
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

  const handleRemoveFromBoardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!activeBoard || !item.cardId) return
    removeFromBoard.mutate({ boardId: activeBoard.id, cardId: item.cardId, wordId: item.wordId })
    toast.success(`Removed "${item.wordText}" from "${activeBoard.name}"`)
  }

  const handleConfirmRemove = () => {
    setConfirmOpen(false)
    onRemove(item.wordId)
  }

  const handleCancelRemove = () => {
    setConfirmOpen(false)
  }

  return (
    <>
      {/* Full card is clickable — onClick propagates from inner rowButton naturally.
          The card-level onClick catches clicks on padding/whitespace areas. */}
      <Card
        as="li"
        ref={setDragRef}
        padding="sm"
        interactive
        className={[
          styles.item,
          styles[`state_${state}`],
          dndActive ? styles.itemDraggable : '',
          isDragging ? styles.itemDragging : '',
        ].join(' ')}
        onClick={handleOpen}
        {...dragListeners}
      >
        {/* Main row body — content + keyboard activation */}
        <div
          role="button"
          className={styles.rowButton}
          aria-label={isActive ? `Close detail for ${item.wordText}` : `Open detail for ${item.wordText}`}
          aria-pressed={isActive}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen() } }}
        >
          <div className={styles.wordRow}>
            <Text variant="label" as="span" className={styles.word}>
              {item.wordText}
            </Text>
            {item.transcription && (
              <span className={styles.transcription}>/{item.transcription}/</span>
            )}
            {isActive && <span className={styles.activeDot} aria-hidden="true" />}
          </div>

          {item.meanings.length > 0 && (
            <ul className={styles.meanings}>
              {item.meanings.slice(0, 3).map((m) => (
                <li key={m.id} className={styles.meaning}>
                  {m.partOfSpeech && (
                    <PosBadge pos={m.partOfSpeech} />
                  )}
                  <Text variant="caption" color="secondary" as="span" className={styles.definition}>
                    {m.definition}
                  </Text>
                </li>
              ))}
              {item.meanings.length > 3 && (
                <li className={styles.moreCount}>
                  <Text variant="caption" color="secondary" as="span">
                    +{item.meanings.length - 3} more
                  </Text>
                </li>
              )}
            </ul>
          )}

          {/* Board / tag chips */}
          {featureFlags.boardsTags && (item.boards.length > 0 || item.tags.length > 0) && (
            <div className={styles.metaChips}>
              {item.boards.slice(0, 2).map((b) => (
                <span key={b.id} className={styles.boardChip}>{b.name}</span>
              ))}
              {item.tags.slice(0, 2).map((t) => (
                <span key={t.id} className={styles.tagChip}>{t.name}</span>
              ))}
              {(item.boards.length + item.tags.length) > 4 && (
                <span className={styles.moreChip}>
                  +{(item.boards.length + item.tags.length) - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons — stop propagation so they don't also open the panel */}
        <div className={styles.rowActions}>
          {featureFlags.boardsTags && item.cardId && (
            <button
              className={[styles.addBoardBtn, 'icon-action'].join(' ')}
              onClick={(e) => { e.stopPropagation(); setPickerOpen(true) }}
              aria-label={`Add ${item.wordText} to a board`}
              title="Add to board"
            >
              <Icon icon={FolderPlus} size={15} muted />
            </button>
          )}

          {/* Inside a board: primary action is unlinking from *this* board, not
              deleting the word — full delete stays reachable via the detail panel. */}
          {activeBoard && item.cardId ? (
            <button
              className={[styles.removeBtn, 'icon-action'].join(' ')}
              onClick={handleRemoveFromBoardClick}
              aria-label={`Remove ${item.wordText} from ${activeBoard.name}`}
              title={`Remove from "${activeBoard.name}"`}
            >
              <Icon icon={FolderMinus} size={15} muted />
            </button>
          ) : (
            <button
              className={[styles.removeBtn, 'icon-action'].join(' ')}
              onClick={handleRemoveClick}
              aria-label={`Delete ${item.wordText} from vocabulary`}
              title="Delete word"
            >
              <Icon icon={Trash2} size={15} muted />
            </button>
          )}
        </div>
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Delete "${item.wordText}"?`}
        body="This word will be removed from your vocabulary. Any review progress will be lost."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
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
