## Why

Boards are currently strictly private — every board query is scoped to `user_id` with no visibility concept anywhere in the schema. Users have no way to send a board to someone else, and there is no way to bring in a board someone else made. This is the smallest slice of "board management" that resolves that: a board can be marked unlisted, opening its share link shows a read-only view, and the viewer can clone it into their own account with one action. It deliberately excludes public discovery (`/explore`) and multi-owner collaboration — both are separate follow-on changes, sequenced after this one proves people actually use sharing.

## What Changes

- Boards gain a `visibility` field (`private` | `unlisted`, default `private`) and a unique `share_slug`, generated when a board is first shared.
- Board owners can toggle a board to unlisted from the existing board UI, which reveals a copyable share link.
- A new public, unauthenticated read endpoint serves an unlisted board's name, description, color, and word list by slug. Private boards return 404 regardless of the slug.
- A new authenticated "clone" endpoint copies a shared board's name and cards into a brand-new board owned by the caller. The clone is a one-time, independent copy — it does not stay linked to the source board and does not reflect later edits to it.
- A new read-only shared-board page renders the public view and, for signed-in viewers, an "Add to my vocabulary" action. Signed-out viewers see a sign-in prompt before cloning.
- Turning a board back to private invalidates its existing share link (a new slug is issued if it is shared again).

## Capabilities

### New Capabilities
- `board-sharing`: Visibility state on boards, slug-based public read access, and clone-to-own-account for unlisted boards.

### Modified Capabilities
(none — `boards` has no existing spec under `openspec/specs/`; this proposal defines the sharing behavior as a standalone capability rather than amending undocumented existing behavior)

## Impact

- **Backend**: new migration on `boards` (`visibility`, `share_slug` columns + unique index); `boards.controller.ts` / `boards.service.ts` gain a public route group with no auth guard (`GET /boards/shared/:slug`) plus `POST /boards/shared/:slug/clone` and a `PATCH /boards/:id/visibility` toggle. Public route needs its own rate limiting — it is the first unauthenticated endpoint in the API.
- **Frontend**: new `/board/:slug` route and page (read-only `VocabularyList` reuse); a "Share" action added to `VocabularyBoardsSidebar` / `MobileBoardsSelector` opening a share sheet with copy-link; `AppRouter.tsx` gains the new public route (outside `RequireAuth`).
- **No changes** to `card_boards`, existing private board CRUD, or the Home page boards widget.
