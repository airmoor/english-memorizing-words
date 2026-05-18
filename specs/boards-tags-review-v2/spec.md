# Initiative: boards-tags-review-v2

**Status:** Planned  
**Created:** 2026-05-17  
**Author:** Product / Architecture

---

## Overview

`boards-tags-review-v2` is the next major product iteration of the LearnEnglishApp. It evolves the application from a flat vocabulary list with a basic review queue into a structured, expressive learning environment while preserving the minimalist, calm character of the original product.

This initiative is additive by design. Existing data, review history, and usage patterns must be preserved throughout. No breaking changes to the review algorithm or card lifecycle.

---

## Product Vision

A learner's vocabulary should be as organised or as free-form as they choose, without the app imposing structure. Cards carry their own review history regardless of how they are grouped. The review experience should communicate confidence and progress without becoming a dashboard. Editing a card should feel as natural as adding a note in a notebook — immediate, low-friction, mobile-friendly.

The app should remain something a learner opens daily for five minutes, not a productivity system they have to manage.

---

## Goals

1. **Boards** — Allow users to organise their vocabulary into named collections. Cards can belong to multiple boards. Boards do not create hierarchy.

2. **Tags** — Allow users to attach lightweight cross-cutting labels to cards for filtering and categorisation without imposing structural weight.

3. **Advanced card editing** — Replace the current read-only card detail with an editing surface that supports note-taking, block management, and organisation actions from a single, mobile-first interaction.

4. **Selective meaning import** — When saving a word from the search result, allow the user to choose which specific meanings to save rather than defaulting to all.

5. **Smart content blocks** — Extend the card data model to support user-authored content blocks: personal notes, custom examples, and context clues. These blocks live alongside the imported dictionary content.

6. **Review visibility improvements** — Surface the next review time on cards and in the review session summary in a human-readable, non-anxiety-inducing format.

7. **Vocabulary organisation improvements** — Filter and sort the vocabulary list by board, tag, review state, and word type. Add compact list mode for dense browsing.

8. **New UX architecture** — Introduce bottom sheet infrastructure, chip-based multi-select, and expandable card sections as reusable design system primitives.

---

## Non-Goals

- A shared vocabulary or social layer.
- Statistics dashboards or learning streak tracking (beyond the existing review summary).
- Gamification: points, badges, levels.
- Custom review scheduling per card (SM-2 remains the algorithm).
- Flashcard imports from external formats (Anki, CSV) in this iteration.
- Hierarchical boards (sub-boards, nested collections).
- Rich text editing in notes (markdown, bold, links).
- Audio or image content on cards.

---

## Product Principles

### 1. Organisation is a tool, not a goal

Boards and tags must require zero effort to use the app. A user who never creates a board still has a fully functional vocabulary list and review queue. Organisation features are opt-in enhancements, not prerequisites.

### 2. The card is the unit of truth

All features — boards, tags, notes, review state — attach to the card. The card's identity does not depend on its membership in any board. Review history travels with the card, not the board.

### 3. Editing must feel like a notebook, not a form

Adding a note or assigning a board should feel immediate and lightweight. The pattern is: tap, type or select, done — without a submit button or a page transition.

### 4. Review must be calming, not anxiety-inducing

Review timing information should inform the learner, not pressure them. "In 3 days" is better than "Due: 2026-05-20 09:14:32". The review queue is not a task list with deadlines.

### 5. Mobile ergonomics are non-negotiable

All interactive surfaces — boards, tags, editing, filtering — must be fully functional and ergonomic on a 375px-wide touch screen. Desktop enhancements are acceptable but never at the cost of the mobile experience.

---

## Scope

### In scope

- Board entity: create, rename, archive, delete
- Card-board assignment: add to / remove from boards from card detail and vocabulary list
- Tag entity: create, rename, delete
- Card-tag assignment: add / remove tags from card detail
- Vocabulary list filtering: by board, by tag, by review state (due, upcoming, new), by part-of-speech
- Vocabulary list sorting: by next review date, by date added, by word alphabetically
- Compact list mode for vocabulary list
- Card detail redesign: expandable sections, inline edit for notes, board/tag chips
- Personal note block: user-authored plain text note per card
- Selective meaning import: meaning picker on word save
- Review session: humanised next-review time on card flip, session summary improvements
- Review queue filter: review cards within a specific board
- Bottom sheet component: reusable, drag-dismissible, keyboard-aware
- Chip multi-select component: for board and tag assignment

### Out of scope (this iteration)

See Non-Goals above.

---

## Architecture Impact

| Layer | Impact |
|---|---|
| Database | New entities: Board, Tag, CardBoard (join), CardTag (join), CardNote. Extend Card with nullable note FK or embedded block. Migration required. |
| Backend | New modules: boards, tags. Extend vocabulary module with filter/sort. Extend words module for selective meaning save. Extend reviews module for board-filtered queue. |
| Frontend entities | New entities: board, tag. Extend vocabulary entity with board/tag membership. |
| Frontend features | New features: boards, tags. Extend vocabulary feature with filters. Extend review feature with board filter and timing display. |
| Frontend shared/ui | New components: BottomSheet, ChipSelect, TagChip, BoardChip, FilterBar. |
| API | New REST endpoints for boards and tags. Extended filter query params on vocabulary and review endpoints. |

---

## UX Philosophy

The vocabulary list is the user's home. It should feel like a well-organised desk: clean by default, with everything accessible when needed, and nothing in the way.

Boards appear as a horizontal scroll or filter strip at the top of the vocabulary list — a quick way to narrow context, not a separate navigation layer. Tags appear as chips on cards and in filter dropdowns — always secondary, never prominent.

Editing a card opens a bottom sheet that feels like a pull-up tray: it slides up over the list, partially obscuring it to maintain context, and contains only what is relevant. The user does not navigate away. They do not lose their place.

The review experience remains unchanged in its fundamental rhythm: one card at a time, rate it, move on. The only additions are a humanised "next review" label on the summary screen and the ability to enter a board-scoped review session.

---

## Feature Details

### Boards

Boards are named, user-owned collections. A board has a name, an optional description, an optional color accent (future), an order position, and an archived state. Cards are assigned to boards via a join table. A card can belong to zero, one, or many boards.

Creating a board: triggered from the boards section (top of vocabulary list or dedicated entry point). Name input with auto-focus. Saved on confirm or Enter.

Assigning a card to a board: triggered from the card detail bottom sheet. A "Boards" section shows the user's boards as checkboxes or chips. Tap to toggle. Changes are saved immediately (no pending state).

Viewing a board: the vocabulary list filtered to that board. The board name appears as the active filter. "All" resets the filter.

Archiving a board: the board is hidden from the default boards list. Cards remain assigned; they are simply not shown in the archived board by default unless the user browses archived boards.

### Tags

Tags are user-owned string labels. A tag has a name, a user, and a creation timestamp. Tags are attached to cards via a join table.

Creating a tag: inline on the card detail — a chip input that shows existing tags as autocomplete options. Typing a new name and pressing Enter creates the tag and applies it.

Removing a tag from a card: tap the chip's close button.

Deleting a tag globally: accessible from a settings or tag management surface. Removes the tag from all cards.

Filtering by tag: available in the vocabulary list filter bar. Multi-tag filter uses AND logic.

### Advanced Card Editing

The card detail view is redesigned around a bottom sheet that slides up over the vocabulary list when a card is tapped. The sheet contains:

- The word and its imported meanings (read-only, scrollable)
- An expandable "Notes" section: a plain-text input for a personal note. Auto-saves on blur.
- An expandable "Boards" section: chip multi-select for board assignment.
- An expandable "Tags" section: chip input for tag assignment.
- A "Review info" section showing current review state and next review date in humanised form.

Sections that are empty collapse by default. The sheet can be dismissed by swiping down or tapping the backdrop.

### Selective Meaning Import

When saving a word from the search result page, the user currently saves all meanings of the word. The new flow presents the meanings as a list with checkboxes. The user selects which meanings to import and confirms. At least one meaning must be selected.

The save button is disabled until at least one meaning is selected. Previously saved meanings are pre-selected if the user opens the picker again on an already-saved word.

### Smart Content Blocks

Cards can now have user-authored content alongside imported dictionary content. The first block type is a personal note (plain text). Future block types may include custom examples or context sentences.

Blocks are ordered within a card. They are distinct from the imported meanings, which remain read-only. Blocks are displayed in the card detail view between the meaning list and the review info section.

### Review Visibility

On the card flip (back of card) during a review session, the rating buttons now display humanised next-review time previews:

- Again → "In 10 min"
- Hard → "In 1 day"
- Good → "In 4 days"
- Easy → "In 2 weeks"

These are computed from the current SM-2 state. They are informational only — the user cannot change the algorithm.

The review session summary screen (shown after completing a session) is extended to show:
- Number of cards reviewed
- Cards by rating (again/hard/good/easy counts)
- Next session earliest time (humanised: "tomorrow morning", "in 3 days")

A board-filtered review mode allows entering a session that reviews only cards belonging to a specific board.
