## 1. Backend: expose card + boards on word-saved-status

- [x] 1.1 Add `cardId: string | null` and `boards: BoardSummaryDto[]` to `WordSavedStatusDto` (`backend/src/vocabulary/vocabulary.service.ts`)
- [x] 1.2 Update `getWordSavedStatus` query: LEFT JOIN `cards` on `(user_id, word_id)` for `cardId`; when a card exists, fetch its `card_boards` → `boards` (name, id) in one extra query
- [x] 1.3 Update/add unit tests in `vocabulary.service.spec.ts` for the new fields (saved word with boards, saved word with no boards, unsaved word)

## 2. Frontend: list quick-assign (compact + detailed views)

- [x] 2.1 Add a board-assignment icon button to `VocabularyItemCompact.tsx`, next to the existing delete button, gated by `featureFlags.boardsTags` and `item.cardId`
- [x] 2.2 Add the same to `VocabularyItem.tsx` (detailed view)
- [x] 2.3 Each row manages its own local `BoardPickerSheet` open state and passes `cardId`, `wordId`, `assignedBoards={item.boards}` — reuse `BoardPickerSheet` as-is, no new picker component
- [x] 2.4 Verify row layout doesn't crowd the delete button in either view (visual check, both view modes)

## 3. Frontend: Search quick-assign

- [x] 3.1 Extend `fetchWordSavedStatus` response type and `useWordSavedStatus.ts` to surface `cardId` and `boards` from the extended backend DTO
- [x] 3.2 Add a board-assignment control to `WordEntry.tsx`'s saved-word UI (near "Saved ✓" / "View in Vocabulary"), shown only when `isSaved && cardId` is present
- [x] 3.3 Wire it to the same `BoardPickerSheet`, passing the `cardId`/`wordId`/`boards` now available from `useWordSavedStatus`

## 4. Auto-select newly created board

- [x] 4.1 In `BoardsSection.tsx`, change `CreateBoardSheet`'s `onCreated` to assign the new board to the current `cardId`/`wordId` before reopening the picker (needs `useAssignCardToBoard` imported alongside the existing `useRemoveCardFromBoard`)
- [x] 4.2 Apply the same pattern to the new list-row and Search quick-assign pickers from tasks 2 and 3 (their own "New board" flow, if they offer one — reuse `BoardPickerSheet`'s existing `onCreateNew` prop)
- [x] 4.3 Confirm board-creation entry points NOT tied to a word (sidebar "+ New board", Home's first-board CTA) are untouched — no auto-assign there

## 5. Empty-board empty state

- [x] 5.1 In `VocabularyPage.tsx`, compute `isEmptyBoard` (board selected, no search/filter active, `stableContextTotal === 0`) alongside the existing `isEmpty`/`isFiltering` logic
- [x] 5.2 Pass `isEmptyBoard` and a "back to all vocabulary" callback (reuse `handleBoardSelect(undefined)`) into `VocabularyList.tsx`
- [x] 5.3 Add a third empty-state branch in `VocabularyList.tsx` (between the existing "no words at all" and "no filter matches" branches): "This board is empty" + button back to All Vocabulary
- [x] 5.4 Confirm the existing "no matches" branch still fires correctly when filtering inside a non-empty board to zero results

## 6. Panel section reorder

- [x] 6.1 In `WordDetailContent.tsx`, move the `BoardsSection` block above `NoteSection` inside the `context === 'vocabulary'` block (pure reorder, no prop changes)

## 7. Verification

- [x] 7.1 Manual pass: from the vocabulary list, assign a word to a board via the new row icon without opening the detail panel; confirm it appears correctly in the panel afterward
- [x] 7.2 Manual pass: from Search, save a new word and assign it to a board via the new control; confirm it shows up in that board on the Vocabulary page
- [x] 7.3 Manual pass: create a new board from a word's picker; confirm that word is pre-checked/assigned without an extra tap
- [x] 7.4 Manual pass: create an empty board from the sidebar, select it, confirm the new "this board is empty" state appears (not the old "no matches" copy)
- [x] 7.5 Confirm existing filter-driven "no matches" state still works inside a non-empty board
