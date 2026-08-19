## Why

Assigning a word to a board currently has exactly one path in the entire app: open the word's detail panel, scroll past the dictionary content and personal note, and use a text link buried near the bottom. That path doesn't exist at all on the Search page — the moment a user is most likely to want to file a word into a board, right after saving it — because the panel's Boards section only renders in `context === 'vocabulary'`. Newly created boards also dead-end into a "No matches / try a different search term" empty state with no way forward. The result, confirmed by direct investigation of the code: users report they can't figure out how to add words to boards at all.

## What Changes

- Add a quick-assign board action directly on each vocabulary list row (compact and detailed views), so assigning a board no longer requires opening the full word-detail panel.
- Add the same board-assignment affordance to the Search page's save flow, so a word can be filed into a board at the moment it's saved.
- Auto-select a newly created board for the word that prompted its creation (both from the existing panel picker and the new quick-assign surfaces) — no more creating a board and then having to find and tap it again.
- Replace the generic "No matches" empty state with a dedicated "This board is empty" state (with a way to go find words to add) whenever the active board itself has zero cards, distinct from a filter producing zero results.
- Move the panel's Boards section above the Note section so it doesn't require scrolling past dictionary content on words with many senses.

## Capabilities

### New Capabilities
- `board-assignment`: Every user-facing surface for assigning a word to a board — list quick-actions, the search-time picker, and the shared underlying assign/unassign mutations' UX contract (auto-select on create, dedicated empty states).

### Modified Capabilities
(none — no existing capability in `openspec/specs/` currently documents board-assignment UI behavior; `board-sharing`, added in the previous change, is unrelated: that covers link-sharing/cloning between users, not assigning a user's own words to their own boards)

## Impact

- **Mostly frontend**, plus one small additive backend change. The existing `POST /boards/:boardId/cards/:cardId` / `DELETE /boards/:boardId/cards/:cardId` endpoints and `useAssignCardToBoard`/`useRemoveCardFromBoard` hooks already do everything needed for the mutations; this change is mostly about exposing them from more places. The one gap: `GET /vocabulary/words/:wordId/status` (used by Search) doesn't currently return the saved word's `cardId` or current board memberships, both of which the board picker needs to open correctly-checked from Search — this DTO gains two fields.
- Touches: `VocabularyItem.tsx`, `VocabularyItemCompact.tsx` (features/vocabulary/ui) — new quick-assign affordance.
- Touches: `vocabulary.service.ts` (`WordSavedStatusDto`, `getWordSavedStatus`) — add `cardId` and `boards` fields; `useWordSavedStatus.ts`, `WordEntry.tsx` (features/word-search) — board assignment reachable from Search.
- Touches: `BoardsSection.tsx`, `BoardPickerSheet.tsx` (features/boards/ui) — auto-select newly created board; reused as the shared picker UI for the new quick-assign entry points rather than building a second picker component.
- Touches: `VocabularyList.tsx`, `VocabularyPage.tsx` (features/vocabulary/ui, pages/vocabulary) — dedicated empty-board empty state.
- Touches: `WordDetailContent.tsx` section ordering.
