# Open Questions: boards-tags-review-v2

**Status:** Active  
**Last updated:** 2026-05-17

Questions are grouped by domain. Each question includes the current default assumption (if one exists) and the decision criteria needed to resolve it.

---

## Boards

**Q1: Should boards support icons?**  
A board list with only text names may feel flat. Icons (emoji or a small icon picker) could help users visually distinguish boards quickly.  
_Default assumption: No icons in this iteration. Color accents (a `colorAccent` field is reserved in the schema) may be introduced first._  
_Resolve when: icon support is requested by users or in early beta feedback._

**Q2: Should boards support a description?**  
The data model includes an optional `description` field. It's unclear whether descriptions add UX value or just add noise.  
_Default assumption: Include the field in the data model; do not surface it prominently in the UI. Show only in board management view._  
_Resolve when: UX designs for board management are finalised._

**Q3: How should archived boards behave in review?**  
If a user archives a board, should cards in that board still appear in the global review queue?  
_Default assumption: Yes. Archiving a board hides the board from the filter bar but does not affect the cards' review schedules. Cards are still reviewed in the global queue._  
_Resolve when: the archive feature is implemented. May require a user-facing explanation._

**Q4: Should there be a default board for new and existing users?**  
Existing users who upgrade will have a non-empty vocabulary list with no board assignments. Should a default "My Vocabulary" board be created for them to provide a populated starting state?  
_Default assumption: No default board. The vocabulary list always shows all cards. Empty board state is fine because "All" is always available._  
_Resolve before: Phase 4 is deployed to existing users. This is a product decision with UX and migration implications._

**Q5: Should boards be reorderable by the user?**  
The `position` field on `Board` supports ordering. But drag-to-reorder in a chip strip on mobile is complex.  
_Default assumption: Not in Phase 4. Order defaults to creation order. Reordering may be added in Phase 7 or a future iteration._

**Q6: What is the maximum number of boards a user should be able to create?**  
Without a limit, a user could create hundreds of boards, degrading the filter bar UX.  
_Default assumption: Soft limit of 50 boards per user. Above that, a "Browse boards" full-screen picker is required (and is already planned). Hard limit at 200 with a validation error._  
_Resolve when: product decides on reasonable limits._

---

## Tags

**Q7: Should tags be user-colorable?**  
Colored tags add visual organisation but also add friction to tag creation (color must be chosen).  
_Default assumption: No colors in this iteration. Tags are text-only with a neutral chip style._  
_Resolve when: user feedback from early releases indicates color would help._

**Q8: Should tag names be case-sensitive?**  
Currently: normalised to lowercase at application layer. This means `Formal` and `formal` are the same tag.  
_Default assumption: Case-insensitive (lowercase normalisation). Simpler UX; prevents duplicates._  
_Resolve before: Phase 2 implementation. This affects the unique constraint definition._

**Q9: Should there be a global/suggested tag vocabulary?**  
Some tags are near-universal (noun, verb, adjective, formal, informal, idiom). Pre-seeding suggestions could help new users.  
_Default assumption: No global vocabulary. Autocomplete surfaces the user's own existing tags. Onboarding copy may suggest common tag names._  
_Resolve when: onboarding design is finalised._

**Q10: How should tag autocomplete rank suggestions?**  
Should suggestions be ranked by frequency of use (most-used tags first), alphabetically, or by recency?  
_Default assumption: Alphabetical for simplicity. Frequency-ranked could be added later._  
_Resolve before: Phase 4 tag input implementation._

**Q11: What is the maximum number of tags per user? Per card?**  
_Default assumption: 100 tags per user. 10 tags per card (enforced at application layer). These are soft constraints informed by UX (10 chips per card is already visually overwhelming)._  
_Resolve when: limits are finalised._

---

## Card Notes

**Q12: Should clearing a note delete the `CardNote` record, or keep an empty record?**  
If the user clears the note body and blurs, should the backend delete the `CardNote` row or update it to an empty string?  
_Default assumption: DELETE the `CardNote` row if the body becomes empty after trim. This keeps the database clean. The API `PUT /cards/:id/note` with an empty body triggers deletion._  
_Resolve before: Phase 5 note implementation. Affects `NoteSection` auto-save logic._

**Q13: Should cards support multiple note blocks in the future?**  
The data model spec flags `CardNote` as a stepping stone to a `CardBlock` system. This question asks whether the UI should be designed with future block extensibility in mind, or treat note as a singleton.  
_Default assumption: Treat note as a singleton in the UI for this iteration. The data model reserves extensibility, but the UX does not expose block concepts._  
_Resolve when: Phase 5 design is finalised._

**Q14: Should notes support markdown formatting?**  
_Default assumption: No. Plain text only. Markdown rendering in a small chip-input-size note area is visually messy on mobile._  
_Resolve when: user research indicates formatted notes are desired._

---

## Selective Meaning Import

**Q15: On the meaning picker, should meanings be pre-selected by default, or opt-in?**  
Option A: All meanings unchecked — user must explicitly select.  
Option B: Most common / first meaning pre-checked — user removes unwanted meanings.  
Option C: All meanings pre-checked — user removes unwanted meanings (closest to current behavior).  
_Default assumption: Option A (all unchecked). This surfaces the picker as a deliberate choice, not a pre-approval. But this adds friction for users who want to save all meanings quickly._  
_Resolve before: Phase 5 implementation. Consider A/B testing if feasible._

**Q16: Should there be a "Save all" shortcut on the meaning picker?**  
A "Select all" checkbox or "Save all meanings" button that bypasses the picker.  
_Default assumption: Yes. A "Select all" checkbox at the top of the picker allows the existing one-tap save behavior._

**Q17: If a user saves additional meanings for a word they already have in vocabulary, should existing cards' review state be preserved?**  
_Default assumption: Yes. Existing cards are left completely untouched. New cards are created only for the newly selected meanings._

---

## Review System

**Q18: Should rating preview labels be computed client-side or fetched from the server?**  
Option A: Server returns preview timings in the vocabulary/review response, computed from SM-2 state.  
Option B: Client computes previews using a JavaScript port of the SM-2 preview function.  
_Tradeoffs: Server-side is authoritative and single source of truth, but adds response payload. Client-side is faster (no additional latency) but must be kept in sync with backend logic._  
_Default assumption: Server-side for initial implementation. The vocabulary list already returns SM-2 state; the server adds `nextReviewPreviews` to the card response._

**Q19: Should a board-filtered review session include "New" cards (never reviewed), or only cards that are due?**  
_Default assumption: Both. Same behavior as the global queue — due cards first, then new cards if the due queue is empty. This matches SM-2 convention._  
_Resolve before: Phase 6 implementation._

**Q20: Should review timing update live (real-time) while the vocabulary list is open?**  
A card's "Due" status changes moment-to-moment. If the user keeps the app open for hours, a card that was "Upcoming" may become "Due" without a page refresh.  
_Default assumption: No live updates. The list reflects the state at last fetch. A pull-to-refresh gesture triggers a re-fetch. This is simpler and avoids unnecessary re-renders._  
_Resolve when: user feedback indicates stale due-state causes confusion._

**Q21: What is the mastery threshold (ease factor + interval) for the "Mastered" badge?**  
_Default assumption: `ease_factor >= 2.5 AND interval >= 21 days`. This means the card is reviewed approximately monthly at a healthy retention rate._  
_Resolve before: Phase 6 — the threshold must be defined before it can be implemented._

**Q22: Should the "Again" rating in a board-filtered session affect the global review schedule?**  
_Default assumption: Yes. Review ratings always affect the card's global SM-2 state. There is no "practice mode" that leaves SM-2 state unchanged. This is the existing behavior and is not changed by board filtering._

---

## UX and Navigation

**Q23: Should the "Review this board" action be a persistent button or appear only when cards are due?**  
_Default assumption: Show always when a board filter is active, but dim it (disabled state) if zero cards are due in that board. Tap on the dimmed state shows "No cards due in [Board Name]. Next due in [time]."_

**Q24: Should compact mode be a persistent user preference or a per-session toggle?**  
_Default assumption: Per-session toggle only. Not persisted across cold restarts. A future settings option could make it persistent._
