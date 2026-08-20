## Context

Board↔card membership already has one clean mutation surface: `useAssignCardToBoard`/`useRemoveCardFromBoard` (`features/boards/model/useCardBoardMutation.ts`), wired to `POST`/`DELETE /boards/:boardId/cards/:cardId`, with optimistic cache updates already in place. The UI problem is entirely about *exposure*: the only component that lets a user drive those mutations is `BoardPickerSheet`, and it is only ever instantiated from `BoardsSection`, which is only ever rendered inside `WordDetailContent` when `context === 'vocabulary'` — never from the vocabulary list rows directly, never from Search.

`BoardPickerSheet` itself is already a clean, self-contained, reusable unit — `{ open, onClose, cardId, wordId, assignedBoards, onCreateNew? }`, internally wired to both mutations. It does not need to be rebuilt; it needs more call sites.

## Goals / Non-Goals

**Goals:**
- Let a user assign a word to a board from the vocabulary list itself, without opening the detail panel.
- Let a user assign a word to a board from Search, right when they save it.
- Auto-select a newly created board for whichever word prompted its creation.
- Give a genuinely empty board its own empty state instead of the "no filter matches" one.
- Reduce scroll distance to the Boards section inside the detail panel.

**Non-Goals:**
- No bulk multi-select ("select 5 words, add all to a board") — a real feature, but a separate one; this change is about discoverability of the existing single-word flow, not adding new bulk mechanics.
- No drag-and-drop. Same reasoning — bigger, separate effort, not what's blocking today.
- No backend changes. Every mutation this change uses already exists and already works; this is purely about where the trigger lives.

## Decisions

**Reuse `BoardPickerSheet` everywhere, don't build a second picker.**
It already takes exactly the primitives every call site has (`cardId`, `wordId`, `assignedBoards`). The only new work per call site is: local `open`/`onClose` state, and passing those three props from whatever `VocabularyWord`-shaped data is already in scope. Alternative considered: a shared "quick-assign popover" distinct from the sheet, for a lighter-weight feel on desktop — rejected for this change; `AdaptiveSheet` (which `BoardPickerSheet` already uses) already renders as a compact centered modal on desktop and a bottom sheet on mobile, which is adequate, and introducing a second visual pattern for the same action would itself be a consistency problem.

**List quick-assign is a new icon button per row, gated by the same `featureFlags.boardsTags` flag already used for chips.**
Added to both `VocabularyItem` and `VocabularyItemCompact`, next to the existing delete button. Guarded on `item.cardId` being non-null (defensively — in practice always true for a saved vocabulary item).

**Extend `GET /vocabulary/words/:wordId/status` with `cardId` and `boards`, rather than a second endpoint.**
`BoardPickerSheet` needs a `cardId` (to call the assign/remove mutations) and the word's current `assignedBoards` (to render correct checked state). Search's `useWordSavedStatus` currently only knows `isSaved`/`meaningIds` — it has no `cardId` and no board data at all. Both are one JOIN away from the query `getWordSavedStatus` already runs (`cards` on `(user_id, word_id)` for `cardId`; `card_boards` → `boards` on that `cardId` for `boards`), so extending this existing per-word status DTO is the smallest correct fix. Alternative considered: a new dedicated endpoint just for this — rejected, this data belongs conceptually with "status of this word for this user," which is exactly what this endpoint already answers.

**Search gets its own quick-assign trigger on `WordEntry`, not a loosened `BoardsSection` context gate.**
Alternative considered: render `BoardsSection` when `context === 'search'` too. Rejected — `BoardsSection` living inside `WordDetailContent`'s vocabulary-only block also gates Notes/Tags/Review-info, none of which make sense on a search result card, and loosening just the Boards piece out of that block means special-casing one section's context check while leaving the others alone — more surface area for a subtler bug than adding one small button directly to `WordEntry`'s existing saved-state UI (next to "Saved ✓" / "View in Vocabulary").

**Auto-select on board creation: assign before reopening the picker, not a separate confirmation step.**
`CreateBoardSheet`'s `onCreated` already receives the new board's id. Every call site that creates a board *from within a word's assignment flow* (currently only `BoardsSection`; the new quick-assign surfaces reuse the same pattern) changes `onCreated={() => setPickerOpen(true)}` to `onCreated={(boardId) => { assign({ boardId, cardId, wordId }); setPickerOpen(true) }}`. The board-creation entry points that are *not* tied to a specific word (sidebar "+ New board", Home's "Create your first board") are unaffected — there is no word to assign in that context.

**Empty-board state is a new explicit condition, not a new component.**
Today `VocabularyPage.tsx` computes `isEmpty` as "no words at all, ever" and deliberately excludes the board-scoped case (`!urlBoard` in the condition) — so a genuinely empty board falls through to `VocabularyList`'s generic "no filter matches" branch. Add a second boolean, `isEmptyBoard` (board selected, no search/filter active, board's total is 0), computed alongside the existing `isEmpty`/`isFiltering` logic already in `VocabularyPage.tsx`, and a third rendering branch in `VocabularyList.tsx` — copy: "This board is empty," with a CTA back to All Vocabulary (`handleBoardSelect(undefined)`, already exists) so the user can use the new list quick-assign icons to populate it from their existing words.

**Move `BoardsSection` above `NoteSection` inside the vocabulary-context block of `WordDetailContent`.**
Pure reorder, no behavior change. Boards are (per this change) becoming a more central action; Notes stay in the panel but no longer sit in front of it.

## Risks / Trade-offs

- **[Risk]** Adding a new icon button to already-dense list rows (`VocabularyItemCompact` in particular is a tight single-line row) could crowd the delete button → **Mitigation**: match the existing delete button's sizing/hover pattern exactly rather than inventing new spacing; verify visually on both compact and detailed views before calling this done.
- **[Trade-off]** `BoardPickerSheet` opening as a full `AdaptiveSheet` (modal/bottom-sheet) from a single list-row tap is a heavier interaction than an inline popover would be — accepted for consistency (one visual pattern for "assign a board," see Decisions) and because it's the same interaction users already learn from the detail panel.
- **[Risk]** `isEmptyBoard` and `isEmpty` are similar-sounding booleans computed side by side in `VocabularyPage.tsx` — → **Mitigation**: keep them mutually exclusive by construction (`isEmptyBoard` requires `!!urlBoard`, `isEmpty` requires `!urlBoard`) and name them so the distinction is legible at the call site, not just in a comment.

## Migration Plan

Not applicable — additive UI-only change, no data migration, no rollout sequencing required. Safe to ship as a single change; each of the five "What Changes" items is independently useful and none depends on shipping the others first, but they're small enough to bundle in one review.

## Open Questions

- Should the list quick-assign icon show a filled/active state when the word is already on at least one board (like the existing shared-indicator dot pattern from the board-sharing change), so a glance at the list tells you which words are already organized? Leaning toward yes as a fast follow, but not blocking this change — the picker itself already shows checked state once opened.
