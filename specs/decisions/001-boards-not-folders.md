# ADR 001: Boards, Not Folders

**Status:** Accepted  
**Date:** 2026-05-17  
**Deciders:** Product, Engineering

---

## Context

As the vocabulary application matures, users need a way to organise their saved words beyond a single flat list. The two natural models are:

- **Folders** — a hierarchical, exclusive container model where each card lives in exactly one folder.
- **Boards** — a flat, non-exclusive collection model where a card can appear in zero or many boards.

This ADR records why we chose boards.

---

## Decision

Cards will be organised using **boards**. Boards are named collections that a card can belong to simultaneously. Cards exist independently of boards — they are first-class objects, not children of any board.

---

## Rationale

### 1. Vocabulary naturally overlaps across contexts

A word like *ambiguous* can belong to a "IELTS Academic" board and a "Philosophy" board simultaneously. With folders, a user must choose one. This forces an artificial hierarchy that does not match how language is actually learned or grouped.

Boards make the natural overlap explicit without duplication.

### 2. Cards must not be orphaned

If a user deletes a board, the cards in it should not disappear. With a folder model, deletion of a container is destructive. With boards, deleting a board simply removes the grouping — the card continues to exist in the user's vocabulary list and any other boards it belongs to.

This preserves review history, spaced repetition state, and note content regardless of how the user reorganises their vocabulary.

### 3. Hierarchical folders do not serve mobile-first UX

Nested folders require a file-manager mental model and navigational depth. On mobile, this creates friction: back-and-forth navigation, breadcrumbs, and unclear current location.

Boards are flat by design. The user sees a list of boards, picks one, and sees its cards. One level of depth. This matches the cognitive simplicity the app targets.

### 4. Many-to-many is the correct relational shape

The data model for boards is a simple many-to-many join (`card_boards` table). There is no recursive self-reference, no path encoding, and no complex tree traversal. This simplifies queries, avoids adjacency list or nested set patterns, and makes bulk operations (add all cards from search to a board) trivial.

### 5. Boards are composable with tags

Boards represent primary organisation ("what am I studying this word for?"). Tags represent cross-cutting metadata ("what grammatical category?", "what register?"). These two dimensions are independent, and both require the card to exist independently. The board/tag combination enables flexible multi-dimensional filtering without hierarchical complexity.

---

## Consequences

### Positive

- Cards are never orphaned by board deletion.
- Users can organise vocabulary along multiple dimensions without duplication.
- The data model is simple and query-efficient.
- Board deletion is a safe, low-stakes operation.
- Future import/export of boards does not risk data loss.

### Negative

- Users accustomed to folder-based tools (Anki, Notion) may initially expect hierarchy. Onboarding copy or empty states may need to address this mental model shift.
- Without hierarchy, very large numbers of boards could become hard to navigate. This will be managed by a search/filter bar on the boards list rather than nesting.

### Neutral

- A card with zero boards is valid and represents an unsorted card in the user's flat vocabulary. The vocabulary list always shows all cards regardless of board assignment.

---

## Rejected Alternatives

**Folders with hierarchy:** Rejected. Introduces navigational complexity, enforces exclusive ownership, and encourages duplication. Does not match the multi-context nature of language learning.

**Tags only (no boards):** Rejected. Tags are intentionally lightweight and should not carry structural weight. Having only tags means the user must tag everything to achieve organisation, which increases friction and cognitive load.

**Smart playlists / saved filters as the only grouping:** Rejected as the sole mechanism. Saved filters are a future enhancement (e.g., "all cards due today with tag: formal") but require explicit criteria and cannot capture manually curated collections like "Words for my IELTS essay".
