# API Design: boards-tags-review-v2

**Status:** Planned  
**Last updated:** 2026-05-17

All endpoints are authenticated (JWT via httpOnly cookie). All request/response bodies are JSON. All IDs are UUIDs. Base path prefix: `/api` (existing convention).

This document defines the intended API contract. Controllers are not implemented yet.

---

## Design Principles

- **Resource-oriented REST.** Boards, tags, and notes are resources with standard CRUD.
- **Relationship endpoints use nested routes.** Board membership is expressed as `POST /boards/:id/cards`, not as a property mutation on the card.
- **Filtering via query params on collection endpoints.** The vocabulary list endpoint receives filter state as query params, not as a POST body.
- **Immediate consistency.** All writes return the updated resource. Clients should not re-fetch after a write.
- **No breaking changes to existing endpoints.** Existing endpoints are extended with optional params only. Existing clients (if any) continue to function.

---

## Boards

### List boards

```
GET /boards
```

Returns the user's boards ordered by `position`, excluding archived by default.

**Query params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `includeArchived` | boolean | false | Include archived boards in response |

**Response 200:**
```json
{
  "boards": [
    {
      "id": "uuid",
      "name": "IELTS Writing",
      "description": null,
      "colorAccent": null,
      "position": 0,
      "isArchived": false,
      "cardCount": 14,
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ]
}
```

`cardCount` is the number of cards currently assigned to the board.

---

### Create board

```
POST /boards
```

**Request body:**
```json
{
  "name": "IELTS Writing",
  "description": "Words for academic essay writing",
  "colorAccent": null
}
```

**Validation:**
- `name` required, 1–80 chars, trimmed.
- Name must be unique (case-insensitive) for this user.
- `description` optional, max 500 chars.
- `colorAccent` optional, reserved for future use.

**Response 201:** Full board object as above.

**Response 409:** If name already exists for this user.

---

### Get board

```
GET /boards/:id
```

**Response 200:** Full board object including `cardCount`.

**Response 404:** Board not found or not owned by user.

---

### Update board

```
PATCH /boards/:id
```

**Request body (all fields optional):**
```json
{
  "name": "IELTS Academic",
  "description": "Updated description",
  "colorAccent": null,
  "position": 2,
  "isArchived": false
}
```

**Validation:** Same as create for `name` if provided.

**Response 200:** Updated board object.

---

### Delete board

```
DELETE /boards/:id
```

Deletes the board and removes all card-board assignments. Cards are not deleted.

**Response 204:** No content.

---

### List cards in board

```
GET /boards/:id/cards
```

Returns cards assigned to this board, using the same response shape as `GET /vocabulary` (see extended vocabulary endpoint below). Supports the same filter/sort params except `boardId` (which is implicit from the route).

**Response 200:** Same shape as vocabulary list response.

---

### Assign card to board

```
POST /boards/:boardId/cards/:cardId
```

Adds the card to the board. Idempotent — if already assigned, returns 200 without error.

**Response 200:**
```json
{ "assigned": true, "assignedAt": "2026-05-17T12:00:00Z" }
```

**Response 404:** Board or card not found, or not owned by user.

---

### Remove card from board

```
DELETE /boards/:boardId/cards/:cardId
```

Removes the card from the board. Idempotent — if not assigned, returns 200 without error.

**Response 200:**
```json
{ "removed": true }
```

---

## Tags

### List tags

```
GET /tags
```

Returns the user's tags ordered alphabetically, with card count.

**Response 200:**
```json
{
  "tags": [
    {
      "id": "uuid",
      "name": "formal",
      "cardCount": 8,
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ]
}
```

---

### Create tag

```
POST /tags
```

**Request body:**
```json
{ "name": "formal" }
```

**Validation:**
- `name` required, 1–40 chars.
- Normalised to lowercase at application layer.
- Must be unique for this user (after normalisation).

**Response 201:** Full tag object.

**Response 409:** Tag name already exists.

---

### Update tag

```
PATCH /tags/:id
```

**Request body:**
```json
{ "name": "informal" }
```

Renaming a tag propagates automatically to all card assignments (no re-assignment needed — `CardTag` references the tag by ID).

**Response 200:** Updated tag object.

---

### Delete tag

```
DELETE /tags/:id
```

Deletes the tag and removes all card-tag assignments.

**Response 204:** No content.

---

### Assign tag to card

```
POST /cards/:cardId/tags/:tagId
```

**Response 200:**
```json
{ "assigned": true, "assignedAt": "2026-05-17T12:00:00Z" }
```

---

### Remove tag from card

```
DELETE /cards/:cardId/tags/:tagId
```

**Response 200:**
```json
{ "removed": true }
```

---

### Create and assign tag in one step

For the inline tag input on card detail — creates a tag if it doesn't exist, then assigns it.

```
POST /cards/:cardId/tags
```

**Request body:**
```json
{ "name": "phrasal-verb" }
```

**Behavior:**
1. Normalise name to lowercase.
2. Find or create tag with that name for this user.
3. Assign the tag to the card (idempotent).

**Response 200:**
```json
{
  "tag": { "id": "uuid", "name": "phrasal-verb", "cardCount": 1, "createdAt": "..." },
  "assigned": true
}
```

---

## Card Notes

### Get note for card

```
GET /cards/:cardId/note
```

**Response 200:**
```json
{ "id": "uuid", "cardId": "uuid", "body": "Often used in academic contexts.", "createdAt": "...", "updatedAt": "..." }
```

**Response 404:** No note exists for this card (client should show empty state).

---

### Create or update note

Upsert semantics — creates if no note exists, updates if it does.

```
PUT /cards/:cardId/note
```

**Request body:**
```json
{ "body": "Used to describe something that is unclear or open to interpretation." }
```

**Validation:**
- `body` required, max 2000 chars.
- Empty string is valid (clears the note content without deleting the record).

**Response 200:** Full note object.

---

### Delete note

```
DELETE /cards/:cardId/note
```

**Response 204:** No content.

---

## Extended Vocabulary Endpoints

### List vocabulary (extended)

The existing `GET /vocabulary` endpoint is extended with additional filter and sort params. Existing params (if any) are preserved.

```
GET /vocabulary
```

**Extended query params:**

| Param | Type | Description |
|---|---|---|
| `boardId` | uuid | Filter to cards in this board |
| `tagIds` | uuid[] (comma-separated) | Filter to cards with ALL of these tags (AND logic) |
| `reviewState` | `due \| upcoming \| new \| mastered` | Filter by review state |
| `partOfSpeech` | string | Filter by part-of-speech string |
| `sort` | `nextReview \| dateAdded \| alpha` | Sort order |
| `sortDir` | `asc \| desc` | Sort direction (default varies by sort field) |
| `limit` | integer | Pagination page size (default 50, max 200) |
| `cursor` | string | Cursor for keyset pagination |

**Review state definitions (computed at query time):**
- `due` — `next_review_date <= now()`
- `upcoming` — `next_review_date > now() AND next_review_date <= now() + 7 days`
- `new` — `last_reviewed_at IS NULL`
- `mastered` — `ease_factor >= 2.5 AND interval >= 21` (configurable thresholds)

**Extended response shape per card:**

```json
{
  "cards": [
    {
      "id": "uuid",
      "word": "ambiguous",
      "transcription": "/æmˈbɪɡjuəs/",
      "meanings": [
        {
          "id": "uuid",
          "definition": "Open to more than one interpretation.",
          "partOfSpeech": "adjective",
          "examples": ["The wording of the law is ambiguous."]
        }
      ],
      "reviewState": {
        "status": "upcoming",
        "nextReviewAt": "2026-05-20T09:00:00Z",
        "nextReviewHuman": "In 3 days",
        "interval": 7,
        "easeFactor": 2.3,
        "lastReviewedAt": "2026-05-13T09:00:00Z"
      },
      "boards": [
        { "id": "uuid", "name": "IELTS Writing" }
      ],
      "tags": [
        { "id": "uuid", "name": "formal" },
        { "id": "uuid", "name": "adjective" }
      ],
      "note": {
        "body": "Often appears in academic essays."
      },
      "createdAt": "2026-04-01T10:00:00Z"
    }
  ],
  "pagination": {
    "nextCursor": "base64-encoded-cursor",
    "hasMore": true,
    "total": 142
  }
}
```

The `nextReviewHuman` string is computed server-side using a humanisation function. See `review-system.md` for the humanisation rules.

---

## Selective Meaning Save

The existing word save endpoint is extended to accept an explicit list of meaning IDs.

```
POST /vocabulary
```

**Current behavior:** Saves the word and creates cards for all meanings.

**Extended request body:**
```json
{
  "wordId": "uuid",
  "meaningIds": ["uuid1", "uuid2"]
}
```

**Behavior:**
- `meaningIds` is optional for backward compatibility.
- If `meaningIds` is omitted: existing behavior (save all meanings).
- If `meaningIds` is provided: save only the specified meanings. At least one ID must be provided. All IDs must belong to the specified word.
- If the user already has a card for a meaning in `meaningIds`: the existing card is preserved (no duplicate, no reset of review state).
- If the user already has cards for meanings NOT in `meaningIds`: those existing cards are NOT removed (this is an additive operation).

**Response 201:** List of created (or existing) card summaries.

---

## Review Endpoints (extended)

### Start review session

The existing session/queue endpoint is extended to support board-filtered sessions.

```
GET /reviews/queue
```

**Extended query params:**

| Param | Type | Description |
|---|---|---|
| `boardId` | uuid | Limit the review queue to cards in this board |
| `limit` | integer | Max cards in session (default: unbounded or configurable) |

**Response 200:**
```json
{
  "cards": [...],
  "sessionMeta": {
    "boardId": "uuid",
    "boardName": "IELTS Writing",
    "totalDue": 8
  }
}
```

`sessionMeta` is included when `boardId` is provided.

---

### Submit review (extended response)

The existing review submission endpoint is extended to return next-review timing previews for each rating in the current card's context — so the frontend can display them on the card back.

```
POST /reviews
```

**Response 200 (extended):**
```json
{
  "card": { ... },
  "nextReview": {
    "again": { "human": "In 10 min", "at": "2026-05-17T12:10:00Z" },
    "hard": { "human": "Tomorrow", "at": "2026-05-18T09:00:00Z" },
    "good": { "human": "In 4 days", "at": "2026-05-21T09:00:00Z" },
    "easy": { "human": "In 12 days", "at": "2026-05-29T09:00:00Z" }
  }
}
```

The `nextReview` preview is computed before the rating is submitted — it shows what would happen for each rating, not the chosen result. The actual next review is reflected in the `card` object.

**Alternative:** The previews can be computed and returned by a separate lightweight endpoint called before the card flip, to avoid coupling rating submission with preview display. See open-questions.md for this design question.

---

## Error Response Shape

All error responses follow a consistent envelope:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "A board with this name already exists."
}
```

Validation errors include a `details` array:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    { "field": "name", "message": "name must not be empty" }
  ]
}
```
