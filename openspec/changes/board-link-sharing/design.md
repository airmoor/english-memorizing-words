## Context

Boards live in `backend/src/database/entities/board.entity.ts` (table `boards`), scoped to `user_id` on every query in `boards.service.ts`, which uses hand-written parameterized SQL via `DataSource.query` rather than the TypeORM repository pattern. Cards attach to boards through a many-to-many `card_boards` join table; deleting a board never deletes cards. There is currently no unauthenticated route anywhere in the API — every controller sits behind the Passport-JWT httpOnly-cookie guard. The frontend is React Router 7 with a single `AppRouter.tsx` route table, all board-aware UI living under `/vocabulary` (board = a `?board=` query param, not a route).

This design covers Option A from the board-management proposal: link sharing + clone. It intentionally stops short of public discovery or multi-owner editing.

## Goals / Non-Goals

**Goals:**
- A board owner can flip a board to "unlisted" and get a stable, unguessable link.
- Anyone with that link — signed in or not — can view the board's words read-only.
- A signed-in viewer can turn that into their own private, editable board with one action.
- Turning a board back to private immediately kills the old link.

**Non-Goals:**
- No public listing/search (`/explore`) — that is a separate future change, and depends on this one shipping first.
- No live sync between the source board and its clones — a clone is a one-time copy, not a subscription.
- No multi-owner editing, invites, or roles — a board still has exactly one owner.
- No rich moderation tooling — unlisted links are not indexed or browsable, which keeps abuse surface low enough to defer this.

## Decisions

**Slug generation: random token, not a slugified board name.**
Board names are freeform and already unique only per-owner (`UNIQUE(user_id, name)`), so they collide across users and can contain anything. Use a URL-safe random token (e.g. 10 bytes, base62 — matches the `lex-xxxxxxxx` shape shown in the proposal) generated server-side when a board is first shared. Alternatives considered: slugifying the name (rejected — collides, leaks the exact board name into the URL, and churns if the name is edited) and using the board's UUID directly as the slug (rejected — UUIDs are already used as internal IDs elsewhere and reusing one as a public identifier makes it harder to later distinguish "internal id" from "thing safe to put in a URL / share").

**New slug on every re-share, not a stable one.**
Setting visibility back to `private` clears `share_slug`; setting it to `unlistedagain later issues a fresh slug rather than restoring the old one. This makes "stop sharing" behave the way users expect — the old link should not silently start working again — at the cost of breaking a link if someone toggles visibility off and on by mistake. Acceptable for v1; worth a confirmation dialog on the toggle-off action rather than a backend workaround.

**Clone is a deep, disconnected copy.**
`POST /boards/shared/:slug/clone` creates a new `boards` row owned by the caller and new `card_boards` rows linking the caller's own card copies — not a reference back to the source. Cards themselves: if the caller already has a card for a given word (matched on the existing card identity/word key used elsewhere in vocabulary import), reuse it; otherwise create a new card for the caller, same as the existing Anki/CSV import path does. This reuses the vocabulary-import system's "add this word to my collection" logic rather than inventing a second one — clone is conceptually "import from a board" and should share code with "import from a file" wherever the word-ingestion step is concerned. No link is kept between clone and source, matching the proposal's stated non-goal of live sync.

**Public read endpoint is unauthenticated by design, and that is the highest-risk part of this change.**
`GET /boards/shared/:slug` must work for a logged-out visitor previewing a link before signing up, so it cannot sit behind the existing JWT guard. It is the first unauthenticated route in the API. Mitigations: (1) rate limit by IP specifically on this route — a brute-force slug guesser is the realistic threat model, not a targeted attack, so a coarse per-IP limit (e.g. via existing NestJS throttler if configured, else a minimal in-memory limiter) is sufficient; (2) slug space is large enough (62^10) that guessing is impractical if rate-limited; (3) the endpoint returns only what a board detail view needs (name, description, color, word list) — never the owner's user id, email, or any other account field; (4) a private board's slug (from before it was made private) returns a plain 404, identical to a slug that never existed — no distinguishable "this used to be shared" response.

**Route placement: `/board/:slug`, deliberately singular and distinct from `/vocabulary?board=`.**
Keeps the reader's own board-filter URLs (`/vocabulary?board=<uuid>`) and shareable public URLs (`/board/<slug>`) visually and structurally separate — a `<uuid>` in a query param is internal; a `<slug>` in a path segment is the "thing you'd paste into a chat." Placed outside `RequireAuth` in `AppRouter.tsx`; the page itself checks auth state only to decide whether to show "Add to my vocabulary" or "Sign in to add this board."

**Reuse `VocabularyList` in a read-only mode rather than building a new list component.**
The shared-board page needs to render the same word cards users already see in `/vocabulary`. Add a `readOnly` prop to suppress the remove/edit affordances rather than forking the component — the existing component already handles compact/detailed view modes and pagination, which the shared view needs too.

## Risks / Trade-offs

- **[Risk]** Unauthenticated endpoint becomes a scraping target for board contents at scale → **Mitigation**: per-IP rate limiting from day one (not a follow-up); revisit if usage data shows it's insufficient.
- **[Risk]** A user shares a board, then edits sensitive-feeling word notes into it, not realizing it's still unlisted-and-live → **Mitigation**: persistent visible indicator ("This board is shared — anyone with the link can view it") on the board itself while `visibility = 'unlisted'`, not just a one-time toast when the toggle was flipped.
- **[Risk]** Clone silently produces duplicate cards if the import-reuse matching logic (same word, different casing/POS) doesn't line up with the existing import system's matching rules → **Mitigation**: explicitly reuse that system's matching function rather than reimplementing word-identity comparison.
- **[Trade-off]** No live sync means a shared board can go stale relative to clones immediately — acceptable per proposal's stated non-goal, but should be stated in the UI copy on the shared-board page itself ("You'll get a copy as of today — it won't update automatically"), not just in this doc.

## Migration Plan

1. Migration: add `visibility` (`enum('private','unlisted')`, default `'private'`, not null) and `share_slug` (`text`, nullable, unique index) to `boards`.
2. Backend: visibility toggle endpoint, public read endpoint, clone endpoint, IP rate limiting on the public route.
3. Frontend: `/board/:slug` route + page, share action + copy-link sheet added to existing board UI, `readOnly` mode on `VocabularyList`.
4. No backfill needed — existing boards default to `private`, which preserves current behavior exactly (nothing becomes shareable without an explicit owner action).
5. Rollback: safe to revert independently at any point before step 3 ships — `visibility='private'` for all existing rows means turning the feature off is just hiding the new UI entry points; no data cleanup required.

## Open Questions

- Should the share sheet let the owner set a display name/description at share-time (distinct from the board's private name), or always show the board's real name? Leaning toward "always real name" for v1 simplicity — revisit if this becomes a real ask.
- Does the clone need its own "cloned from" provenance stored anywhere (even just for the owner's own reference), or is that explicitly out of scope until Phase 2 (explore) needs attribution? Leaning toward deferring — Phase 2's design doc is the right place to decide this once public authorship is actually in play.
