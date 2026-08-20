import { useId } from 'react'
import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet/AdaptiveSheet'
import type { BoardSummary } from '../../../entities/board/model/types'
import { BoardPickerPanel } from './BoardPickerPanel'

interface BoardPickerSheetProps {
  open: boolean
  onClose: () => void
  cardId: string
  wordId: string
  assignedBoards: BoardSummary[]
}

/**
 * Standalone sheet for picking which boards a card belongs to — used
 * wherever "Add to board" is triggered directly (vocabulary rows, search
 * results), i.e. where no other sheet is already open underneath it.
 *
 * Inside an already-open sheet (the word-detail panel), the board picker is
 * instead slid in as a secondary view of that same sheet — see
 * WordDetailContainer + BoardPickerPanel — so it never stacks a second sheet
 * on top and covers the word.
 */
export function BoardPickerSheet({
  open,
  onClose,
  cardId,
  wordId,
  assignedBoards,
}: BoardPickerSheetProps) {
  const titleId = useId()

  return (
    <AdaptiveSheet open={open} onClose={onClose} label="Add to board" labelId={titleId}>
      <BoardPickerPanel
        cardId={cardId}
        wordId={wordId}
        assignedBoards={assignedBoards}
        onDismiss={onClose}
        dismissIcon="close"
        titleId={titleId}
      />
    </AdaptiveSheet>
  )
}
