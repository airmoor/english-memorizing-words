## Context

Greenfield MVP. No existing codebase to migrate. The application needs a backend API, a PostgreSQL database, and a Next.js PWA frontend. The core technical challenge is the word lookup pipeline: we must serve data from the local DB when available and only call an external dictionary API on cache miss. Data is normalized into Word → Meaning → Card layers, which is non-obvious and must be preserved throughout.

The learning model is **definition-based (EN → EN)**: users learn words by reading their English definitions, not by translating to another language. Translation is out of scope for MVP.

## Goals / Non-Goals

**Goals:**
- Working end-to-end app: register → search words → save meanings → review with SRS
- Local caching of all dictionary API responses
- SM-2 spaced repetition scheduling
- Mobile-first PWA (offline shell, installable)
- Clean separation between Word, Meaning, and Card entities
- Definition-based learning (EN → EN)

**Non-Goals:**
- Translation of any kind (into any language) — out of scope for MVP
- Audio pronunciation
- Social/sharing features
- Native mobile apps (iOS/Android)
- Admin tooling / content management
- Multi-language UI

---

## Decisions

### 1. External Dictionary API: Free Dictionary API (dictionaryapi.dev)

**Choice:** Free Dictionary API (https://api.dictionaryapi.dev/api/v2/entries/en/:word) — free, no key required, permissive local caching.

**Rationale:** No API key friction, covers definitions, phonetics/transcription, part of speech, examples, and synonyms. Results can be stored locally without restriction. Merriam-Webster's free tier requires a key and has stricter caching terms.

**Known limitations:**
- No official SLA or uptime guarantee
- Response structure is deeply nested and inconsistent — words can have multiple `phonetics` arrays, meanings split across multiple objects with the same part of speech, and examples may be absent entirely
- Some valid English words return 404
- `synonyms` and `antonyms` appear at both the meaning level and the definition level; only definition-level synonyms are used

**Normalization contract:** The ingestion layer MUST map the raw API response to the internal schema before any DB write. Mapping rules:
- `phonetics[*].text` → `transcription`: iterate the `phonetics` array and use the first element where `.text` is a non-empty string; null if none qualify
- Each `meanings[i].definitions[j]` → one `meanings` row
- `meanings[i].partOfSpeech` → `part_of_speech`
- `meanings[i].definitions[j].definition` → `definition`
- `meanings[i].definitions[j].example` → `examples[0]` (wrap as single-element array; empty array if absent)
- `meanings[i].definitions[j].synonyms` → `synonyms` (empty array if absent)
- All missing optional fields default to `null` or `[]` — never omitted

**Fallback:** If a word is not found (API 404), return 404 to the client — no silent failure. If the API is unavailable, return 503.

---

### 2. Architecture: Monorepo with separate `frontend/` and `backend/` packages

```
LearnEnglishApp/
├── backend/          # NestJS REST API
│   ├── src/
│   │   ├── auth/
│   │   ├── words/
│   │   ├── vocabulary/
│   │   └── review/
│   └── ...
├── frontend/         # Next.js PWA
│   ├── app/
│   │   ├── (auth)/
│   │   ├── search/
│   │   ├── vocabulary/
│   │   └── review/
│   └── ...
└── openspec/
```

**Rationale:** Single repo, independent deployability, no shared runtime coupling. REST over GraphQL — simpler for MVP, easier to cache at HTTP layer later.

---

### 3. Database Schema

```
users
  id            UUID PK
  email         TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL
  created_at    TIMESTAMPTZ

words
  id            UUID PK
  text          TEXT UNIQUE NOT NULL   -- lowercase normalized
  fetched_at    TIMESTAMPTZ NOT NULL   -- timestamp of last successful API fetch

meanings
  id            UUID PK
  word_id       UUID FK → words.id ON DELETE CASCADE
  definition    TEXT NOT NULL
  transcription TEXT                   -- nullable
  part_of_speech TEXT
  synonyms      TEXT[]  NOT NULL DEFAULT '{}'
  examples      TEXT[]  NOT NULL DEFAULT '{}'
  -- composite index: (word_id, definition, part_of_speech) for deduplication on race

user_meanings  (junction: user's saved vocabulary)
  id            UUID PK
  user_id       UUID FK → users.id ON DELETE CASCADE
  meaning_id    UUID FK → meanings.id ON DELETE CASCADE
  saved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE(user_id, meaning_id)

cards
  id            UUID PK
  user_id       UUID FK → users.id ON DELETE CASCADE
  meaning_id    UUID FK → meanings.id ON DELETE CASCADE
  ease_factor   FLOAT   NOT NULL DEFAULT 2.5
  interval      INT     NOT NULL DEFAULT 0   -- days
  next_review   DATE    NOT NULL DEFAULT CURRENT_DATE
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE(user_id, meaning_id)
  -- index: (user_id, next_review) for efficient due-card queries

review_logs
  id            UUID PK
  card_id       UUID FK → cards.id ON DELETE CASCADE
  rating        TEXT NOT NULL CHECK (rating IN ('again','hard','good','easy'))
  reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**Key invariants:**
- `words` and `meanings` are global (shared across users, immutable after first fetch).
- Only `user_meanings`, `cards`, and `review_logs` are user-scoped.
- Saving a meaning creates a row in `user_meanings` AND a row in `cards` (see Decision 8).
- The `cards` table has no `direction` column — the only supported mode is EN → EN (word → definition). The column is omitted rather than defaulted to avoid future confusion.

---

### 4. Caching Policy

**Rule: words and meanings are immutable after first fetch.**

Once a word is fetched from the external API and written to the DB, it is never automatically re-fetched. `words.fetched_at` records when the data was originally retrieved.

**Rationale for immutability in MVP:**
- Dictionary definitions rarely change; staleness risk is low
- Re-fetching on every request would defeat the cache's purpose
- Handling partial updates (some meanings added, some removed) is complex and out of MVP scope

**Future invalidation path (not implemented in MVP):**
`fetched_at` is present so that a background job can later invalidate entries older than N days and re-fetch them. The column is required from day one to avoid a schema migration later.

**Cache lookup is always DB-first:**
```
GET /api/words/:text
  → SELECT from words WHERE text = normalized(:text)
  → if found: return meanings (no API call ever)
  → if not found: fetch API → write to DB → return meanings
```

Normalization: incoming search text is processed before DB lookup and before the API call — Unicode NFKC normalization, then lowercase, then trim leading/trailing whitespace, then collapse internal runs of whitespace to a single space.

---

### 5. SRS Algorithm: SM-2 (simplified)

Rating → quality score mapping:
- Again → 0
- Hard  → 2
- Good  → 4
- Easy  → 5

SM-2 update rules:
```
new_ease = max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

if q < 3 (Again or Hard):
  interval = 1      # reset to 1 day
else if interval == 0:
  interval = 1
else if interval == 1:
  interval = 6
else:
  interval = round(interval * ease)

next_review = today + interval (days)
```

This is battle-tested, simple to implement, and well understood. FSRS is more accurate but is overengineering for MVP.

---

### 6. SRS Card Model (EN → EN)

Cards use a single direction: **word → definition**.

Each card has exactly two states:

**State 1 — Hidden (front)**
```
┌─────────────────────────────┐
│                             │
│  word text                  │
│  /transcription/            │
│                             │
│       [ Show answer ]       │
└─────────────────────────────┘
```
Definition, part of speech, and examples are not rendered in the DOM while the card is in the hidden state — not merely visually hidden.

**State 2 — Revealed (back)**
```
┌─────────────────────────────┐
│                             │
│  word text                  │
│  /transcription/            │
│  ─────────────────────────  │
│  part of speech             │
│  definition                 │
│  "example sentence"         │
│                             │
│ [Again] [Hard] [Good] [Easy]│
└─────────────────────────────┘
```
The word and transcription remain visible after reveal for context. Rating buttons appear only in this state.

No target-language content appears anywhere in the card. The user's task is to recall or verify the meaning from the English definition alone.

---

### 7. Authentication: JWT (Access + Refresh tokens)

- **Access token**: 15-minute expiry, signed with HS256
- **Refresh token**: 7-day expiry, stored in httpOnly + SameSite=Strict cookie
- **NestJS guards** protect all authenticated routes
- Passwords hashed with bcrypt (cost factor 12)

---

### 8. Word Lookup Pipeline with Race Condition Handling

Concurrent requests for the same uncached word (e.g., two users searching simultaneously) MUST NOT produce duplicate rows in `words` or `meanings`.

**Strategy: DB-level conflict handling via `ON CONFLICT DO NOTHING`**

```
Client → GET /api/words/:text
              │
              ▼
    normalize text (lowercase + trim)
              │
              ▼
    SELECT id FROM words WHERE text = :text
              │
        ┌─────┴──────────┐
        │ found           │ not found
        ▼                 ▼
   SELECT meanings    fetch from dictionaryapi.dev
   WHERE word_id         │
   return them     ┌─────┴──────┐
                   │ 200 OK      │ 404 / error
                   ▼             ▼
         BEGIN TRANSACTION    return 404 / 503
         INSERT INTO words (text, fetched_at)
           ON CONFLICT (text) DO NOTHING
         SELECT id FROM words WHERE text = :text
         INSERT INTO meanings (...) VALUES (...)
           ON CONFLICT DO NOTHING        ← if race: skip silently
         COMMIT
         SELECT meanings WHERE word_id = :id
         return meanings
```

**Why this works:** `words.text` has a UNIQUE constraint. If two concurrent requests both reach the "not found" branch simultaneously, only one INSERT will succeed; the other will hit `ON CONFLICT DO NOTHING`. Both then re-SELECT the word id and proceed to read the already-inserted meanings. No duplicates, no errors, no distributed lock needed.

**Meanings deduplication:** Meanings don't have a natural unique key beyond their content. A composite index on `(word_id, definition, part_of_speech)` supports `ON CONFLICT DO NOTHING` for the race case. Theoretically identical `(word_id, definition, part_of_speech)` tuples with genuinely distinct meanings are possible but rare enough in practice to be acceptable — over-normalizing this case adds complexity that isn't justified at MVP scale.

---

### 9. Card Creation on Save (Eager)

**Decision: create the card immediately when a meaning is saved.**

When `POST /api/vocabulary/meanings/:meaningId` is called, both `user_meanings` and `cards` rows are created in a single transaction.

**Alternative considered — lazy creation:** Create the card only when the user starts a review session. This decouples saving from reviewing.

**Why eager wins for MVP:**
- Simpler user mental model: "save = it goes into your deck immediately"
- Avoids a migration step if the user has saved meanings but no session has been started
- The review endpoint only needs to query `cards` — no JOIN to `user_meanings` to find uncarded meanings
- The UNIQUE constraint on `cards(user_id, meaning_id)` makes it idempotent anyway

Cards are created with `interval = 0` and `next_review = CURRENT_DATE`, meaning they are due for review immediately.

---

### 10. Frontend: Next.js App Router + PWA

- `@ducanh2912/next-pwa` for service worker
- TailwindCSS for styling (mobile-first)
- Tanstack Query for server state / optimistic updates on save
- Zustand for minimal local UI state (current review card index)
- `next/font` for font optimization

**Search input behavior:**
- Input is debounced (300ms) before triggering a search — prevents a request on every keystroke
- Search is triggered on Enter OR after debounce settles (user stops typing)
- Tanstack Query deduplicates in-flight requests by query key `['word', text]` — if the same word is searched twice before the first response returns, only one HTTP request is made
- While a search is in-flight, the input is not disabled but a loading indicator is shown; submitting the same query again is a no-op (query is already cached or pending)

Pages:
```
/                → redirect to /search (or landing)
/(auth)/login    → login form
/(auth)/register → register form
/search          → word search + meanings display
/vocabulary      → saved meanings list
/review          → SRS review session
```

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Free Dictionary API returns inconsistent nested structure | Strict normalization layer maps raw response to internal schema before any DB write; missing fields default to null/[] |
| Free Dictionary API has no official SLA | Downtime only affects first lookup of uncached words; cached data is unaffected |
| Race condition: two concurrent requests for same uncached word | `INSERT ... ON CONFLICT DO NOTHING` on `words.text` (UNIQUE) and `(word_id, definition, part_of_speech)` composite index on `meanings` |
| SM-2 "Again" resets the interval, which can feel harsh | Acceptable for MVP; users can tune later |
| `user_meanings` + `cards` created atomically on save | Wrapped in a single DB transaction |
| PWA offline mode only covers shell — data requires network | Acceptable for MVP; cache reviewed cards in service worker later |
| JWT refresh token in httpOnly cookie | `SameSite=Strict` prevents CSRF for cross-origin requests |

## Migration Plan

Greenfield — no migration needed.

1. Provision PostgreSQL instance
2. Run migrations to create schema (all tables, constraints, indexes)
3. Deploy NestJS backend
4. Deploy Next.js frontend with PWA manifest

Rollback: tear down deployments; no data migration to reverse.

## Open Questions

- **Hosting**: Vercel (frontend) + Railway/Render (backend + DB) is the simplest path for MVP. Confirm before scaffolding CI.
- **Meanings uniqueness index**: Composite index on `(word_id, definition, part_of_speech)` is used for race-condition deduplication only, not as a hard uniqueness constraint. Rare false conflicts are accepted as a deliberate trade-off.
