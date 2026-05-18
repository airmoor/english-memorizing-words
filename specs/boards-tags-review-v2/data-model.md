# Data Model: boards-tags-review-v2

**Status:** Planned  
**Last updated:** 2026-05-17

This document describes the proposed domain model evolution. No ORM entities or migration SQL are included here. See `migration-plan.md` for rollout strategy and `backend-architecture.md` for module design.

---

## Existing Entities (for reference)

The current production schema includes these entities:

| Entity | Purpose |
|---|---|
| `User` | Authenticated user account |
| `Word` | Cached dictionary word (shared across users) |
| `Meaning` | One definition/sense of a word (shared across users) |
| `UserWord` | Junction: which words a user has saved |
| `Card` | A user's flashcard for a specific meaning (owns SM-2 state) |
| `ReviewLog` | Historical record of each review event per card |

Key constraint: `Card` is scoped to a `Meaning`, which is scoped to a `Word`. The `Card` entity carries all spaced repetition state (ease factor, interval, next review date).

---

## New Entities

### Board

A named, user-owned collection. Cards are assigned to boards via a join table.

```
Board
├── id: uuid (PK)
├── userId: uuid (FK → User)
├── name: string (max 80 chars, trimmed, non-empty)
├── description: string | null (max 500 chars)
├── colorAccent: string | null  (reserved for future; hex or named token)
├── position: integer            (user-defined order, 0-based)
├── isArchived: boolean          (default: false)
├── createdAt: timestamp
└── updatedAt: timestamp
```

**Constraints:**
- `(userId, name)` must be unique per user (case-insensitive at application layer).
- `name` is required; `description` and `colorAccent` are optional.
- Archived boards are excluded from the default boards list but retain all card assignments.
- Deleting a board cascades deletion of `CardBoard` join rows only — cards themselves are unaffected.

**Lifecycle:** Created by user → optionally renamed → optionally archived → optionally deleted. Archived boards can be unarchived. Deletion is permanent and requires a confirmation step.

---

### Tag

A lightweight label, user-owned, applied to cards.

```
Tag
├── id: uuid (PK)
├── userId: uuid (FK → User)
├── name: string (max 40 chars, trimmed, lowercase-normalised)
├── createdAt: timestamp
└── updatedAt: timestamp
```

**Constraints:**
- `(userId, name)` must be unique (case-insensitive, stored lowercase).
- Tag names are normalised to lowercase on create/update at the application layer.
- Deleting a tag cascades deletion of `CardTag` join rows — cards themselves are unaffected.
- There is no global tag taxonomy; tags are fully user-scoped.

**Lifecycle:** Created when first applied to a card (inline creation) or via tag management. Renamed via tag management. Deleted via tag management (with warning of affected cards).

---

### CardBoard (join)

Many-to-many relationship between cards and boards.

```
CardBoard
├── cardId: uuid (FK → Card, ON DELETE CASCADE)
├── boardId: uuid (FK → Board, ON DELETE CASCADE)
└── assignedAt: timestamp
```

**Constraints:**
- PK: `(cardId, boardId)`.
- A card can be in zero or many boards.
- A board can contain zero or many cards.
- `assignedAt` records when the card was added to the board (for future sorting within board).

---

### CardTag (join)

Many-to-many relationship between cards and tags.

```
CardTag
├── cardId: uuid (FK → Card, ON DELETE CASCADE)
├── tagId: uuid (FK → Tag, ON DELETE CASCADE)
└── assignedAt: timestamp
```

**Constraints:**
- PK: `(cardId, tagId)`.
- `assignedAt` for potential future use (tag timeline).

---

### CardNote

A user-authored plain text note associated with a card.

```
CardNote
├── id: uuid (PK)
├── cardId: uuid (FK → Card, UNIQUE — one note per card in this iteration)
├── body: string (max 2000 chars)
├── createdAt: timestamp
└── updatedAt: timestamp
```

**Constraints:**
- One-to-one with Card in this iteration (unique constraint on `cardId`).
- Body may be empty string (note created but cleared) — nullable or empty string to be decided at implementation. Prefer nullable and treat null + empty string as "no note".
- Future: this model may be extended to support multiple blocks per card. The `CardNote` entity may be renamed `CardBlock` with a `type` discriminator column.

**Lifecycle:** Created on first save from the card detail. Updated on subsequent saves. Deleted when the user clears the note entirely (or when the card is deleted via cascade).

---

## Extended Entities

### Card (extensions)

The `Card` entity is extended with no new columns in this iteration. All new relationships are expressed via the join tables above. The Card remains the unit of truth for review state.

Future consideration: a `Card` may gain a `masteredAt` timestamp column to track when the card crossed the mastery threshold (high ease factor + long interval). Not in this iteration.

---

### ReviewLog (unchanged)

The `ReviewLog` entity is unchanged. It records the rating, quality score, and timestamp of each review event. Future analytics features (per-board progress, weekly review counts) will query this table.

---

## Relationship Diagram

```
User ─────────────────────── Board (many)
  │                            │
  │                         CardBoard (join)
  │                            │
  ├── Word (many, shared) ──── │
  │     └── Meaning (many)     │
  │           └── Card ────────┘
  │                 │
  │                 ├── CardNote (0..1)
  │                 ├── CardBoard (0..many)
  │                 ├── CardTag (0..many)
  │                 └── ReviewLog (0..many)
  │
  └── Tag (many)
        └── CardTag (join)
```

**Key observations:**
- `Card` is the central entity. All organisation (boards, tags) and all content (notes) and all review history (logs) radiate from it.
- `Word` and `Meaning` are shared dictionary cache entities — they are not user-owned. The user's ownership is expressed through `Card`.
- `Board` and `Tag` are user-owned organisational entities. They do not contain cards; they reference them.

---

## Constraints and Integrity Rules

| Rule | Enforcement |
|---|---|
| A card cannot be assigned to a board owned by a different user | Application layer check; backend guards on board ownership |
| A card cannot be assigned a tag owned by a different user | Application layer check; backend guards on tag ownership |
| Deleting a board does not delete cards | Cascade only on `CardBoard`, not on `Card` |
| Deleting a tag does not delete cards | Cascade only on `CardTag`, not on `Card` |
| Deleting a card cascades to its note, board assignments, and tag assignments | FK cascade on `CardNote`, `CardBoard`, `CardTag` |
| A user cannot have two boards with the same name (case-insensitive) | Unique constraint at DB level (using `lower(name)`) or application-layer normalisation |
| A user cannot have two tags with the same name | Tags normalised to lowercase; unique constraint on `(userId, name)` |
| Board `position` values are managed at application layer | No DB uniqueness constraint on position; gaps are allowed |

---

## Future Extensibility

### Smart Blocks (future)

The `CardNote` entity is designed as a stepping stone toward a `CardBlock` model that supports multiple block types per card. When this feature is introduced:

- `CardNote` is superseded by `CardBlock` with a `type` enum: `note | example | context | image`.
- A migration converts existing `CardNote` rows to `CardBlock` rows of type `note`.
- The `CardBlock` model adds `position` (ordering within a card) and `body` (always text in the initial block implementation).

### Board Hierarchy (rejected for now)

No hierarchical board support is planned. If user demand emerges, the cleanest path is a `parentBoardId` self-referential FK on `Board`. This is not modelled now to avoid complexity.

### Shared Boards (future)

Board sharing would require a `BoardMember` table and a concept of board ownership separate from user creation. The current model does not anticipate this — `userId` on `Board` is the sole owner. Adding sharing later would require a migration.

### Tag Taxonomy (future)

A global or team-shared tag vocabulary is not modelled. If introduced, a `TagNamespace` concept (user tags vs. shared tags) would be needed. Current tags are purely user-scoped.
