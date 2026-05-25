# Implementation Tasks: boards-tags-review-v2

**Status:** In Progress  
**Last updated:** 2026-05-25

---

## Overview

Implementation is structured in seven phases. Each phase is independently deployable and testable. Later phases depend on earlier ones but do not require them to be user-facing — backend phases can complete before frontend phases.

Phases 1–2 are backend-only and can be deployed without any visible frontend changes. Phases 3–6 are frontend-focused. Phase 7 is polish and hardening.

---

## Phase 1: Domain and Data Model

**Goal:** Establish the database schema for boards, tags, and card notes. All new tables are added additively — no existing tables or columns are altered.

**Dependencies:** None. This phase is a prerequisite for all others.

**Risks:**
- ~~Index creation on large tables (if the `cards` table is large) may lock writes. Use `CREATE INDEX CONCURRENTLY` in migration.~~ New tables are empty at migration time — regular `CREATE INDEX` is safe and simpler (CONCURRENTLY cannot run inside a transaction, which TypeORM migrations use).
- ~~The `lower(name)` unique index on boards and tags may require the `citext` extension or explicit lowercase normalisation.~~ Resolved: `citext` extension was already enabled (migration 007). `boards.name` and `tags.name` are stored as `CITEXT` — unique constraint is case-insensitive by default.

**Deliverables:**

- [x] TypeORM migration: create `boards` table (`1748000001000-CreateBoards.ts`)
- [x] TypeORM migration: create `card_boards` join table with FK cascades (`1748000002000-CreateCardBoards.ts`)
- [x] TypeORM migration: create `tags` table with `citext` unique constraint (`1748000003000-CreateTags.ts`)
- [x] TypeORM migration: create `card_tags` join table with FK cascades (`1748000004000-CreateCardTags.ts`)
- [x] TypeORM migration: create `card_notes` table with unique constraint on `card_id` (`1748000005000-CreateCardNotes.ts`)
- [x] TypeORM entities: `Board`, `CardBoard`, `Tag`, `CardTag`, `CardNote`
- [x] Indexes: `idx_card_boards_board_id`, `idx_card_boards_card_id`, `idx_card_tags_tag_id`, `idx_card_tags_card_id`, `idx_boards_user_id`, `idx_boards_user_position`, `idx_tags_user_id`. `idx_cards_user_next` already exists from migration 005/007.
- [x] Migration tested on local development database (up/down/up verified)
- [ ] Migration tested on a production-representative dataset (if available)

---

## Phase 2: Backend APIs

**Goal:** Implement all new and extended REST endpoints. Frontend is not involved.

**Dependencies:** Phase 1 (database schema must exist).

**Risks:**
- Extended vocabulary list query performance. Must be tested with realistic data volume (1000+ cards per user) and reviewed with `EXPLAIN ANALYZE` before deployment.
- Ownership guard correctness. Security-critical: every board and tag operation must verify user ownership.
- The `ReviewTimingService.computePreviews()` function must match the SM-2 implementation used for actual scheduling, or preview labels will be misleading.

**Deliverables:**

**BoardsModule:**
- [x] `BoardsModule`, `BoardsController`, `BoardsService`
- [x] `GET /boards` — list with `cardCount`, optional `includeArchived`
- [x] `POST /boards` — create with name uniqueness validation
- [x] `PATCH /boards/:id` — update name, description, position, isArchived
- [x] `DELETE /boards/:id` — delete with card preservation confirmation
- [x] `GET /boards/:id/cards` — list cards in board (reuses vocabulary query)
- [x] `POST /boards/:boardId/cards/:cardId` — assign card, idempotent
- [x] `DELETE /boards/:boardId/cards/:cardId` — remove card, idempotent
- [x] Ownership guard on all board operations
- [x] DTOs with class-validator decorators
- [x] Unit tests for `BoardsService` (name uniqueness, ownership, position)

**TagsModule:**
- [x] `TagsModule`, `TagsController`, `TagsService`
- [x] `GET /tags` — list with `cardCount`
- [x] `POST /tags` — create with normalisation and uniqueness
- [x] `PATCH /tags/:id` — rename with normalisation
- [x] `DELETE /tags/:id` — delete with cascade to `card_tags`
- [x] `POST /cards/:cardId/tags/:tagId` — assign, idempotent
- [x] `DELETE /cards/:cardId/tags/:tagId` — remove, idempotent
- [x] `POST /cards/:cardId/tags` — find-or-create and assign
- [x] Ownership guard on all tag operations
- [x] Unit tests for `TagsService` (name normalisation, uniqueness, find-or-create)

**VocabularyModule extensions:**
- [x] `GET /vocabulary` extended query params — `boardId`, `tagIds`, `reviewState`, `partOfSpeech`, `sortDir` all done
- [x] Query returns `boards`, `tags`, `note`, `reviewState`, `cardId` per card (batch fetch + merge)
- [x] `nextReviewHuman` string computed and included in response
- [x] Cursor-based pagination — deferred (offset pagination kept; TODO comment added)
- [x] `POST /vocabulary` extended with optional `meaningIds` param — migration `1749000001000`, `SaveWordDto`, `saveWord(userId, wordId, dto?)`, vocabulary query filters meanings by `selectedMeaningIds`
- [x] `GET /cards/:cardId/note`, `PUT /cards/:cardId/note`, `DELETE /cards/:cardId/note`
- [ ] Performance: `EXPLAIN ANALYZE` on filtered query with 1000+ cards
- [x] Unit tests: filter by board, tag, reviewState, partOfSpeech, sortDir; reviewState computation; nextReviewHuman

**ReviewsModule extensions:**
- [x] `ReviewTimingService` — `sm2.ts` extracted + `ReviewTimingService` class with `computePreviews()`
- [x] Humanisation function: `humaniseReviewTime(target, now)` with full format table
- [x] `GET /reviews/next` extended with optional `boardId` param
- [x] Review submission response extended with `nextReviewPreviews` on `GET /reviews/answer/:cardId`
- [x] Unit tests for `ReviewTimingService` (preview computation, humanisation edge cases)

**WordsModule extensions:**
- [x] Verify `Meaning.id` is included in word lookup response. Add if missing. — confirmed present

---

## Phase 3: Frontend Infrastructure

**Goal:** Build the shared UI components and infrastructure that all subsequent phases depend on.

**Dependencies:** Phase 2 (API must be available for integration testing).

**Risks:**
- `BottomSheet` is the highest-risk component. Drag gesture, keyboard avoidance, and nested sheet support are each non-trivial. Implement and test on real devices (iOS Safari, Android Chrome) before considering this phase complete.
- `visualViewport` API for keyboard detection is not supported in all environments. Verify support and add a fallback.

**Deliverables:**

**shared/ui additions:**
- [x] `BottomSheet` component: portal rendering, backdrop, drag handle
- [x] `BottomSheet` dismiss: swipe-down gesture with threshold
- [x] `BottomSheet` keyboard avoidance: `visualViewport` listener, sheet translation
- [x] `BottomSheet` nested sheet support: `SheetContext` or stack management
- [x] `BottomSheet` accessibility: `role="dialog"`, `aria-modal`, focus trap
- [x] `ChipSelect` component: multi-select chip row
- [x] `TagChip` component: chip with optional remove button
- [x] `BoardChip` component: chip with optional remove button (distinct from TagChip)
- [x] `FilterBar` component: horizontal scrollable, sticky, clear button, sort button
- [x] `DragHandle` component
- [x] `ReviewTimingLabel` component: formatted timing string display
- [x] `RatingButton` extended with sub-label slot for timing preview

**shared/lib:**
- [x] `formatReviewTime(targetDate: Date, now: Date): string` — mirrors backend humanisation logic
- [x] Unit tests for `formatReviewTime` covering all format cases

**entities layer:**
- [x] `entities/board` — `Board` type, `BoardSummary` type
- [x] `entities/tag` — `Tag` type, `TagSummary` type
- [x] `entities/card-note` — `CardNote` type
- [x] `entities/vocabulary` extended — `VocabularyCard` extended type with `boards`, `tags`, `note`, extended `reviewState`
- [x] `entities/review` extended — `ReviewCard` extended with `nextReviewPreviews`

**Filter state infrastructure:**
- [x] `useVocabularyFilters` hook (filter state, setFilter, clearFilters, hasActiveFilters)
- [x] `VocabularyFilters` type definition

---

## Phase 4: Boards and Tags UX

**Goal:** User-facing boards and tags functionality on the vocabulary list and card detail.

**Dependencies:** Phase 3 (components), Phase 2 (APIs).

**Risks:**
- Board picker UX within a nested bottom sheet is complex. Validate on device.
- Inline tag input with autocomplete may conflict with mobile keyboard autocorrect. Test and disable autocorrect/autocapitalise on the tag input.
- Filter bar horizontal scroll + sticky positioning can conflict with page scroll on mobile. Test scroll behavior carefully.

**Deliverables:**

**Filter bar:**
- [x] Board chips in filter bar (horizontal scroll, single-select)
- [x] "Browse boards" chip for users with many boards (>5 boards)
- [x] Tag chips in filter bar (multi-select, AND logic)
- [x] Review state filter chips
- [x] Part-of-speech filter chips
- [x] Sort action sheet (bottom sheet with sort options)
- [x] Active filter visual state (filled chip)
- [x] "Clear" button when filters active
- [x] Filter bar sticky positioning

**Card detail bottom sheet:**
- [x] Card detail opens as bottom sheet on card tap
- [x] Word header section (word, transcription)
- [x] Meanings section (read-only, scrollable)
- [x] Notes section (expandable, inline edit, auto-save)
- [x] Boards section (expandable, chips with remove, "+ Add to board")
- [x] Tags section (expandable, chips with remove, inline autocomplete input)
- [x] Review info section (interval, next review humanised, date added)
- [x] "Remove from vocabulary" destructive action (inline confirm flow)

**Board management:**
- [x] Create board flow (bottom sheet with name input)
- [x] Board rename (inline edit)
- [x] Board archive (toggle from manage sheet)
- [x] Board delete (with confirmation)
- [x] Board management accessible from Settings

**Tag management:**
- [x] Tag management list in Settings (name, card count)
- [x] Tag rename (inline edit)
- [x] Tag delete (with confirmation, affected card count)

**Features:**
- [x] `features/boards`: `useBoardsQuery`, `useCreateBoardMutation`, `useCardBoardMutation`, `BoardPickerSheet`, `CreateBoardSheet`, `ManageBoardsSheet`
- [x] `features/tags`: `useTagsQuery`, `useCreateTagMutation`, `useCardTagMutation`, `TagInputSection`, `ManageTagsSheet`
- [x] `features/card-note`: `useCardNoteMutation`, `NoteSection`
- [x] `features/vocabulary` filter integration: pass filters to vocabulary query

**Vocabulary list:**
- [x] Standard card with board/tag chips (up to 2, "+N more")
- [x] Compact card mode (toggle)
- [x] Empty state: no filters
- [x] Empty state: active filters, no results
- [x] Review state badge on each card

---

## Phase 5: Advanced Editing

**Goal:** Selective meaning import and card note editing.

**Dependencies:** Phase 3 (components), Phase 2 (APIs). Can run in parallel with Phase 4.

**Risks:**
- Selective meaning import changes the save flow that existing users are familiar with. Must not feel like extra friction for users who want to save everything.
- Note auto-save on blur must handle edge cases: network error (show retry, don't lose content), empty body (delete note or leave as empty?).

**Deliverables:**

- [x] Meaning picker bottom sheet on word save (checkboxes per meaning)
- [x] Meaning picker: at least one meaning must be selected (Save button disabled otherwise)
- [x] Meaning picker: pre-select meanings already saved on re-open
- [x] Meaning picker: "Save [N] meanings" button label updates as selection changes
- [x] `features/meaning-picker`: `MeaningPickerSheet`, `useSaveSelectedMeaningsMutation`
- [x] Note inline edit in card detail: tap placeholder to activate, blur to save
- [x] Note auto-save: debounced or on-blur, with loading indicator
- [x] Note save error: inline error with retry, content preserved in local state
- [x] Note delete: clearing the note content and blurring deletes the note — PUT with empty body, backend deletes the row (Q12 resolved)

---

## Phase 6: Review Improvements

**Goal:** Review timing visibility on card flip, humanised labels, board-filtered review sessions, extended session summary.

**Dependencies:** Phase 3 (components), Phase 2 (APIs — specifically `ReviewTimingService` and extended queue endpoint).

**Risks:**
- Rating preview labels depend on accurate SM-2 preview computation from the backend. If the preview logic diverges from the actual scheduling logic, previews will be misleading. Must have a test that validates preview against actual outcome.
- Board-filtered session entry point UX must be intuitive. The button placement and text must make it clear the session is scoped to the board.

**Deliverables:**

- [ ] Rating buttons extended with timing sub-labels on card flip
- [ ] `nextReviewPreviews` data fetched from API and displayed
- [ ] Review state badge on vocabulary list cards ("Due", "In N days", "New", "Mastered")
- [ ] Review info section in card detail bottom sheet
- [ ] Board-filtered session: "Review this board" entry point on vocabulary list (when board filter active)
- [ ] Board-filtered session: review queue limited to board cards
- [ ] Session summary: breakdown by rating (Again/Hard/Good/Easy counts with icons)
- [ ] Session summary: next session timing ("Next cards due: in 3 hours")
- [ ] Session summary: board name shown if board-filtered
- [ ] Empty session state: "No cards due in [Board Name]" with fallback to full queue
- [ ] `features/review` extended: board filter param, summary breakdown, timing previews

---

## Phase 7: Polish and Refinement

**Goal:** Hardening, accessibility, performance verification, empty states, edge cases.

**Dependencies:** Phases 1–6 functionally complete.

**Risks:**
- Performance on real devices with large vocabularies (200+ cards) must be verified. Scroll performance of the vocabulary list with chips and badges is the main concern.
- Accessibility: bottom sheets must be fully operable with screen readers. Focus trapping and ARIA roles must be correct.

**Deliverables:**

- [ ] All empty states implemented (see ux.md for the full table)
- [ ] Error states: network errors on board/tag mutations show toast, roll back optimistic update
- [ ] Loading states: skeleton loaders for vocabulary list on first load and filter change
- [ ] Accessibility audit: bottom sheets, filter bar, chip select, card detail
- [ ] VoiceOver (iOS) and TalkBack (Android) spot-check for primary flows
- [ ] Performance: vocabulary list scroll frame rate on device with 500+ cards
- [ ] Performance: extended vocabulary query latency with 1000+ cards — confirm < 300ms p95
- [ ] Keyboard navigation (desktop): focus order through filter bar, card list, card detail sheet
- [ ] Animation: bottom sheet open/close is smooth (60fps) on low-end device
- [ ] Feature flag: confirm boards/tags UI can be toggled off cleanly
- [ ] Documentation: update README with new features and setup notes if needed
- [ ] QA: end-to-end test of primary user flows (see ux.md Ideal User Flows A–E)

---

## Phase Dependencies Summary

```
Phase 1 (DB schema)
    └── Phase 2 (Backend APIs)
            ├── Phase 3 (Frontend infrastructure)
            │       ├── Phase 4 (Boards/Tags UX)
            │       ├── Phase 5 (Advanced editing)
            │       └── Phase 6 (Review improvements)
            │               └── Phase 7 (Polish)
            └── (can deploy Phase 1+2 without Phase 3+)
```

Phases 4, 5, and 6 can be parallelised once Phase 3 is complete.

Phase complete when:
- all tests pass
- no TS errors
- no eslint errors
- endpoints documented
- migrations reversible