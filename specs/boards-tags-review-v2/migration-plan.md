# Migration Plan: boards-tags-review-v2

**Status:** Planned  
**Last updated:** 2026-05-17

---

## Principles

1. **All existing user data must be preserved.** No card, review log, or user account is lost during migration.
2. **Review history is sacred.** The `ReviewLog` table and all `Card` SM-2 state (ease factor, interval, next review date) must survive untouched.
3. **Migrations are additive first.** New tables and nullable columns are added before any data transformation. No existing column is altered or dropped until after the new structure is verified.
4. **Zero-downtime migrations preferred.** Each schema migration should be deployable without taking the app offline. This requires column additions and index creation to be non-blocking.
5. **Backward compatibility during rollout.** The API must remain functional during the migration window. New fields are optional; existing endpoints continue to work without them.

---

## Current Schema State

Before this initiative, the schema contains:

- `users` — user accounts
- `words` — cached dictionary entries
- `meanings` — word definitions (FK: `word_id`)
- `user_words` — user–word relationship (FK: `user_id`, `word_id`)
- `cards` — flashcards with SM-2 state (FK: `meaning_id`, `user_id`)
- `review_logs` — review history (FK: `card_id`, `user_id`)

No organisation structure exists. All cards are in a single implicit "All" vocabulary.

---

## Migration Phases

### Phase 1: Add new tables (additive, non-breaking)

**Steps:**

1. Create `boards` table:
   ```
   boards(id, user_id, name, description, color_accent, position, is_archived, created_at, updated_at)
   ```
   No data to migrate — table starts empty.

2. Create `card_boards` join table:
   ```
   card_boards(card_id, board_id, assigned_at)
   ```
   PK: `(card_id, board_id)`. FK cascades on both sides. No data to migrate — all cards start unassigned to any board.

3. Create `tags` table:
   ```
   tags(id, user_id, name, created_at, updated_at)
   ```
   Unique constraint on `(user_id, lower(name))`.

4. Create `card_tags` join table:
   ```
   card_tags(card_id, tag_id, assigned_at)
   ```
   PK: `(card_id, tag_id)`.

5. Create `card_notes` table:
   ```
   card_notes(id, card_id, body, created_at, updated_at)
   ```
   Unique constraint on `card_id`.

**Rollback:** Drop the five new tables. No data loss.

**Deploy:** This migration can be deployed independently, before any application code changes. The app continues functioning normally with no visible change to users.

---

### Phase 2: API and application code deployment

After Phase 1 migrations are applied and verified:

- Deploy new backend modules: `BoardsModule`, `TagsModule`.
- Deploy extended `VocabularyModule` with filter/sort params.
- Deploy extended `ReviewsModule` with board-filtered queue.
- Deploy `CardNotesModule` (or extend `VocabularyModule`).
- Deploy extended `GET /vocabulary` response shape with `boards`, `tags`, `note`, `reviewState.nextReviewHuman` fields.

**Backward compatibility:**
- The `GET /vocabulary` response adds new fields but does not remove existing ones.
- The `POST /vocabulary` body adds `meaningIds` as an optional param — omitting it preserves existing behavior.
- The `GET /reviews/queue` adds `boardId` as an optional param — omitting it preserves existing behavior.

No existing frontend functionality breaks during this window. The frontend is unaware of the new fields until the frontend deployment.

---

### Phase 3: Frontend deployment

After Phase 2 is live and stable:

- Deploy new frontend entity types: `board`, `tag`, `card-note`.
- Deploy extended vocabulary list with filter bar, board chips, tag chips, compact mode.
- Deploy card detail bottom sheet with boards/tags/notes sections.
- Deploy bottom sheet component to design system.
- Deploy chip multi-select component to design system.
- Deploy selective meaning import flow on word save.
- Deploy board-filtered review entry point.
- Deploy review session: humanised timing previews on card back.
- Deploy review session summary improvements.

---

### Phase 4: Data backfill (optional, user-driven)

No automatic backfill is required for boards or tags — they start empty for all users. The "legacy cards" problem does not apply here because the app does not assign cards to boards by default.

**Optional system-generated board:** One possible UX enhancement is a "Saved Words" default board that is auto-created for new users and auto-populated with existing cards for legacy users. This is a product decision, not a technical requirement. See `open-questions.md` for discussion.

If a default board is introduced for legacy users:
- A one-time data migration script creates one board per existing user.
- A second pass inserts `card_boards` rows for every card the user owns.
- The board is named "My Vocabulary" or similar and is not special in the data model.
- Users can rename or delete it.

This migration runs as a background script post-deployment, not as a blocking migration step.

---

## Rollout Strategy

### Feature flags

The boards and tags UI is gated behind a feature flag for the initial rollout. This allows:
- Staged rollout to a percentage of users.
- Quick disable if unexpected issues arise.
- Internal testing before public availability.

Feature flag implementation: a server-side flag (environment variable or config table) that the `GET /auth/me` or similar endpoint includes in the session payload. The frontend reads this flag and conditionally renders the boards/tags UI.

### Staged rollout order

1. Internal users / admin accounts only.
2. 10% of active users (by last login date).
3. 50% of active users.
4. 100% of users.

At each stage: monitor error rates, API latency on the extended vocabulary endpoint (new joins are added), and user feedback.

---

## Backward Compatibility Concerns

### Review state computation

The extended `GET /vocabulary` endpoint computes review state (`due`, `upcoming`, `new`, `mastered`) inline using a query-time predicate. This is a new computation, but it does not alter the underlying `Card` data.

Risk: `mastered` status requires a threshold definition. If the threshold is changed post-release, cards may shift status unexpectedly. The threshold should be documented and stable.

### `meaningIds` in POST /vocabulary

If `meaningIds` is provided with an empty array, the request should be rejected (400) rather than silently saving all meanings. This prevents a regression where a client omits the array thinking it means "save all" when it actually means "save none".

### SM-2 algorithm

No changes to the SM-2 algorithm or the `Card` entity's SM-2 fields. The board-filtered review queue is a subset of the existing queue, not a separate scheduling system.

### Existing `UserWord` table

TODO: Determine whether `UserWord` (the existing user-word join table) is still used or is superseded by `Card`. If `UserWord` is redundant with the existence of `Card` records, it may be a candidate for deprecation in a future cleanup. Do not alter it in this initiative.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Extended vocabulary query is slow with large card collections | Medium | Medium | Add indexes on `card_boards(board_id)`, `card_tags(tag_id)`, `cards(next_review_date)`. Run EXPLAIN ANALYZE before deploying. |
| Selective meaning save breaks existing mobile app version | Low | High | `meaningIds` is optional and additive. Old clients omit the field and get existing behavior. |
| Users confused by empty boards/tags UI | Medium | Low | Strong empty states with clear onboarding copy. |
| Legacy users feel their vocabulary is disorganised after seeing boards UI | Medium | Medium | Consider default board option (see Phase 4). Surface "All" as the first and always-selected filter. |
| Migration script for default board creates too many rows too fast | Low | Low | Batch the backfill (1000 users at a time) with sleep between batches to avoid locking. |
