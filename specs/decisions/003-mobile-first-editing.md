# ADR 003: Mobile-First Editing Patterns

**Status:** Accepted  
**Date:** 2026-05-17  
**Deciders:** Product, Engineering

---

## Context

As the vocabulary card model grows richer — supporting tags, board assignments, multiple meaning blocks, and personal notes — the editing surface for a card becomes correspondingly more complex. This ADR defines how editing interactions should be structured to preserve the mobile-first, minimalist character of the application.

---

## Decision

Card editing must follow a **progressive disclosure pattern** using **bottom sheets** as the primary surface for complex edits, **inline editing** for single-field changes, and **expandable sections** for content that is optional or secondary. Full-page CRUD forms are prohibited for card editing.

---

## Rationale

### 1. Full-page forms are cognitively heavy

A form that displays every editable field — tags, boards, notes, examples, definitions — simultaneously presents the user with too many choices and too much visual noise. Even if fields are optional, their presence implies decisions must be made.

On mobile, full-page forms also create thumb-reach problems for inputs in the upper half of the screen and make scroll position tracking difficult (the user loses their place when the keyboard opens).

### 2. Bottom sheets match the natural gesture vocabulary of mobile

On mobile, vertical swipe is the natural gesture for revealing and dismissing layered content. A bottom sheet that slides up from the bottom of the screen:
- Keeps context visible behind the sheet (partial overlay)
- Is dismissible with a swipe-down gesture
- Allows content to be revealed progressively as the user scrolls up within the sheet
- Does not disrupt the user's position in the underlying list

This matches the interaction model users already understand from native mobile applications.

### 3. Inline editing reduces mode-switching friction

For simple, single-field changes (e.g., editing a personal note, renaming a board, toggling a tag), opening a full bottom sheet is overkill. The field should become editable in place: tap to focus, type, blur to save. This removes the intermediate step of opening an editor surface and returning.

Inline editing is appropriate when:
- Only one field is involved
- The field is already visible on screen
- The change is low-stakes and immediately reversible

### 4. Progressive disclosure preserves minimalism under complexity

Not every user cares about tags, board assignments, or notes for every card. Defaulting to a fully expanded view exposes metadata that many users will never use. Sections that are empty or optional should collapse by default and expand on demand.

This means a card's default visible state is clean and simple, while a power user who taps "more" gets access to the full editing surface without the app looking complex to new users.

### 5. Thumb ergonomics drive interaction placement

The bottom 40% of a mobile screen is the primary thumb zone for right-handed users. Bottom sheets, floating action buttons, and tab bars are all anchored here for a reason. Editing controls — save, cancel, tag chips, board selectors — must be reachable without shifting grip.

Placing save actions at the top of a sheet (common in desktop web form patterns transposed to mobile) forces the user to stretch or shift grip. This is a friction point that compounds across hundreds of daily interactions.

---

## Editing Surface Hierarchy

The following hierarchy governs which surface to use for a given editing action:

| Scenario | Surface |
|---|---|
| Edit a single field (note, title) | Inline edit — tap to focus, blur to commit |
| Assign/remove boards or tags | Bottom sheet — chip multi-select, dismissible |
| Edit meaning content (definition, examples) | Bottom sheet — scrollable, sectioned |
| Add a new block (note, example) | Bottom sheet — constrained single-purpose form |
| Destructive actions (remove from board, delete note) | Inline confirmation toast or swipe action, not a full dialog |
| Delete card | Full confirm dialog — this is irreversible |

---

## Consequences

### Positive

- The vocabulary list and card detail views remain visually clean. Editing surfaces appear only on demand.
- Bottom sheets maintain context — the user does not lose their scroll position in the underlying list.
- Progressive disclosure means the app feels simple to new users and powerful to experienced ones.
- Thumb ergonomics are respected across the editing flow.

### Negative

- Bottom sheets require careful implementation: drag handle, animation, keyboard avoidance, backdrop tap-to-dismiss. This is more engineering effort than a simple `<form>` page.
- Inline editing requires careful handling of blur, focus, and autosave semantics. Deciding when to commit vs. discard requires explicit UX rules.
- Testing editing flows on mobile browsers requires device or realistic emulator testing — keyboard appearance behaviour is difficult to validate in desktop dev tools.

### Neutral

- Desktop and wide-viewport users will see bottom sheets rendered as side drawers or modals anchored to the triggering element. The same interaction model applies but the visual presentation adapts to available space.

---

## Rejected Alternatives

**Full-page edit routes (e.g., `/vocabulary/:id/edit`):** Rejected. Creates navigational overhead, breaks the user's scroll context, and implies a form-filling mental model at odds with the app's character.

**Dialogs centered on screen:** Rejected as the primary editing surface. Centered dialogs feel native on desktop but are thumb-unfriendly on mobile and block too much of the underlying content. Acceptable for simple confirmations (delete), not for complex edits.

**Accordion sections in a single long scroll view:** Rejected. Creates an unpredictable, difficult-to-scroll page layout. Mixing navigational scroll with accordion open/close is a UX anti-pattern on mobile.
