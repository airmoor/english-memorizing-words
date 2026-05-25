import { useState } from 'react'
import type { BoardSummary } from '../../../entities/board/model/types'
import { BoardChip } from '../Chip/BoardChip'
import { BoardPickerSheet } from '../../../features/boards/ui/BoardPickerSheet'
import { CreateBoardSheet } from '../../../features/boards/ui/CreateBoardSheet'
import { useRemoveCardFromBoard } from '../../../features/boards/model/useCardBoardMutation'
import styles from './BoardsSection.module.css'

interface BoardsSectionProps {
  cardId: string
  wordId: string
  boards: BoardSummary[]
}

/**
 * Boards section in card detail.
 * Shows board chips with remove button and an "+ Add to board" button
 * that opens the BoardPickerSheet (nested bottom sheet).
 */
export function BoardsSection({ cardId, wordId, boards }: BoardsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
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
          onClick={() => setPickerOpen(true)}
          aria-label="Add to board"
        >
          + Add to board
        </button>
      </div>

      <BoardPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        cardId={cardId}
        wordId={wordId}
        assignedBoards={boards}
        onCreateNew={() => {
          setPickerOpen(false)
          setCreateOpen(true)
        }}
      />

      <CreateBoardSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setPickerOpen(true)}
      />
    </section>
  )
}
