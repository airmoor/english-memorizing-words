# UX Specification: boards-tags-review-v2

**Status:** Planned  
**Last updated:** 2026-05-17

---

## Mobile-First Interaction Principles

Every interaction must be designed for a 375px-wide touch screen as the baseline. The following constraints apply to all new surfaces:

- **Minimum tap target:** 44×44px for all interactive elements.
- **Primary thumb zone:** The bottom 55% of the screen. Navigation, primary actions, and filters must be reachable without shifting grip.
- **Keyboard avoidance:** When the software keyboard opens, the active input must remain visible. Bottom sheets must translate upward to accommodate the keyboard rather than being obscured by it.
- **Swipe over scroll:** Where a swipe gesture (e.g., swipe-to-dismiss a bottom sheet) conflicts with a scroll, the scroll must win below the drag handle zone. The drag handle zone is a fixed 40px area at the top of the sheet.
- **No hover states as the sole affordance:** All interactive affordances must be visible without hover. Hover states are acceptable as enhancements on desktop.
- **Touch feedback:** Tap targets must provide immediate visual feedback (press state, ripple, or opacity change) within 16ms.

---

## Navigation Philosophy

The app's navigational structure is intentionally flat. There are five top-level destinations: Search, Vocabulary, Review, Settings, and (new) Boards. These are accessible via a bottom tab bar — the only persistent navigation element.

Boards are not a sixth navigation level inside Vocabulary. They are a filter state within the vocabulary page. Tapping a board does not navigate to a new route; it applies a filter to the existing vocabulary list view and updates the page title or sub-header to reflect the active board.

**Navigational rule:** A user should never need to press the back button to get out of an editing interaction. Editing interactions (bottom sheets) are dismissed via swipe or backdrop tap, returning to exactly the state the user was in before opening the sheet.

---

## Information Hierarchy

### Vocabulary List

The vocabulary list is structured in three zones, from top to bottom:

1. **Filter/Sort bar** — A horizontal scrollable row of filter chips (boards, tags, review state, part-of-speech). A sort button anchored to the right. This bar is sticky and visible as the user scrolls the list.
2. **Card list** — A vertical list of vocabulary cards. Each card displays: word, primary meaning snippet, review state indicator, and board/tag chips (compact mode shows none; standard mode shows up to 2).
3. **Empty state** — Shown when filters return no results. Explains why the list is empty and offers an action (clear filters).

### Card in List (Standard Mode)

```
┌──────────────────────────────────────┐
│ ambiguous                    [due]   │
│ adjective · open to more than one... │
│ [IELTS] [formal]                     │
└──────────────────────────────────────┘
```

- Word name: large, primary text
- Part-of-speech and definition snippet: secondary text, one line, truncated
- Review state badge: anchored top-right (due, upcoming, new, mastered)
- Board/tag chips: small, muted, up to 2 visible then "+n more"

### Card in List (Compact Mode)

```
┌──────────────────────────────────────┐
│ ambiguous          [formal] [due]    │
└──────────────────────────────────────┘
```

- Word name and review badge + up to 2 tags on a single line. No definition snippet. Maximum density for browsing.

---

## Filtering Behavior

### Filter Bar

The filter bar is a horizontally scrollable strip of chips. Chip categories:

1. **Board filter** — selecting a board chip filters the list to cards in that board. Only one board can be active at a time (selecting another deselects the previous). An "All" chip always appears first and represents no board filter.
2. **Tag filter** — selecting tag chips filters by those tags with AND logic. Multiple tags can be active simultaneously.
3. **Review state filter** — mutually exclusive: All / Due / Upcoming / New / Mastered.
4. **Part-of-speech filter** — mutually exclusive: All / Noun / Verb / Adjective / Adverb / Other.

Active filter chips are visually distinct (filled, primary color) from inactive ones (outlined, muted).

Clearing all filters: a "Clear" button appears at the right end of the filter bar when any filter is active. Tapping it resets all filters.

### Filter State Persistence

The filter state is preserved during the session (while the app is open) but resets on cold start. There is no persistent saved-filter feature in this iteration.

### Sort Options

Sort is accessed via a sort button (icon) at the right of the filter bar, outside the horizontal scroll. Tapping opens a small action sheet (a minimal bottom sheet) with options:

- Next review (ascending) — default
- Date added (newest first)
- Date added (oldest first)
- Alphabetical (A → Z)
- Alphabetical (Z → A)

The active sort option has a checkmark. Sort persists per session.

---

## Card Expansion Behavior

Tapping a card in the vocabulary list opens a bottom sheet presenting the card detail. This is the primary editing surface for the card.

The card detail bottom sheet is structured as a scrollable sheet with the following sections:

### Section 1: Word Header (always visible)

Word, transcription if available, and a "source" label (dictionary provider). This section is pinned at the top of the sheet below the drag handle.

### Section 2: Meanings (always visible, scrollable)

A list of the card's saved meanings: definition, part of speech, examples. This section is read-only. If the card has multiple meanings, they are listed vertically with a subtle divider.

### Section 3: Notes (expandable)

Label: "Notes". If no note exists: shows a placeholder "Add a note..." in muted text that acts as the tap target to open the inline input. If a note exists: displays the note text. Tapping enters edit mode in place. Auto-saves on blur. No save/cancel buttons — the interaction is inline.

### Section 4: Boards (expandable)

Label: "Boards". Shows current board assignments as chips with a remove button (×). A "+ Add to board" button opens a board picker (a nested bottom sheet or an inline multi-select overlay). Newly added board chips appear immediately.

### Section 5: Tags (expandable)

Label: "Tags". Shows current tag assignments as chips with a remove button. An inline chip input at the end of the row accepts new tag names and shows autocomplete from the user's existing tags as a dropdown below the input.

### Section 6: Review Info (always visible, at bottom)

Shows:
- Current interval (e.g., "Every 7 days")
- Next review: humanised date ("In 3 days", "Tomorrow", "Today", "Overdue by 2 days")
- Date added
- A "Remove from vocabulary" destructive action (text button in danger color at the bottom)

---

## Board Interactions

### Board Selection in Vocabulary List

The filter bar includes a "Boards" section with one chip per board. The user scrolls the chip row horizontally to find a board. For users with many boards, the chip row may scroll significantly — a "Browse boards" chip at the end opens a full bottom sheet with all boards listed vertically, with a search input at the top.

### Board Management

Board management is accessible from a dedicated entry point (e.g., a "Manage boards" link in Settings or a long-press on a board chip). This is not a primary navigation destination. Board management allows:

- Renaming a board (inline, tap to edit)
- Archiving a board (swipe action or context menu)
- Deleting an archived board (with confirmation)
- Reordering boards (drag handle, optional)

### Creating a Board

From the vocabulary list, a "+ New board" button appears at the end of the boards chip row. Tapping opens a small bottom sheet: a single text input with label "Board name" and a "Create" button. The board is created and immediately available in the filter strip.

A board can also be created from within the card detail's "Boards" section, if the desired board does not yet exist.

---

## Tag Interactions

### Tag Assignment on Card

The card detail "Tags" section shows an inline chip input. Typing begins a search through existing tags. Matching tags appear as suggestions below the input. Tapping a suggestion applies the tag. Typing a name that doesn't match any existing tag and pressing Enter (or a "Create" suggestion in the dropdown) creates and applies the tag.

### Tag Removal

Tapping the × on a tag chip removes it from the card immediately.

### Tag Management

Accessible from Settings. Shows a list of all user tags with the count of cards using each tag. Allows renaming (tap to edit inline) and deleting (swipe or context menu, with confirmation that explains the tag will be removed from all cards).

---

## Review Timing Visibility

### During Review Session

On the card back (rating side), each rating button displays a preview of the next review timing:

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  Again  │  │  Hard   │  │  Good   │  │  Easy   │
│ 10 min  │  │ 1 day   │  │ 4 days  │  │ 2 wks   │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

The time labels are small secondary text beneath the rating label. They are derived from the current card's SM-2 state. They are informational only.

### Session Summary

After completing a review session (queue empty), the summary screen shows:

- "Session complete" heading
- Reviewed count: e.g., "12 cards reviewed"
- Breakdown by rating: small icon + count for each of Again / Hard / Good / Easy
- Next session: "Next cards due in 3 hours" or "Next cards due tomorrow"
- If board-filtered session: "Board: IELTS Writing"

The summary is calm and affirming. It does not show a percentage score or a "you failed X cards" message.

### On Card in Vocabulary List

Each card in the vocabulary list shows a review state badge:

- **Due** — card is due for review today or overdue. Badge: accent color.
- **Upcoming** — card is due within the next 7 days. Badge: muted.
- **New** — card has never been reviewed. Badge: subtle.
- **Mastered** — card has reached a high ease factor and long interval (configurable threshold). Badge: green.

---

## Bottom Sheet Behavior

The bottom sheet is a core design system primitive for this initiative.

### Anatomy

- **Drag handle** — a short horizontal line centered at the top of the sheet. Indicates draggability.
- **Sheet content** — scrollable within the sheet if content exceeds the sheet height.
- **Backdrop** — a semi-transparent overlay behind the sheet. Tapping the backdrop dismisses the sheet.

### Sizing

Sheets start at a "natural" height (content-sized, max 85vh). If content is taller than 85vh, the sheet scrolls internally. Sheets do not allow the user to drag them taller than 85vh (no full-screen expansion in this iteration).

### Dismiss Behavior

- Swipe the drag handle downward past a threshold (40% of sheet height) → dismiss with animation.
- Tap backdrop → dismiss.
- Hardware back button (Android) → dismiss.
- Programmatic close → dismiss.

### Keyboard Interaction

When the keyboard opens inside a sheet (e.g., note input, tag input), the sheet translates upward so the active input remains visible. The sheet does not resize; the keyboard overlaps the backdrop. The sheet content scrolls to keep the focused input in view.

### Nested Sheets

A nested sheet (e.g., a board picker opened from within the card detail sheet) slides up over the parent sheet. Dismissing the nested sheet returns to the parent sheet without disturbing the parent's scroll position. Maximum nesting depth: 2 levels.

---

## Empty States

Every surface that can be empty has a designed empty state with:

1. A short, plain-language explanation of why it's empty.
2. A primary action to resolve the empty state (where applicable).

| Surface | Empty state message | Action |
|---|---|---|
| Vocabulary list (no cards) | "Your vocabulary is empty. Search for a word to get started." | "Search a word" button |
| Vocabulary list (filtered, no results) | "No cards match your filters." | "Clear filters" button |
| Board (no cards assigned) | "No cards in this board yet." | "Browse vocabulary" button |
| Review queue (nothing due) | "You're all caught up! Next review in 2 days." | None |
| Tags section on card (no tags) | "Add a tag…" | Tap to open input |

---

## Progressive Disclosure Rules

The following rules govern what is shown by default vs. on-demand:

1. **Cards in list:** word, snippet, state badge. Boards and tags visible in standard mode, hidden in compact mode.
2. **Card detail sheet:** meanings always visible. Notes, Boards, Tags sections collapsed if empty, expanded if content exists.
3. **Filter bar:** only boards with at least one card are shown (unless the user is in board management).
4. **Review timing preview:** shown only on the card back during a session, never on the card front.
5. **Board description:** not shown in the filter chip or the board name on a card. Visible only in board management detail view.
6. **Session summary breakdown:** rating counts shown by default; per-card detail is not shown (and is not planned in this iteration).

---

## Ideal User Flows

### Flow A: Organise a card into a board

1. User opens Vocabulary list.
2. User taps a card → card detail bottom sheet slides up.
3. User taps the "Boards" section → it expands to show current boards and a "+ Add to board" action.
4. User taps "+ Add to board" → a board picker nested bottom sheet slides up showing all boards.
5. User taps "IELTS Writing" → the board is added. The chip appears in the Boards section.
6. User swipes down the nested sheet → returns to card detail sheet.
7. User swipes down the card detail sheet → returns to vocabulary list.
8. The card now shows [IELTS Writing] chip in the list.

### Flow B: Filter vocabulary by board + tag

1. User is in the Vocabulary list.
2. User taps the "IELTS Writing" chip in the filter bar → list filters to board.
3. User taps the "formal" tag chip in the filter bar → list further filters to cards with both board and tag.
4. User taps "Clear" → all filters reset.

### Flow C: Add a personal note to a card

1. User taps a card → detail sheet opens.
2. The "Notes" section shows "Add a note…" placeholder.
3. User taps the placeholder → the field activates, keyboard opens, sheet translates upward.
4. User types note text.
5. User taps outside the input (or closes keyboard) → note auto-saves. No button press needed.
6. User swipes sheet down → returns to list. The card now shows a note indicator.

### Flow D: Save a word with selective meanings

1. User searches for "run" and sees 14 meanings.
2. User taps "Save to vocabulary" → a meaning picker screen or bottom sheet appears.
3. All meanings are unchecked by default (or the most common 1-2 are pre-checked — see open questions).
4. User checks 3 meanings.
5. User taps "Save 3 meanings" → card is created with those 3 meanings. User returns to search result.

### Flow E: Complete a board-filtered review session

1. User is in the Vocabulary list, "IELTS Writing" board is active.
2. User taps "Review this board" action (visible when a board filter is active).
3. Review session starts with only cards from the IELTS Writing board that are due.
4. User completes the session.
5. Summary screen shows "IELTS Writing — 8 cards reviewed. Next due: in 2 days."
6. User taps "Done" → returns to vocabulary list with IELTS Writing filter still active.
