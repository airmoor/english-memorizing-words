## 1. Data model

- [x] 1.1 Migration: add `visibility` enum (`private`/`unlisted`, default `private`, not null) to `boards`
- [x] 1.2 Migration: add nullable `share_slug` text column to `boards` with a unique index
- [x] 1.3 Update `board.entity.ts` with the two new fields and their types

## 2. Slug generation & sharing endpoints

- [x] 2.1 Add a slug generator (URL-safe random token, e.g. 10 bytes base62) with a collision-retry loop against the unique index
- [x] 2.2 `PATCH /boards/:id/visibility` — owner-only, toggles `private`/`unlisted`; generates a fresh `share_slug` on `private → unlisted`, clears `share_slug` on `unlisted → private`
- [x] 2.3 Add `visibility` and `share_slug` (when unlisted) to the existing owner-facing board read/list responses

## 3. Public read endpoint

- [x] 3.1 `GET /boards/shared/:slug` — no auth guard; returns `{ name, description, colorAccent, words[] }` only, never owner/user fields
- [x] 3.2 Return a plain 404 for: unknown slug, slug belonging to a `private` board, and slug that was invalidated by unsharing — all three responses must be indistinguishable
- [x] 3.3 Add per-IP rate limiting to this route specifically (reuse existing throttler config if present in the NestJS app; otherwise add a minimal one scoped to this route)
- [x] 3.4 Confirm this route is excluded from the global JWT guard without weakening the guard on any other route (add a regression test asserting other `/boards/*` routes still 401 without a session)

## 4. Clone endpoint

- [x] 4.1 `POST /boards/shared/:slug/clone` — auth required; 404s under the same rules as 3.2 for invalid slugs
- [x] 4.2 Create a new `boards` row owned by the caller, named after the source board (allow the caller to rename post-clone via existing board edit — no special clone-naming UI needed)
- [x] 4.3 For each word on the source board: reuse the caller's existing card if a matching one exists (same matching logic as the Anki/CSV import path in `backend/src/import/`), otherwise create a new card for the caller
- [x] 4.4 Link all resulting cards to the new board via `card_boards` — no relationship is kept back to the source board or its owner
- [x] 4.5 Return the new board's id so the frontend can navigate straight into it

## 5. Frontend: share action on existing board UI

- [x] 5.1 Add a "Share" action to the board context menu in `VocabularyBoardsSidebar.tsx` (desktop) and `MobileBoardsSelector.tsx` (mobile)
- [x] 5.2 Build a share sheet (reuse `AdaptiveSheet`) showing the toggle (private/unlisted), the copyable link once unlisted, and a persistent "this board is shared" indicator matching spec's owner-visibility requirement
- [x] 5.3 Wire the toggle and copy-link action to `PATCH /boards/:id/visibility`

## 6. Frontend: shared-board page

- [x] 6.1 Add `/board/:slug` route in `AppRouter.tsx`, outside `RequireAuth`
- [x] 6.2 Build the shared-board page: fetch from `GET /boards/shared/:slug`, render board header (name, description, color) + word list
- [x] 6.3 Add a `readOnly` prop to `VocabularyList` that suppresses remove/edit affordances; use it here instead of forking the list component
- [x] 6.4 Handle the 404 case with a plain "This board isn't available" state (no distinction between reasons, per spec)
- [x] 6.5 Add copy explaining the clone is a one-time copy, not a live sync ("You'll get a copy as of today — it won't update automatically")

## 7. Frontend: clone flow

- [x] 7.1 "Add to my vocabulary" button on the shared-board page for signed-in users, calling `POST /boards/shared/:slug/clone` and navigating to the new board on success
- [x] 7.2 Signed-out state: "Sign in to add this board" — preserve the `/board/:slug` destination through login/register redirect so the visitor lands back on the same shared board afterward

## 8. Verification

- [x] 8.1 Manual pass: share a board, open its link in a signed-out session, clone it, confirm the clone is independent (edit source, confirm clone unaffected)
- [x] 8.2 Manual pass: unshare a board, confirm the old link 404s
- [x] 8.3 Confirm existing `/vocabulary` board flows (create, select, delete) are unaffected by the new fields
- [x] 8.4 Confirm rate limiting on `GET /boards/shared/:slug` actually triggers under repeated requests
