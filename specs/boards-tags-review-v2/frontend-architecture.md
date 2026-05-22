# Frontend Architecture: boards-tags-review-v2

**Status:** Planned  
**Last updated:** 2026-05-17

---

## Overview

The frontend is structured using a Feature-Sliced Design (FSD) pattern with layers: `app`, `pages`, `features`, `entities`, `shared`. This initiative extends all layers.

No layer boundaries are broken. The architecture does not introduce new routing paradigms. Boards and tags are treated as domain entities that compose with the existing vocabulary and review features.

---

## FSD Layer Impact

### `entities/`

New entity modules:

| Entity | Purpose |
|---|---|
| `entities/board` | Board type definitions, API response types, board-level transformations |
| `entities/tag` | Tag type definitions, API response types |
| `entities/card-note` | CardNote type definitions |

Modified entity modules:

| Entity | Change |
|---|---|
| `entities/vocabulary` | Extend `Card` / `VocabularyCard` type to include `boards`, `tags`, `note`, extended `reviewState` with `nextReviewHuman` |
| `entities/review` | Extend `ReviewCard` type to include `nextReviewPreviews` (timing per rating) |

Entity modules contain only types, constants, and pure transformation functions. They do not contain API calls or hooks.

---

### `features/`

New feature modules:

| Feature | Responsibilities |
|---|---|
| `features/boards` | Board CRUD, card-board assignment, board picker UI |
| `features/tags` | Tag CRUD, card-tag assignment, tag input UI |
| `features/card-note` | Note create/update/delete, inline note editor |
| `features/meaning-picker` | Selective meaning import UI on word save |

Modified feature modules:

| Feature | Change |
|---|---|
| `features/vocabulary` | Add filter bar logic, sort logic, compact mode toggle, card detail bottom sheet composition |
| `features/review` | Add board filter entry point, next-review timing previews on card back, extended session summary |

Each feature module exposes its public API through an `index.ts` barrel. Internal implementation files (API hooks, sub-components, local state) are not importable from outside the feature.

---

### `pages/`

| Page | Change |
|---|---|
| `pages/vocabulary` | Compose filter bar, card list (standard + compact), empty states. Add board-filtered empty state. |
| `pages/review` | Compose board filter selector at session start (or derive from vocabulary page navigation context). |
| `pages/settings` | Add "Manage boards" and "Manage tags" sections. |

No new top-level routes are introduced. Boards and tags are not routes — they are filter state within existing routes.

---

### `shared/ui` (Design System Extensions)

New components required:

| Component | Description |
|---|---|
| `BottomSheet` | Drag-dismissible overlay sheet. Keyboard-aware. Backdrop tap-to-dismiss. Nested sheet support. |
| `ChipSelect` | Multi-select chip row. Used for board and tag selection. |
| `TagChip` | Small chip with optional remove button. Used in card detail and filter bar. |
| `BoardChip` | Chip representing a board. Used in card detail and filter bar. Visually similar to TagChip but may have distinct styling. |
| `FilterBar` | Horizontal scrollable chip row with clear button and sort button. Sticky positioning. |
| `DragHandle` | Visual drag handle indicator for bottom sheets. |
| `ReviewTimingLabel` | Small text label for humanised review timing. Used on card flip and vocabulary list. |
| `RatingButton` | Extended version of existing rating button with sub-label for timing preview. |

These components are added to `shared/ui` and follow the existing design system token system. They do not import from `features/` or `entities/`.

---

## State Management

The app uses **TanStack Query** for server state and local React state for ephemeral UI state. This convention is unchanged.

### Query keys

New query key namespaces:

```
['boards']                        // list of user boards
['boards', boardId]               // single board
['boards', boardId, 'cards']      // cards in a board
['tags']                          // list of user tags
['cards', cardId, 'note']         // note for a card
['vocabulary', filters]           // vocabulary list (keyed by active filters)
```

The vocabulary list query key must include the full filter/sort state so different filter combinations are cached independently and do not invalidate each other unnecessarily.

### Optimistic updates

The following mutations use optimistic updates for immediate UI responsiveness:

- Add/remove card from board (updates board chips on card immediately)
- Add/remove tag from card (updates tag chips immediately)
- Save/update note (updates note text immediately, then syncs with server response)
- Toggle compact mode (local UI preference, no server sync needed)

Optimistic updates roll back on mutation error with a toast notification.

### Filter state

Filter state is local React state (not server state, not URL state in this iteration). It lives in the vocabulary page component or a dedicated filter context. It is not persisted across sessions.

If URL-based filter state is desired in the future (shareable filtered views, back-button support), query params can be introduced later without changing the underlying filter logic.

---

## Bottom Sheet Architecture

The `BottomSheet` component is the most significant new design system primitive. Its architecture must handle:

1. **Portal rendering** — Sheets are rendered outside the card list DOM to avoid z-index stacking issues. `createPortal` to `document.body` or a dedicated sheet root element.
2. **Animation** — Slide-up animation on open (300ms ease-out). Slide-down on dismiss. Uses CSS transforms for GPU acceleration.
3. **Drag gesture** — Track `touchstart`, `touchmove`, `touchend` on the drag handle zone. Calculate displacement. Dismiss if displacement exceeds threshold (40% of sheet height) or velocity exceeds a minimum. Snap back if below threshold.
4. **Keyboard handling** — Observe `visualViewport` resize events (keyboard show/hide on mobile). Translate the sheet `translateY` upward by the amount the keyboard occupies. On keyboard hide, translate back.
5. **Backdrop** — A `<div>` covering the full viewport beneath the sheet. Tap to dismiss. Partially transparent (CSS `rgba` or `backdrop-filter: blur`).
6. **Scroll within sheet** — Sheet content uses `overflow-y: auto`. Drag gesture detection must not conflict with content scrolling. Delegate: if the user starts a touch inside the sheet content area (not the drag handle) and the content is scrollable, let the scroll happen.
7. **Nested sheets** — Use a sheet stack managed by a context (`SheetContext` or `useSheetStack`). Opening a nested sheet pushes to the stack. Dismissing pops from the stack. The parent sheet remains mounted but is visually shifted (scale or translate) to indicate depth.
8. **Focus trap** — While a sheet is open, focus is trapped within the sheet. Background content is inert.
9. **ARIA** — Sheet root has `role="dialog"`, `aria-modal="true"`, `aria-label` from the sheet title prop.

Implementation order: first implement a basic non-nested bottom sheet without drag gesture (keyboard/backdrop dismiss only), validate it works across target devices, then add drag gesture, then add nested sheet support.

---

## Filtering Architecture

Filter state is managed as a typed object:

```typescript
type VocabularyFilters = {
  boardId: string | null;
  tagIds: string[];
  reviewState: 'all' | 'due' | 'upcoming' | 'new' | 'mastered';
  partOfSpeech: string | null;
  sort: 'nextReview' | 'dateAdded' | 'alpha';
  sortDir: 'asc' | 'desc';
};

const defaultFilters: VocabularyFilters = {
  boardId: null,
  tagIds: [],
  reviewState: 'all',
  partOfSpeech: null,
  sort: 'nextReview',
  sortDir: 'asc',
};
```

A `useVocabularyFilters` hook manages this state and exposes:
- `filters: VocabularyFilters`
- `setFilter(key, value)` — updates a single filter field
- `clearFilters()` — resets to defaults
- `hasActiveFilters: boolean` — derived: true if any filter differs from default

The query to `GET /vocabulary` receives the serialised filters as query params. TanStack Query caches results per unique filter combination.

---

## Board/Tag State

### Board list

Boards are fetched once per session with `useQuery(['boards'])`. The result is used in:
- The filter bar (chip rendering)
- The board picker bottom sheet (checkbox list)
- The card detail board section

Board mutations (create, update, archive, delete) invalidate `['boards']` and `['boards', boardId, 'cards']`.

### Tag list

Tags are fetched once with `useQuery(['tags'])`. The result is used in:
- The filter bar
- The card detail tag section (autocomplete)
- Tag management in settings

Tag mutations invalidate `['tags']`.

### Per-card boards and tags

The vocabulary list response includes `boards` and `tags` per card. These are not fetched separately — they are part of the vocabulary query response. When a mutation changes a card's board or tag assignments, the `['vocabulary', filters]` query is invalidated (or optimistically updated).

---

## Modal / Bottom Sheet Ownership

Each bottom sheet is owned by the feature or component that opens it. The `BottomSheet` component from `shared/ui` is a headless container; content is injected as `children`.

| Sheet | Owner |
|---|---|
| Card detail sheet | `features/vocabulary` — `CardDetailSheet` component |
| Board picker (within card detail) | `features/boards` — `BoardPickerSheet` component |
| Tag input (within card detail) | `features/tags` — `TagInputSection` component (inline, not a sheet) |
| Sort options sheet | `features/vocabulary` — `SortOptionsSheet` component |
| Create board sheet | `features/boards` — `CreateBoardSheet` component |
| Meaning picker (word save) | `features/meaning-picker` — `MeaningPickerSheet` component |

---

## Query and Cache Implications

### Vocabulary list query performance

The vocabulary list is the most frequently loaded query. The extended response (with boards, tags, note, review state) increases payload size. To manage this:

1. The `compact` mode in the UI does not change the query — it only changes rendering. All fields are always fetched.
2. Pagination is cursor-based to avoid OFFSET degradation on large collections.
3. The `note` field is included inline in the vocabulary response rather than fetched separately to avoid N+1 query patterns.

### Stale-while-revalidate

The vocabulary query uses `staleTime: 60_000` (1 minute). Board and tag list queries use `staleTime: 300_000` (5 minutes). Review queue uses `staleTime: 0` (always fresh — critical for session accuracy).

### Cache invalidation on mutations

| Mutation | Invalidates |
|---|---|
| Add/remove card from board | `['vocabulary', filters]`, `['boards', boardId, 'cards']` |
| Add/remove tag from card | `['vocabulary', filters]` |
| Create/update/delete note | `['vocabulary', filters]`, `['cards', cardId, 'note']` |
| Create/archive/delete board | `['boards']` |
| Create/rename/delete tag | `['tags']` |
| Complete review | `['vocabulary', filters]`, `['reviews', 'queue']` |

---

## Component Structure (proposed)

```
features/vocabulary/
├── index.ts
├── api/
│   ├── useVocabularyQuery.ts
│   ├── useVocabularyFilters.ts
│   └── useSaveWordMutation.ts
├── ui/
│   ├── VocabularyList.tsx
│   ├── VocabularyCard.tsx           (standard mode)
│   ├── VocabularyCardCompact.tsx    (compact mode)
│   ├── FilterBar.tsx
│   ├── SortOptionsSheet.tsx
│   └── CardDetailSheet.tsx          (composes boards/tags/notes sections)

features/boards/
├── index.ts
├── api/
│   ├── useBoardsQuery.ts
│   ├── useCreateBoardMutation.ts
│   ├── useCardBoardMutation.ts
│   └── useUpdateBoardMutation.ts
├── ui/
│   ├── BoardPickerSheet.tsx
│   ├── CreateBoardSheet.tsx
│   └── BoardManagementList.tsx

features/tags/
├── index.ts
├── api/
│   ├── useTagsQuery.ts
│   ├── useCreateTagMutation.ts
│   └── useCardTagMutation.ts
├── ui/
│   ├── TagInputSection.tsx
│   └── TagManagementList.tsx

features/card-note/
├── index.ts
├── api/
│   └── useCardNoteMutation.ts
└── ui/
    └── NoteSection.tsx

features/meaning-picker/
├── index.ts
├── api/
│   └── useSaveSelectedMeaningsMutation.ts
└── ui/
    └── MeaningPickerSheet.tsx
```

This structure follows the existing FSD convention observed in the codebase. Each feature's `index.ts` exports only what other layers need.
