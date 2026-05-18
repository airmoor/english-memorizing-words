# Backend Architecture: boards-tags-review-v2

**Status:** Planned  
**Last updated:** 2026-05-17

---

## Overview

The backend is a NestJS application using TypeORM, PostgreSQL, and a module-per-domain organisation. This initiative introduces two new modules (`BoardsModule`, `TagsModule`), extends three existing modules (`VocabularyModule`, `ReviewsModule`, `WordsModule`), and defines new TypeORM entities and migrations.

No existing module interfaces are broken. All changes are additive to the public API.

---

## Module Inventory

### New Modules

#### `BoardsModule`

Responsible for board CRUD and card-board assignment.

**Controllers:** `BoardsController`  
**Services:** `BoardsService`  
**Entities:** `Board`, `CardBoard`  
**DTOs:** `CreateBoardDto`, `UpdateBoardDto`, `AssignCardDto`

Responsibilities:
- Create, read, update, archive, delete boards.
- Assign and remove cards from boards.
- List cards in a board (delegating to VocabularyService with a board filter).
- Enforce ownership: all board operations verify that the requesting user owns the board.
- Enforce name uniqueness per user (case-insensitive).
- Compute `cardCount` for board list responses.

**Module dependencies:** `DatabaseModule`, `AuthModule` (for `JwtAuthGuard`).

---

#### `TagsModule`

Responsible for tag CRUD and card-tag assignment.

**Controllers:** `TagsController`  
**Services:** `TagsService`  
**Entities:** `Tag`, `CardTag`  
**DTOs:** `CreateTagDto`, `UpdateTagDto`, `AssignTagDto`

Responsibilities:
- Create, read, update, delete tags.
- Assign and remove tags from cards.
- Find-or-create tag by name (for inline creation on card detail).
- Enforce ownership: tags are user-scoped.
- Normalise tag names to lowercase on create and update.
- Enforce name uniqueness per user (post-normalisation).
- Compute `cardCount` for tag list responses.

**Module dependencies:** `DatabaseModule`, `AuthModule`.

---

### Extended Modules

#### `VocabularyModule` (extended)

Current responsibilities: save/unsave meanings, list user vocabulary.

**New responsibilities:**

1. **Extended vocabulary list** — `GET /vocabulary` gains filter params (`boardId`, `tagIds`, `reviewState`, `partOfSpeech`) and sort params. The underlying query is extended with conditional `JOIN` clauses and `WHERE` predicates.

2. **Inline related data** — The vocabulary list response now includes `boards`, `tags`, and `note` per card. The query uses `LEFT JOIN` on `card_boards`, `card_tags`, `card_notes`. Aggregation (grouping board/tag rows per card) is done in the service layer or via a subquery/lateral join strategy to avoid row explosion.

3. **Selective meaning save** — `POST /vocabulary` accepts an optional `meaningIds` array. If provided, only the specified meanings are saved.

4. **Card note CRUD** — Either in `VocabularyModule` directly or in a new `CardNotesModule`. Decision: co-locate with VocabularyModule to avoid a very thin module. See open-questions.

**New DTOs:** `VocabularyFilterDto` (query params), `SaveWordDto` extended with `meaningIds`.

**Query strategy for filtered vocabulary list:**

The vocabulary list query is the most complex query in the system after this extension. The recommended approach:

1. Apply board filter as a subquery or `INNER JOIN` on `card_boards` when `boardId` is set.
2. Apply tag filter as an `EXISTS` correlated subquery for each tag ID (AND logic) rather than a join that multiplies rows.
3. Apply review state filter as a computed `CASE` expression on `cards.next_review_date` and `cards.last_reviewed_at`.
4. Apply sort via `ORDER BY` with index-backed columns.
5. Fetch boards, tags, and note for each card in a second query (or via a lateral join) and merge in the service layer. This avoids the Cartesian product of joining all three relations simultaneously.

Alternative: Use TypeORM `QueryBuilder` with `leftJoinAndSelect` for boards, tags, note, and handle the resulting rows with a grouping/reduce step in the service. This is simpler to implement but may return more rows than necessary for large vocabularies.

**Indexes required:**
- `card_boards(board_id)` — for board-filtered queries.
- `card_tags(tag_id)` — for tag-filtered queries.
- `cards(next_review_date)` — for review state sorting (already likely indexed).
- `cards(user_id, next_review_date)` — composite for user-scoped review sort.

---

#### `ReviewsModule` (extended)

Current responsibilities: queue computation, review submission, SM-2 state update.

**New responsibilities:**

1. **Board-filtered review queue** — `GET /reviews/queue` accepts optional `boardId`. When provided, the queue is limited to cards belonging to that board. The SM-2 scheduling logic is unchanged; only the set of cards is filtered.

2. **Next-review timing previews** — A function that computes hypothetical SM-2 outcomes for all four ratings (Again/Hard/Good/Easy) given the current card's state. Returns humanised time labels. This is a pure function with no side effects — it does not write to the database.

3. **Review submission extended response** — After a review is submitted and the card's SM-2 state is updated, return the `nextReviewPreviews` for the *next* card in the queue (not the just-reviewed card, which is already updated). This allows the frontend to pre-display the previews on the next card's front side before the flip.

**New services:** `ReviewTimingService` — isolated service for SM-2 preview computation and time humanisation. This service has no DB dependencies; it is a pure computation layer.

---

#### `WordsModule` (extended)

Current responsibilities: word lookup, external API integration, caching.

**New responsibility:**

- The word lookup response (used for the search page) must expose meaning IDs that the frontend can pass to the selective meaning save endpoint. Currently meanings may be returned without a stable ID surfaced to the frontend.
- Verify that `Meaning.id` (UUID) is included in the word lookup response. If not already included, add it.

No significant architectural change. This is a data exposure fix, not a new feature.

---

## Entity Boundaries

The TypeORM entities introduced by this initiative and their ownership:

| Entity | Module | Notes |
|---|---|---|
| `Board` | `BoardsModule` | User-owned; no shared state |
| `CardBoard` | `BoardsModule` | Join table; no independent business logic |
| `Tag` | `TagsModule` | User-owned; normalised name |
| `CardTag` | `TagsModule` | Join table; no independent business logic |
| `CardNote` | `VocabularyModule` | One-to-one with Card; may be extracted to `CardNotesModule` later |

Existing entities (`Card`, `Meaning`, `Word`, `User`, `ReviewLog`) are unchanged in structure.

---

## Validation Concerns

### DTO validation (class-validator)

All new DTOs use `class-validator` decorators following existing conventions:

- `@IsString()`, `@IsNotEmpty()`, `@MaxLength()` on name fields.
- `@IsUUID()` on ID fields.
- `@IsBoolean()`, `@IsOptional()` for optional booleans.
- `@IsEnum()` for review state filter values.
- `@IsArray()`, `@ArrayMinSize(1)` on `meaningIds` when provided.

### Ownership guards

Every board and tag operation must verify ownership at the service layer, not just at the controller layer:

```
// Pattern for all board operations
const board = await this.boardsRepo.findOne({ where: { id, userId } });
if (!board) throw new NotFoundException();
```

This prevents horizontal privilege escalation where a user manipulates IDs in request bodies to access other users' boards/tags.

### Case-insensitive uniqueness

Board name and tag name uniqueness constraints are enforced at two levels:

1. **Application layer:** Service normalises/trims names before checking.
2. **Database level:** A unique index on `lower(name)` per user provides the authoritative constraint and prevents race conditions.

On conflict, the database throws a unique constraint error. The service catches it and translates it to a NestJS `ConflictException` with a user-friendly message.

---

## DTO Evolution

### Versioning strategy

The API does not introduce versioned routes (`/v2/`) for this initiative. All changes are backward-compatible additions. The existing single-version convention is maintained.

If future changes require breaking API changes, the approach would be:
- Route versioning with NestJS `VersioningType.URI` (`/v2/vocabulary`).
- The existing `/v1/` endpoints remain functional for a deprecation period.

This is not required now. Document the decision and revisit if needed.

### Response DTOs

New response DTOs are defined for all new endpoints. Response DTOs use `class-transformer` `@Expose()` and `@Exclude()` decorators (following existing conventions if applicable) or are constructed as plain interfaces in a `types/` directory per module.

Check existing conventions: if the codebase uses `ResponseDto` classes with `plainToInstance`, follow that. If it returns plain objects, follow that.

TODO: Verify existing DTO serialisation pattern in `VocabularyModule` and follow the same approach.

---

## Module Registration

New modules are registered in `AppModule`:

```typescript
// app.module.ts
imports: [
  // existing...
  BoardsModule,
  TagsModule,
]
```

Both modules export their services if needed by other modules (e.g., `BoardsService` may be used by `ReviewsModule` to validate `boardId` in queue requests).

---

## Health Check

The existing `HealthModule` (which provides a basic health endpoint) is unaffected. No changes required.

---

## Error Handling

All new modules follow the existing error handling convention:

- `NotFoundException` (404) — resource not found or not owned by user.
- `ConflictException` (409) — duplicate name.
- `BadRequestException` (400) — validation failure (in addition to global validation pipe).
- `ForbiddenException` (403) — if ownership check fails in a way that distinguishes "found but not yours" from "not found" (security consideration: typically treat as 404 to avoid enumeration).

The global exception filter (if one exists in the codebase) handles these uniformly. New modules do not introduce custom exception filters.

---

## Testing Considerations

TODO: Establish the testing convention used in the existing codebase (unit tests per service, e2e tests per controller, or both) before writing tests for new modules.

- `BoardsService` logic (name uniqueness, ownership, position management) warrants unit tests.
- `ReviewTimingService` (SM-2 preview computation, humanisation) is a pure function — easy to unit test.
- Extended vocabulary query filtering warrants an integration test against a real test database to catch SQL errors and index usage.
