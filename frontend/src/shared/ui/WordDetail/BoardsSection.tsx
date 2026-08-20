import { useState } from 'react'
import type { BoardSummary } from '../../../entities/board/model/types'
import { BoardChip } from '../Chip/BoardChip'
import { BoardPickerSheet } from '../../../features/boards/ui/BoardPickerSheet'
import { useRemoveCardFromBoard } from '../../../features/boards/model/useCardBoardMutation'
import styles from './BoardsSection.module.css'

interface BoardsSectionProps {
  cardId: string
  wordId: string
  boards: BoardSummary[]
  /**
   * When provided (mobile word-detail sheet), "Add to board" routes here
   * instead of opening BoardPickerSheet as its own stacked sheet — the
   * parent sheet slides to a secondary view. Omit to fall back to the
   * standalone sheet (desktop side panel, where stacking isn't a problem).
   */
  onRequestAddToBoard?: () => void
}

/**
 * Boards section in card detail.
 * Shows board chips with remove button and an "+ Add to board" button
 * that opens the board picker.
 */
export function BoardsSection({ cardId, wordId, boards, onRequestAddToBoard }: BoardsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const removeMutation              = useRemoveCardFromBoard()

  return (
    <section className={styles.section} aria-label="Boards">
      <div className={styles.header}>
        <span className={styles.title}>Boards</span>
      </div>

      <div className={styles.content}>
        {boards.map((board) => (
          <BoardChip
            key={board.id}
            label={board.name}
            onRemove={() => removeMutation.mutate({ boardId: board.id, cardId, wordId })}
          />
        ))}

        <button
          type="button"
          className={styles.addBtn}
          onClick={() => (onRequestAddToBoard ? onRequestAddToBoard() : setPickerOpen(true))}
          aria-label="Add to board"
        >
          + Add to board
        </button>
      </div>

      {!onRequestAddToBoard && (
        <BoardPickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          cardId={cardId}
          wordId={wordId}
          assignedBoards={boards}
        />
      )}
    </section>
  )
}
