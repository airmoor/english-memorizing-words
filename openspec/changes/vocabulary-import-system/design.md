## Context

Lexis currently adds vocabulary one word at a time via the search/save flow. The data model is layered: `Word → Meaning → Card`, where a `Card` is a user's saved instance of a specific meaning. Words and their meanings are fetched from external dictionary APIs and cached locally. Every `Card` in the system today has at least one `Meaning` — this invariant must be preserved.

The import system must integrate with this model without introducing a new partially-complete card state. The rest of the application — the vocabulary list, review queue, card detail, meaning picker, filter logic, and SRS scheduler — must all remain unaware that an import ever occurred. The only difference from the app's perspective is that multiple cards arrive at once rather than one at a time.

The frontend follows a feature-sliced design: `entities/` for domain types, `features/` for self-contained UI+logic slices, `shared/` for cross-cutting utilities. React Query handles all server state.

---

## Goals / Non-Goals

**Goals:**
- Import plain-text word lists (one word per line) from paste or `.txt` file
- Import structured CSV lists with optional `tags`, `board`, `notes` columns
- Import Anki CSV exports with column-mapping UI
- Preview parsed rows before committing — **instant**, client-side only, no API calls during preview
- Never silently fail a row — every error surfaces with a specific reason
- Deduplicate within the import batch and against the user's existing vocabulary
- Assign an optional board and tags to all imported words in one step
- Create cards **only** after meanings are resolved — no null-meaning card state anywhere in the app
- Return a structured `ImportStatus` + result: imported / skipped / error counts + broken rows
- Parser abstraction layer — unified `ImportParser` interface for extensibility
- Architecture that does not block future teacher/classroom, analytics, or async job modes

**Non-Goals:**
- Parsing binary Anki `.apkg` files (uses SQLite — too heavy for MVP)
- Importing pre-supplied definitions, translations, or audio
- Real-time collaborative imports
- Import history / audit log (result shown once, not persisted in MVP)
- `merge` duplicate mode (too complex for MVP — deferred to future iteration)
- Inline row repair / "Fix & Retry" UI (architecture must not block it, but not built now)
- Progress streaming for large imports (synchronous execute with loading state is sufficient for MVP)

---

## Decisions

### 1. Client-side parsing, server-side execution

**Choice:** Parse and validate files entirely in the browser (TXT: trivially; CSV: Papa Parse); send only the structured word list to the server as a JSON array.

**Rationale:** Client-side preview is instant — zero network round-trips before the user sees results. Avoids uploading raw files to the backend (no multipart, no file storage, no auth complexity on file upload). The server receives a clean, validated JSON payload and applies all business logic.

**Alternative considered:** Upload raw file to S3/temp storage, parse server-side. Rejected: adds infrastructure complexity for no user-facing benefit at this scale.

**CSV parsing library:** Papa Parse (`papaparse`) — handles encoding, quoted fields, CRLF/LF variation, BOM, and streaming. Dynamic import (`import('papaparse')`) ensures zero impact on initial page load.

---

### 2. Preview is strictly client-side — no enrichment, no blocking API calls

**Choice:** The preview step performs only local parsing + lightweight client-side validation. The server-side preview endpoint (`POST /import/preview`) is called solely to check vocabulary duplicates. No dictionary lookups, no enrichment, no card creation occur at preview time.

**Rationale:** Preview must feel instant. Any network latency during preview breaks the "fast and forgiving" UX contract. The enrichment step happens only when the user explicitly confirms "Import [N] words".

**Correct data flow:**
```
upload file/paste text
  → client parses instantly (< 50ms for 500 rows)
  → preview shown immediately
  → server-side preview called (duplicate check only)
  → user reviews, adjusts settings
  → user confirms import
  → server execute: enrich + create cards
  → result summary shown
```

**Incorrect flow (explicitly avoided):**
```
upload file
  → server fetches dictionary meanings ← NEVER during preview
  → preview blocked on API latency
```

---

### 3. Import processing layer: enrich-first, then create cards

**Choice:** The execute endpoint resolves meanings for every word (cache-first, then dictionary API) within the request. Cards are created only after a meaning is found. Words that cannot be enriched within the enrichment budget are returned as errors and not added to the vocabulary.

**Rationale:** Creating cards with `null` meanings would infect the entire codebase:
- vocabulary list needs `if (!card.meanings)` guards
- card detail needs a "loading" empty state
- review queue must filter out un-enriched cards
- SRS scheduler must handle the un-scheduled state
- meaning picker flow is undefined for meaningless cards
- filters, review state badges, and progress stats all break

Keeping the invariant "every Card has at least one Meaning" is worth the cost of a longer execute request for uncached words.

**Enrichment resolution order:**
1. Word exists in `words` table with meanings → use immediately (no API call, ~1ms)
2. Word unknown → call dictionary provider (Merriam-Webster, Free Dictionary fallback, ~200–800ms)
3. Dictionary returns no result → row becomes an `error` in the result; no card created

**MVP timeout policy:** Each word lookup is bounded by the existing `WordsService` timeout (~3s per word). The execute endpoint processes words in parallel batches of 5 to prevent dictionary API rate-limiting. A 50-word import with 40 cache hits and 10 API calls takes approximately 1–3 seconds.

**Future path:** When import volume grows, replace the synchronous within-request enrichment with a persistent `ImportJob` model (see Open Questions). The `ImportStatus` enum is designed now to accommodate this transition without breaking the API contract.

---

### 4. ImportStatus lifecycle model

**Choice:** Introduce an explicit `ImportStatus` type covering the full processing lifecycle.

```typescript
type ImportStatus =
  | 'queued'           // job received, enrichment not yet started (reserved for future async mode)
  | 'processing'       // enrichment in progress (reserved for future async mode)
  | 'completed'        // all submitted words imported successfully
  | 'partial_failure'  // some words imported, some failed enrichment or validation
  | 'failed'           // nothing was imported (all duplicates, network error, validation failure)
```

**In MVP** (synchronous execute), the response always returns `completed`, `partial_failure`, or `failed`. The `queued` and `processing` states are reserved API surface for a future async job polling model — they are typed now so the frontend and backend contract does not need to change when async mode is introduced.

**`ImportExecuteResult` shape:**
```typescript
interface ImportExecuteResult {
  status: ImportStatus
  imported: number
  skipped: number        // duplicate words not imported (based on duplicate mode)
  errors: number
  errorRows: ImportErrorRow[]  // { word: string, reason: string }
}
```

**Where `ImportStatus` appears:**
- Backend response DTO
- Frontend `entities/import-session/model/types.ts`
- `useImportFlow` step machine (the `complete` step receives and stores the result)
- `ImportResult.tsx` (visual treatment differs per status: success green, partial amber, failure red)

---

### 5. Simplified duplicate handling for MVP: skip / import-anyway

**Choice:** Support exactly two duplicate modes for MVP.

- `skip` (default) — if the word already exists in the user's vocabulary, do not import it. Count in `skipped`. Shown in the result summary.
- `import-anyway` — import the word regardless of whether it already exists. A second card for the same word is created and will appear in the vocabulary list.

**Rationale for removing `merge`:** Merge requires resolving conflicts across notes, boards, tags, and meanings that may have diverged since the word was first saved. The conflict resolution rules are non-obvious (which note wins? do tags union or replace?), the edge cases multiply fast, and the UX for explaining what was merged is hard to get right. For MVP, the vast majority of users want either "add new words only" (skip) or "add everything" (import-anyway). Merge can be added later when real user behaviour justifies it.

**`ImportSettingsDto`:**
```typescript
interface ImportSettingsDto {
  boardId?: string          // optional board to assign all imported words to
  tagIds?: string[]         // optional tags to assign to all imported words
  duplicateMode: 'skip' | 'import-anyway'
}
```

---

### 6. Parser abstraction layer

**Choice:** All parsers share a unified `ImportParser` interface. The parser for each format is registered in a parser registry. The uploader selects the correct parser based on file type and content detection.

**Interface:**
```typescript
// shared/lib/import/parsers/types.ts

interface ImportParser {
  /** Returns true if this parser can handle the given input. */
  canParse(input: ParserInput): boolean
  /** Parses input into a ParseResult. Never throws — returns errors in ParseResult. */
  parse(input: ParserInput): ParseResult
}

interface ParserInput {
  text: string              // raw file or paste contents
  filename?: string         // original filename (used for extension hint)
  columnMap?: ColumnMap     // provided after Anki column-mapping step
}

interface ParseResult {
  rows: ParsedRow[]
  format: 'txt' | 'csv' | 'anki'
  requiresColumnMapping?: boolean      // true when Anki column-mapping step is needed
  columnSuggestions?: ColumnSuggestion[] // heuristic suggestions for the mapping UI
}
```

**File layout:**
```
shared/lib/import/
  parsers/
    types.ts          # ImportParser interface, ParseResult, ParsedRow, ColumnMap
    txtParser.ts      # one word per line
    csvParser.ts      # Papa Parse wrapper, column detection, metadata columns
    ankiParser.ts     # tab-separated detection, routes to column-mapping step
    parserRegistry.ts # selectParser(input): ImportParser
  normalizeWord.ts    # trim + lowercase (used by all parsers)
```

**Benefits:** Adding a new format (e.g., Google Sheets paste, Quizlet export) requires only a new `XxxParser` implementing `ImportParser` and registration in `parserRegistry`. No changes to the uploader, preview, or execute flow.

---

### 7. Import UI flow states

**Choice:** Import flow is a step machine with 7 states. Managed by `useImportFlow`.

```
upload
  → [file/paste received] → parsing (instant)
  → [multi-column CSV detected] → anki-map
  → [parsed] → preview (+ async duplicate check)
  → [user confirms] → importing (execute in-flight, loading indicator)
  → [success/partial] → complete (result summary, non-dismissible)
  → [network error] → error (retry button)
```

`anki-map` is a branch off `parsing` that only appears for Anki-style files. All other formats jump directly from `parsing` to `preview`.

---

### 8. AdaptiveSheet container

**Choice:** Reuse the existing `AdaptiveSheet` pattern — wraps `BottomSheet` on mobile and a centred modal on desktop.

**Rationale:** Consistent with all other secondary flows in Lexis (CreateBoardSheet, ManageBoardsSheet). The vocabulary page remains the primary canvas; import is a transient, focused task.

**Sheet dismissal rules:**
- All steps except `complete`: backdrop tap and Escape close the sheet (discard in-progress import)
- `complete` step: backdrop tap and Escape are disabled — user must explicitly choose "View vocabulary" or "Import more"

---

### 9. Module and file structure

```
# Backend
src/
  import/
    import.module.ts
    import.controller.ts
    import.service.ts
    dto/
      import-request.dto.ts      # { words: ImportRowDto[], settings: ImportSettingsDto }
      import-row.dto.ts          # { word, tags?, board?, notes? }
      import-settings.dto.ts     # { boardId?, tagIds?, duplicateMode }
      import-preview-result.dto.ts
      import-execute-result.dto.ts  # { status: ImportStatus, imported, skipped, errors, errorRows }

# Frontend
frontend/src/
  entities/
    import-session/
      model/
        types.ts                 # ImportStatus, ImportRow, ParsedRow, ImportPreviewResult,
                                 # ImportExecuteResult, ImportSettings, ImportRowStatus
  features/
    import-vocabulary/
      api/
        importApi.ts             # postImportPreview(), postImportExecute()
      model/
        useImportPreviewMutation.ts
        useImportExecuteMutation.ts
        useImportFlow.ts         # step state machine (upload|parsing|anki-map|preview|importing|complete|error)
      ui/
        ImportSheet.tsx          # outer AdaptiveSheet, owns step state
        ImportUploader.tsx       # drag-drop / file picker / paste
        AnkiColumnMapper.tsx     # column selection step
        ImportPreview.tsx        # parsed row table + filter tabs
        ImportSettings.tsx       # board / tag / duplicate mode controls
        ImportResult.tsx         # post-import summary with ImportStatus-aware styling
        [*.module.css]
  shared/
    lib/
      import/
        parsers/
          types.ts               # ImportParser interface, ParseResult, ParsedRow, ColumnMap
          txtParser.ts
          csvParser.ts
          ankiParser.ts
          parserRegistry.ts      # selectParser(input): ImportParser
        normalizeWord.ts         # trim + lowercase
```

---

### 10. Analytics event hooks (future-ready architecture)

**Choice:** Define named import lifecycle events now. No analytics SDK is wired in MVP — but the call sites are documented so instrumentation can be added without touching import logic.

**Event taxonomy:**
```
import_opened              # user opens the import sheet
import_file_dropped        # file dragged and dropped
import_paste_detected      # user pastes text into the textarea
import_parsed              # parsing completes (format, row count, error count)
import_previewed           # preview step shown (includes duplicate count)
import_settings_changed    # board/tag/duplicate mode changed
import_confirmed           # user clicks "Import N words"
import_completed           # execute returns completed/partial_failure
import_failed              # execute returns failed or network error
import_result_dismissed    # user closes result (via View vocabulary or Import more)
```

**Where events fire (future instrumentation sites):**
- `ImportSheet.tsx` — `import_opened`, `import_result_dismissed`
- `ImportUploader.tsx` — `import_file_dropped`, `import_paste_detected`
- `useImportFlow.ts` — `import_parsed`, `import_previewed`
- `ImportSettings.tsx` — `import_settings_changed`
- `useImportExecuteMutation.ts` — `import_confirmed`, `import_completed`, `import_failed`

**Recommended future implementation:** A thin `trackImportEvent(event, props?)` wrapper around whatever analytics SDK is adopted (Amplitude, PostHog, etc.). The wrapper is a no-op until the SDK is wired. This prevents analytics from blocking import feature delivery.

---

## Risks / Trade-offs

**[Sync enrichment latency] Execute request blocks while fetching unknown words from the dictionary API**
→ Mitigation: Process words in parallel batches of 5. Most imports will be dominated by cache hits (~1ms per word). Document the UX expectation: "Processing your words…" loading state for up to 15 seconds. For MVP this is acceptable. Threshold for async job migration: >50% of imported words are cache misses in production load.

**[Preview-to-execute gap] User submits preview, then server-side state changes (another device adds a word) before execute**
→ Mitigation: The execute endpoint re-validates duplicates. The result may differ from preview (more `skipped` than expected). This is expected behaviour and shown in the result summary. No data integrity issue.

**[Large imports / CSV] Browser may struggle with files exceeding 10,000 rows**
→ Mitigation: Cap import at 500 rows per batch with a clear user-facing error. Papa Parse streaming is available for future scale-up without changing the API contract.

**[Papa Parse bundle size] ~55KB minified gzip**
→ Mitigation: Dynamic import (`import('papaparse')`) loaded only when the import sheet opens. Zero impact on initial page load.

**[Encoding] UTF-8 assumed; Windows-1252 CSV files from Excel may produce garbled characters**
→ Mitigation: Papa Parse auto-detects BOM and handles UTF-8-BOM. Warn user if non-UTF-8 characters detected. Documented limitation in the import UI.

**[Words not in dictionary] Misspelled words, proper nouns, rare slang fail enrichment**
→ Mitigation: Returned as errors in the result summary with reason "Word not found in dictionary". User can manually search the word to add it one at a time. Import of other words in the batch is unaffected.

**[Anki mapping UX] Column mapping adds a step that casual users may find confusing**
→ Mitigation: Only triggered for multi-column files with no recognised Lexis header. Standard TXT and well-formed CSVs skip the mapping step entirely.

**[Future fix & retry] Architecture must not block inline row repair**
→ Mitigation: `ParsedRow` carries a stable `lineNumber` and `rawText` field from parsing time. The `ImportPreview` row component receives the full `ParsedRow`. Adding an "Edit" inline input to repair a malformed word before import requires only a `onRowEdit(lineNumber, newValue)` prop — no structural changes to the preview data model.

---

## Migration Plan

No database migrations required. All changes are purely additive:
- New `ImportModule` registered in `AppModule`
- New frontend feature tree-shaken when not imported
- Import entry point added to vocabulary page header and settings page
- No existing endpoints, entities, or frontend routes changed

Rollback: remove the import entry point UI; the endpoints remain dormant but harmless.

---

## Future Roadmap

**Async import jobs (post-MVP):** When enrichment latency becomes unacceptable for large imports, introduce a persistent `ImportJob` table (`id`, `userId`, `status: ImportStatus`, `createdAt`, `resultJson`). The execute endpoint creates a job and returns immediately with `status: 'queued'`. The frontend polls `GET /import/jobs/:id` until status is `completed` or `failed`. The `ImportStatus` enum is already designed for this — `queued` and `processing` are reserved for this migration.

**BullMQ enrichment queue (post-MVP):** Replace fire-and-forget enrichment with a proper job queue backed by Redis. Gives retry semantics, rate-limit compliance, and dead-letter handling for permanently failed lookups.

**Fix & Retry UX (post-MVP):** After import, the result screen shows failed rows with an inline "Edit" control. The user can correct a misspelled word and re-submit just that row. Architecture is ready: `ParsedRow` carries `lineNumber` and `rawText`; `ImportPreview` passes full rows to the result; the execute endpoint accepts a single-row payload.

**`merge` duplicate mode (post-MVP):** Add a third duplicate mode that applies new board/tag/notes to an existing card. Implement only after real user behaviour data shows it's needed — the DTO already has `duplicateMode` as a discriminated union, so adding `'merge'` extends rather than breaks the contract.

**Teacher mode (future):** Teachers distribute word lists to students as shareable import links. Each link encodes a word list + board assignment. Student opens the link, sees a pre-filled import preview, and confirms. Architecture is compatible: import payload is already a plain JSON structure that can be URL-encoded or stored as a shareable resource. No architectural changes needed to the import execution path.

**`.apkg` support (future):** Requires SQLite parsing either in a Web Worker (browser) or as a server-side pre-processing step. The `ankiParser.ts` file is the correct home for this capability — the `ImportParser` interface is already designed to accommodate it.

---

## Open Questions

1. **Sync enrichment timeout:** What is the acceptable maximum wait time for the execute request? Proposed: 15 seconds hard timeout. Words not enriched within timeout returned as errors. Validate against real dictionary API latency in staging.

2. **Import row cap:** 500 rows proposed. Teacher use case (200-word lesson list) is well within cap. Is 500 high enough for migration use cases (e.g., importing from Duolingo, which can have 500–2000 words)?

3. **Vocabulary import feature flag:** `VITE_IMPORT_ENABLED` proposed. Should this be on by default in production from day one, or rolled out gradually? Recommend gradual: enable for internal testing, then open to all users after beta validation.

4. **Enrichment failure UX:** When a word fails enrichment (not in dictionary), the result shows it as an error. Should the user be offered a "Search manually" shortcut from the error row that opens the word search? Low-effort, high-value addition — consider for Phase 4 polish.

5. **Import accessibility in navigation:** Should import be a top-level nav item, or only reachable from the vocabulary page and settings? Current proposal: vocabulary page header + settings page link. Revisit after observing discovery patterns in beta.
