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

### 1. External Dictionary API: Merriam-Webster Learner's (Primary) + Free Dictionary (Fallback)

**Choice:** Two-tier dictionary provider strategy with provider abstraction.

- **Primary**: Merriam-Webster Learner's Dictionary — `https://www.dictionaryapi.com/api/v3/references/learners/json/:word?key=:KEY`. Definitions are written for English-as-a-second-language learners (simpler vocabulary, more pedagogical examples). Returns IPA transcription, structured sense hierarchy, and inflection metadata.
- **Fallback**: Free Dictionary API — `https://api.dictionaryapi.dev/api/v2/entries/en/:word`. No key required.

**Rationale:** MW Learner's is purpose-built for ESL learners and is the better default for this app's audience. Free Dictionary is retained as a fallback because (a) MW requires an API key (`MERRIAM_API_KEY`) which may be missing in dev, (b) MW occasionally lacks coverage that Free Dictionary has (slang, proper nouns), (c) downtime resilience.

**Provider abstraction (mandatory file layout):**
```
src/words/providers/
├── provider.interface.ts
├── dictionary-provider.service.ts   # selects MW first, falls back to FD
├── merriam/
│   ├── merriam.dto.ts               # vendor types (isolated)
│   ├── merriam.normalizer.ts        # MW response → NormalizedWord
│   └── merriam.provider.ts
└── free-dictionary/
    ├── free-dictionary.dto.ts
    ├── free-dictionary.normalizer.ts
    └── free-dictionary.provider.ts
```

**Hard rule:** Vendor-specific DTOs MUST NOT leave the corresponding provider directory. The only word representation visible to `WordsService`, the database, and the rest of the application is `NormalizedWord`.

**Internal normalized schema (provider-independent):**
```typescript
interface NormalizedWord {
  text: string                          // matches lowercased search text
  transcription: string | null          // IPA from MW or phonetic from FD
  provider: 'merriam-webster' | 'free-dictionary'
  meanings: NormalizedMeaning[]
}

interface NormalizedMeaning {
  definition: string
  partOfSpeech: string | null
  synonyms: string[]                    // FD only; empty for MW
  examples: string[]
}
```

**Merriam-Webster normalization rules:**
- Consume only `entries[0]` — MW returns multiple top-level entries (the lookup word plus related compound headwords like "Internet service provider"); only the first canonical entry is consumed
- `entries[0].hwi.prs[0].ipa` → `transcription` (null if absent)
- For every sense in `entries[0].def[].sseq[][]`, walk `["sense" | "bs" | "pseq", content]` items; emit one `NormalizedMeaning` per leaf sense
- Definition text comes from `dt` items where the first element is `"text"`, with all `{...}` MW markup tokens stripped (`{bc}`, `{it}…{/it}`, `{sx|word||}`, etc.)
- Examples come from `dt` items where the first element is `"vis"` (the `t` field of each entry)
- Synonyms array is always empty (MW Learner's does not expose a synonyms field)
- Nested sub-senses (1a, 1b) are flattened into separate rows — visual sense hierarchy is out of scope for MVP

**Free Dictionary normalization rules:** preserved verbatim from prior design — `phonetics[*].text` → `transcription`; each `meanings[i].definitions[j]` → one row; `definitions[j].synonyms` → `synonyms`; `definitions[j].example` wrapped as 1-element `examples[]` array.

**Fallback triggers** (in `DictionaryProviderService`):
1. `MERRIAM_API_KEY` env var is missing → MW marked unavailable, FD used
2. MW returns a non-2xx status
3. MW returns an empty array OR an array of strings (MW's "did you mean…" suggestion shape)
4. MW request throws (timeout, network)

In all cases the failure is logged. Final 404 is returned only when **both** providers report not-found. 503 is returned only when both are unavailable.

**Sense numbering (added in 1746500000001-AddSenseNumber):**
- `meanings.sense_number TEXT NULL` — preserves the MW dictionary-style sense label, e.g. `"1"`, `"1a"`, `"1b"`, `"2"`. Free Dictionary leaves this null.
- Required to render a single canonical word entry with grouped meanings (matching Merriam-Webster's UX). The frontend uses these labels to indent subsenses (entries containing letters) under their parent number.
- Sub-senses within a `sdsense` (e.g., "especially: …") inherit the parent sense's number.

**Fields explicitly NOT added (out of MVP scope):**
- `audio_url` — audio pronunciation is a non-goal
- `sense_label` — `sdsense` text (e.g., "especially") is currently inlined into the `definition` text rather than stored separately

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
  transcription TEXT                   -- nullable; IPA (MW) or phonetic text (FD)
  provider      TEXT NOT NULL          -- 'merriam-webster' | 'free-dictionary'
  fetched_at    TIMESTAMPTZ NOT NULL   -- timestamp of last successful API fetch

meanings
  id             UUID PK
  word_id        UUID FK → words.id ON DELETE CASCADE
  definition     TEXT NOT NULL
  part_of_speech TEXT
  synonyms       TEXT[]  NOT NULL DEFAULT '{}'
  examples       TEXT[]  NOT NULL DEFAULT '{}'
  sense_number   TEXT                   -- "1", "1a", "1b", "2" (MW); NULL for FD
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
- Pronunciation lives on `words`, not `meanings` — both providers return one transcription per word lookup, not per sense.
- `words.provider` records which API sourced the cached entry. It is informational (not used to invalidate cache) but useful for future re-fetch / migration tooling.
- Only `user_meanings`, `cards`, and `review_logs` are user-scoped.
- Saving a meaning creates a row in `user_meanings` AND a row in `cards` (see Decision 8).
- The `cards` table has no `direction` column — the only supported mode is EN → EN (word → definition). The column is omitted rather than defaulted to avoid future confusion.

**Schema changes from prior (Free-Dictionary-only) design:** see migration `1746500000000-AddDictionaryProvider`. Adds `words.transcription`, `words.provider`; drops `meanings.transcription`. The migration TRUNCATEs `words` (cascades to dependents) — this is deliberate because pre-migration cache rows came from Free Dictionary only and the new architecture requires consistent provider attribution. User accounts are preserved.

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

### 8. Word Lookup Pipeline with Provider Selection and Race Condition Handling

Concurrent requests for the same uncached word (e.g., two users searching simultaneously) MUST NOT produce duplicate rows in `words` or `meanings`.

**Strategy:** DB-level conflict handling via `ON CONFLICT DO NOTHING`, plus provider fallback at the API layer.

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
   return cached     DictionaryProviderService.fetchWord(:text)
                          │
                ┌─────────┴──────────┐
                │ MW available?       │
                ▼                     │
              YES                     │
                │                     │
        try Merriam-Webster           │
                │                     │
        ┌───────┴───────┐             │
        │ ok            │ not-found / err
        ▼               └─────────────┤
   normalize → return                 │
                                      ▼
                              try Free Dictionary
                                      │
                              ┌───────┴────────┐
                              │ ok             │ not-found / err
                              ▼                ▼
                        normalize → return   throw 404 / 503
                              │
                              ▼
              BEGIN TRANSACTION
              INSERT INTO words (text, transcription, provider, fetched_at)
                ON CONFLICT (text) DO NOTHING
              SELECT id FROM words WHERE text = :text
              INSERT INTO meanings (...)
                ON CONFLICT DO NOTHING       ← if race: skip silently
              COMMIT
              return WordResponseDto
```

**Why this works:** `words.text` has a UNIQUE constraint. If two concurrent requests both reach the "not found" branch simultaneously, only one INSERT will succeed; the other will hit `ON CONFLICT DO NOTHING`. Both then re-SELECT the word id and proceed to read the already-inserted meanings. No duplicates, no errors, no distributed lock needed.

**Provider fallback semantics:**
- "MW available" is checked synchronously via `MerriamProvider.isAvailable()` — currently equivalent to `process.env.MERRIAM_API_KEY` being set
- Both providers return `null` for "not found" and throw for "unavailable"; `DictionaryProviderService` translates the cascade into a single 404 (both not-found) or 503 (both unavailable)

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
