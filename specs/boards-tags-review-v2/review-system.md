# Review System: boards-tags-review-v2

**Status:** Planned  
**Last updated:** 2026-05-17

---

## Overview

The review system's core mechanism — SM-2 spaced repetition with four ratings (Again, Hard, Good, Easy) — is unchanged. This document specifies the evolution of the review system's user-facing presentation: timing visibility, humanised formatting, session summaries, board-scoped sessions, and long-term extensibility.

---

## Current State

The current review system:
- Presents one card at a time with a hidden answer.
- User rates the card (Again / Hard / Good / Easy).
- SM-2 updates the card's ease factor, interval, and next review date.
- After all due cards are reviewed, the session ends.
- A minimal end screen is shown.
- Review timing (next review date) is not visible to the user during or after the session.
- The vocabulary list does not indicate which cards are due.

---

## Review Timing Visibility

### Design Intent

The goal is to make the review schedule legible without making it feel like a deadline or a productivity metric. The learner should feel informed ("I'll see this again in a week") rather than surveilled ("missed card — due 2 days ago").

This means:
- Use human-readable relative time, not absolute timestamps.
- Avoid red "overdue" alerts — use a subtle indicator.
- Timing information is secondary to the card content.
- Due count is surfaced, not a "cards missed" or "accuracy rate" by default.

---

## Humanised Time Formatting

All review timing strings are computed relative to the user's local time. The function signature (conceptual):

```
humaniseReviewTime(targetDate: Date, now: Date): string
```

### Formatting Rules

| Condition | Output |
|---|---|
| `targetDate` is in the past (overdue) | "Overdue" or "Overdue by 2 days" |
| `targetDate` within next 60 minutes | "In [N] min" |
| `targetDate` today (later today) | "Today" or "In [N] hours" |
| `targetDate` tomorrow | "Tomorrow" |
| `targetDate` within next 6 days | "In [N] days" |
| `targetDate` within next 4 weeks | "In [N] weeks" |
| `targetDate` within next 12 months | "In [N] months" |
| `targetDate` more than 12 months away | "In over a year" |

The output is always a short, readable phrase. It does not include a specific time of day (no "tomorrow at 9:14 AM").

### Implementation Location

The humanisation function lives in `ReviewTimingService` on the backend (for server-side rendering in API responses) and is mirrored as a utility in `shared/lib/formatReviewTime.ts` on the frontend (for client-side computation from dates returned by the API). The two must use identical logic to avoid display inconsistencies.

---

## Rating Preview Labels

When a user flips a card (reveals the answer) during a review session, the four rating buttons display a sub-label showing the projected next-review timing if that rating is chosen.

### Display format

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│    Again    │  │    Hard     │  │    Good     │  │    Easy     │
│  · 10 min   │  │  · 1 day   │  │  · 4 days   │  │  · 2 weeks  │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

The sub-label is muted secondary text beneath the rating label. It uses the humanised format from the table above (abbreviated where possible: "10 min", "1 day", "4 days", "2 wks").

### Data source

The preview timings are computed from the current card's SM-2 state (ease factor, interval, repetition count) by simulating each rating without writing to the database. The computation runs in `ReviewTimingService.computePreviews(card: Card): RatingPreviews`.

The frontend receives these previews in the vocabulary list card data (for passive display on the vocabulary list card detail) and in the review session card data (for display on card flip).

### SM-2 preview computation (simplified)

For each rating, the hypothetical next interval is computed:

- **Again:** Reset to initial interval (e.g., 10 minutes, then 1 day on next pass).
- **Hard:** `interval * 1.2`, ease factor decreases.
- **Good:** `interval * easeFactor`.
- **Easy:** `interval * easeFactor * easyBonus`.

These are the standard SM-2 rules. The preview is `now + hypotheticalInterval`, formatted with the humanisation function.

---

## Due States on Vocabulary List

Each card in the vocabulary list displays a review state badge:

| State | Condition | Visual |
|---|---|---|
| New | `last_reviewed_at IS NULL` | Subtle outline badge, label "New" |
| Due | `next_review_date <= now()` | Accent-colored badge, label "Due" |
| Upcoming | `next_review_date <= now() + 7 days` | Muted badge, label "In [N] days" |
| Scheduled | `next_review_date > now() + 7 days` | No badge (clean) |
| Mastered | `ease_factor >= 2.5 AND interval >= 21` | Subtle green badge, label "Mastered" |

"Scheduled" cards (more than 7 days out) show no badge to avoid visual noise. The vocabulary list default sort (by next review date, ascending) naturally surfaces due and upcoming cards first.

The mastery threshold (ease_factor ≥ 2.5, interval ≥ 21 days) is an application-level constant. It is documented and configurable at the code level. It is not user-configurable in this iteration.

---

## Session Summaries

### End-of-session summary screen

After the review queue is empty, the session summary screen is shown. Current implementation is minimal. Extended version:

**Layout:**

```
────────────────────────────────
  Session complete

  12 cards reviewed

  ✓  4  Easy
  ✓  5  Good
  ·  2  Hard
  ×  1  Again

  Next cards due: in 3 hours

  [ Done ]
────────────────────────────────
```

**Content:**
- Title: "Session complete" (not "Well done!", not a score).
- Total cards reviewed (integer count).
- Breakdown by rating: icon + count for each of Again/Hard/Good/Easy. Icons should be subtle — a simple symbol per rating, not a red/green pass/fail design.
- Next session earliest: "Next cards due: [humanised time]" — the earliest `next_review_date` across all of the user's cards after the session. If nothing is due in the near future, use "Next cards due: tomorrow" or the appropriate bucket.
- If board-filtered: a line showing "Board: [Board Name]".
- A "Done" button that returns to the vocabulary list (with the board filter still applied if applicable).

**What is not shown:**
- A percentage score or accuracy rate.
- A "streak" counter.
- Individual card performance.
- Comparison to previous sessions.

These omissions are intentional. They reduce anxiety and gamification pressure.

---

## Board-Filtered Review Sessions

### Entry point

When a board filter is active in the vocabulary list, a "Review this board" action becomes visible. This can be:
- A button in the filter bar or below it.
- A floating action button that appears when a board filter is active.
- An action in the board's context menu.

The entry point navigates to the review page with a `boardId` query param, which the review page reads to initialise a board-scoped session.

### Session behavior

A board-scoped session reviews only cards that are:
1. Due for review (or new, depending on session policy — see open-questions).
2. Assigned to the specified board.

The SM-2 algorithm is unchanged. The board filter only affects which cards enter the queue.

If the board has no due cards, the session start screen shows: "No cards due in [Board Name]. Next cards due in [humanised time]." with a "Review all due cards" fallback option.

---

## Future Analytics Possibilities

The following analytics features are noted as future possibilities. They are not in scope for this iteration.

### Per-board progress

A board detail view could show:
- Total cards in board
- Cards by state (New / Due / Upcoming / Mastered)
- Average ease factor
- Total reviews completed

Data source: aggregate queries over `cards` filtered by `card_boards`.

### Review history timeline

A calendar or bar chart of reviews per day over the last 30/90 days. Data source: `review_logs.reviewed_at` grouped by day.

### Mastery progression

A chart showing how many cards moved from "New" → "Upcoming" → "Mastered" over time. This requires a `Card.masteredAt` timestamp column (not added in this iteration) or inferences from `review_logs`.

### Retention rate

Percentage of "Good" or "Easy" ratings out of total. A simple aggregate over `review_logs.rating`. Could be shown per-board.

These analytics would live in a dedicated "Progress" page or a board detail view. They are noted here to confirm the data model captures what is needed: `ReviewLog` records rating, card, and timestamp. This is sufficient for all the above.

---

## Mastery States

A card reaches "Mastered" status when:
- `ease_factor >= 2.5` AND
- `interval >= 21` (days)

These thresholds indicate the learner has consistently rated the card Good or Easy, and the card is scheduled for review at a monthly or greater frequency.

"Mastered" is not a terminal state. A "Mastered" card can regress if the user rates it "Again" after a long interval. The mastery threshold is re-evaluated on every vocabulary list query.

### Future: explicit mastery management

A future feature may allow the user to manually mark a card as "archived" (no longer scheduled for review) or "suspended" (temporarily removed from the review queue). This requires additional boolean columns on `Card` (`isArchived`, `isSuspended`). Not in this iteration.

---

## Scheduling Visibility UX Summary

| Surface | Information shown | Format |
|---|---|---|
| Vocabulary list (card badge) | Due state | "Due", "In 3 days", "New", "Mastered" |
| Card detail sheet (Review Info section) | Exact next review, interval | "In 3 days", "Every 7 days" |
| Card flip (during review) | Preview per rating | "10 min", "1 day", "4 days", "2 wks" |
| Session summary | Next session timing | "Next cards due in 3 hours" |
| Board-filtered session start | Due count in board | "8 cards due in IELTS Writing" |
