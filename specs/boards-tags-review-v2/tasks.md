# Implementation Tasks: boards-tags-review-v2

**Status:** Planned  
**Last updated:** 2026-05-17

---

## Overview

Implementation is structured in seven phases. Each phase is independently deployable and testable. Later phases depend on earlier ones but do not require them to be user-facing — backend phases can complete before frontend phases.

Phases 1–2 are backend-only and can be deployed without any visible frontend changes. Phases 3–6 are frontend-focused. Phase 7 is polish and hardening.

---

## Phase 1: Domain and Data Model

**Goal:** Establish the database schema for boards, tags, and card notes. All new tables are added additively — no existing tables or columns are altered.

**Dependencies:** None. This phase is a prerequisite for all others.

**Risks:**
- Index creation on large tables (if the `cards` table is large) may lock writes. Use `CREATE INDEX CONCURRENTLY` in migration.
- The `lower(name)` unique index on boards and tags may require the `citext` extension or explicit lowercase normalisation. Verify PostgreSQL version support.

**Deliverables:**

- [ ] TypeORM migration: create `boards` table
- [ ] TypeORM migration: create `card_boards` join table with FK cascades
- [ ] TypeORM migration: create `tags` table with `lower(name)` unique constraint
- [ ] TypeORM migration: create `card_tags` join table with FK cascades
- [ ] TypeORM migration: create `card_notes` table with unique constraint on `card_id`
- [ ] TypeORM entities: `Board`, `CardBoard`, `Tag`, `CardTag`, `CardNote`
- [ ] Indexes: `card_boards(board_id)`, `card_tags(tag_id)`, verify `cards(next_review_date, user_id)` index exists
- [ ] Migration tested on local development database
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
- [ ] `BoardsModule`, `BoardsController`, `BoardsService`
- [ ] `GET /boards` — list with `cardCount`, optional `includeArchived`
- [ ] `POST /boards` — create with name uniqueness validation
- [ ] `PATCH /boards/:id` — update name, description, position, isArchived
- [ ] `DELETE /boards/:id` — delete with card preservation confirmation
- [ ] `GET /boards/:id/cards` — list cards in board (reuses vocabulary query)
- [ ] `POST /boards/:boardId/cards/:cardId` — assign card, idempotent
- [ ] `DELETE /boards/:boardId/cards/:cardId` — remove card, idempotent
- [ ] Ownership guard on all board operations
- [ ] DTOs with class-validator decorators
- [ ] Unit tests for `BoardsService` (name uniqueness, ownership, position)

**TagsModule:**
- [ ] `TagsModule`, `TagsController`, `TagsService`
- [ ] `GET /tags` — list with `cardCount`
- [ ] `POST /tags` — create with normalisation and uniqueness
- [ ] `PATCH /tags/:id` — rename with normalisation
- [ ] `DELETE /tags/:id` — delete with cascade to `card_tags`
- [ ] `POST /cards/:cardId/tags/:tagId` — assign, idempotent
- [ ] `DELETE /cards/:cardId/tags/:tagId` — remove, idempotent
- [ ] `POST /cards/:cardId/tags` — find-or-create and assign
- [ ] Ownership guard on all tag operations
- [ ] Unit tests for `TagsService` (name normalisation, uniqueness, find-or-create)

**VocabularyModule extensions:**
- [ ] `GET /vocabulary` extended with `boardId`, `tagIds`, `reviewState`, `partOfSpeech`, `sort`, `sortDir`, `limit`, `cursor` query params
- [ ] Query returns `boards`, `tags`, `note`, extended `reviewState` object per card
- [ ] `nextReviewHuman` string computed and included in response
- [ ] Cursor-based pagination implemented
- [ ] `POST /vocabulary` extended with optional `meaningIds` param
- [ ] `GET /cards/:cardId/note`, `PUT /cards/:cardId/note`, `DELETE /cards/:cardId/note`
- [ ] Performance: `EXPLAIN ANALYZE` on filtered query with 1000+ cards
- [ ] Integration test: filter by board, tag, review state

**ReviewsModule extensions:**
- [ ] `ReviewTimingService` — pure SM-2 preview computation for all four ratings
- [ ] Humanisation function: `humaniseReviewTime(target, now)` with full format table
- [ ] `GET /reviews/queue` extended with optional `boardId` param
- [ ] Review submission response extended with next-card previews (or separate preview endpoint — resolve in open-questions)
- [ ] Unit tests for `ReviewTimingService` (preview computation, humanisation edge cases)

**WordsModule extensions:**
- [ ] Verify `Meaning.id` is included in word lookup response. Add if missing.

---

## Phase 3: Frontend Infrastructure

**Goal:** Build the shared UI components and infrastructure that all subsequent phases depend on.

**Dependencies:** Phase 2 (API must be available for integration testing).

**Risks:**
- `BottomSheet` is the highest-risk component. Drag gesture, keyboard avoidance, and nested sheet support are each non-trivial. Implement and test on real devices (iOS Safari, Android Chrome) before considering this phase complete.
- `visualViewport` API for keyboard detection is not supported in all environments. Verify support and add a fallback.

**Deliverables:**

**shared/ui additions:**
- [ ] `BottomSheet` component: portal rendering, backdrop, drag handle
- [ ] `BottomSheet` dismiss: swipe-down gesture with threshold
- [ ] `BottomSheet` keyboard avoidance: `visualViewport` listener, sheet translation
- [ ] `BottomSheet` nested sheet support: `SheetContext` or stack management
- [ ] `BottomSheet` accessibility: `role="dialog"`, `aria-modal`, focus trap
- [ ] `ChipSelect` component: multi-select chip row
- [ ] `TagChip` component: chip with optional remove button
- [ ] `BoardChip` component: chip with optional remove button (distinct from TagChip)
- [ ] `FilterBar` component: horizontal scrollable, sticky, clear button, sort button
- [ ] `DragHandle` component
- [ ] `ReviewTimingLabel` component: formatted timing string display
- [ ] `RatingButton` extended with sub-label slot for timing preview

**shared/lib:**
- [ ] `formatReviewTime(targetDate: Date, now: Date): string` — mirrors backend humanisation logic
- [ ] Unit tests for `formatReviewTime` covering all format cases

**entities layer:**
- [ ] `entities/board` — `Board` type, `BoardSummary` type
- [ ] `entities/tag` — `Tag` type, `TagSummary` type
- [ ] `entities/card-note` — `CardNote` type
- [ ] `entities/vocabulary` extended — `VocabularyCard` extended type with `boards`, `tags`, `note`, extended `reviewState`
- [ ] `entities/review` extended — `ReviewCard` extended with `nextReviewPreviews`

**Filter state infrastructure:**
- [ ] `useVocabularyFilters` hook (filter state, setFilter, clearFilters, hasActiveFilters)
- [ ] `VocabularyFilters` type definition

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
- [ ] Board chips in filter bar (horizontal scroll, "All" chip)
- [ ] "Browse boards" chip for users with many boards
- [ ] Tag chips in filter bar (multi-select, AND logic)
- [ ] Review state filter chips
- [ ] Part-of-speech filter chips
- [ ] Sort action sheet (bottom sheet with sort options)
- [ ] Active filter visual state (filled chip)
- [ ] "Clear" button when filters active
- [ ] Filter bar sticky positioning

**Card detail bottom sheet:**
- [ ] Card detail opens as bottom sheet on card tap
- [ ] Word header section (word, transcription)
- [ ] Meanings section (read-only, scrollable)
- [ ] Notes section (expandable, inline edit, auto-save)
- [ ] Boards section (expandable, chips with remove, "+ Add to board")
- [ ] Tags section (expandable, chips with remove, inline autocomplete input)
- [ ] Review info section (interval, next review humanised, date added)
- [ ] "Remove from vocabulary" destructive action

**Board management:**
- [ ] Create board flow (bottom sheet with name input)
- [ ] Board rename (inline edit)
- [ ] Board archive (swipe action or context menu)
- [ ] Board delete (with confirmation)
- [ ] Board management accessible from Settings

**Tag management:**
- [ ] Tag management list in Settings (name, card count)
- [ ] Tag rename (inline edit)
- [ ] Tag delete (with confirmation, affected card count)

**Features:**
- [ ] `features/boards`: `useBoardsQuery`, `useCreateBoardMutation`, `useCardBoardMutation`, `BoardPickerSheet`, `CreateBoardSheet`
- [ ] `features/tags`: `useTagsQuery`, `useCreateTagMutation`, `useCardTagMutation`, `TagInputSection`
- [ ] `features/card-note`: `useCardNoteMutation`, `NoteSection`
- [ ] `features/vocabulary` filter integration: pass filters to vocabulary query

**Vocabulary list:**
- [ ] Standard card with board/tag chips (up to 2, "+N more")
- [ ] Compact card mode (toggle)
- [ ] Empty state: no filters
- [ ] Empty state: active filters, no results
- [ ] Review state badge on each card

---

## Phase 5: Advanced Editing

**Goal:** Selective meaning import and card note editing.

**Dependencies:** Phase 3 (components), Phase 2 (APIs). Can run in parallel with Phase 4.

**Risks:**
- Selective meaning import changes the save flow that existing users are familiar with. Must not feel like extra friction for users who want to save everything.
- Note auto-save on blur must handle edge cases: network error (show retry, don't lose content), empty body (delete note or leave as empty?).

**Deliverables:**

- [ ] Meaning picker bottom sheet on word save (checkboxes per meaning)
- [ ] Meaning picker: at least one meaning must be selected (Save button disabled otherwise)
- [ ] Meaning picker: pre-select meanings already saved on re-open
- [ ] Meaning picker: "Save [N] meanings" button label updates as selection changes
- [ ] `features/meaning-picker`: `MeaningPickerSheet`, `useSaveSelectedMeaningsMutation`
- [ ] Note inline edit in card detail: tap placeholder to activate, blur to save
- [ ] Note auto-save: debounced or on-blur, with loading indicator
- [ ] Note save error: inline error with retry, content preserved in local state
- [ ] Note delete: clearing the note content and blurring deletes the note (or keeps empty — resolve in open-questions)

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