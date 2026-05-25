# Implementation Tasks: vocabulary-import-system

**Status:** In progress (60/63 tasks complete — 3 manual E2E tasks remain)  
**Last updated:** 2026-05-25

---

## Overview

Implementation is structured in five phases as vertical shipping slices. Phase 1 is backend-only and can be deployed independently. Phase 2 is the simplest complete import path (TXT) — upload, preview, execute, result — end-to-end and shippable. Phases 3–5 layer additional format support and UX polish on top of the working foundation.

This ordering means every phase produces something testable and deployable, with clear rollback boundaries.

**Key architecture decisions carried into all tasks:**
- Cards are created **only after meanings are resolved** — no null-meaning cards ever
- Preview is **instant and client-side only** — no dictionary calls during preview
- Duplicate modes are **skip** and **import-anyway** only — no merge in MVP
- All parsers implement the **`ImportParser` interface** from `parserRegistry`
- `ImportStatus` (`completed` / `partial_failure` / `failed`) is included in every execute response

---

## Phase 1: Backend Import Core

**Goal:** `POST /import/preview` and `POST /import/execute` endpoints fully working. Synchronous enrichment (no null cards), `ImportStatus` in responses, board/tag auto-creation, auth guard.

**Dependencies:** None. Reuses existing `WordsService`, `VocabularyService`, `BoardsService`, `TagsService`.

- [x] 1.1 Create `src/import/import.module.ts`, `import.controller.ts`, `import.service.ts`; register `ImportModule` in `AppModule`
- [x] 1.2 Define `ImportRowDto` (`word: string`, `tags?: string[]`, `board?: string`, `notes?: string`) with class-validator decorators
- [x] 1.3 Define `ImportSettingsDto` (`boardId?: string`, `tagIds?: string[]`, `duplicateMode: 'skip' | 'import-anyway'`)
- [x] 1.4 Define `ImportRequestDto` (`words: ImportRowDto[]`, `settings: ImportSettingsDto`); enforce `@ArrayMaxSize(500)` on `words`
- [x] 1.5 Define `ImportPreviewResultDto` — array of `{ word, status: 'valid' | 'duplicate_vocabulary' | 'error', reason? }`
- [x] 1.6 Define `ImportExecuteResultDto` — `{ status: ImportStatus, imported, skipped, errors, errorRows: { word, reason }[] }`; define `ImportStatus` as a TypeScript union type exported from `dto/import-status.ts`
- [x] 1.7 Implement `POST /import/preview` — normalise words, within-batch dedup (first occurrence wins), check against user's existing cards; return per-row status; no writes, no dictionary calls; `400` if batch >500 rows
- [x] 1.8 Implement word normalisation in `ImportService`: `trim().toLowerCase()`; within-batch dedup marks subsequent occurrences as `duplicate_within_batch` with `reason: "Already in this list (line N)"`
- [x] 1.9 Implement `POST /import/execute` — for each valid word: check cache first, call `WordsService.resolveOrFetch()` if not cached; create card with meanings only after resolution; batch parallel API calls (max 5 concurrent); words that fail resolution after all provider fallbacks → added to `errorRows`
- [x] 1.10 Implement `skip` duplicate mode: if word already in user's vocabulary, increment `skipped`, do not create card
- [x] 1.11 Implement `import-anyway` duplicate mode: create card regardless of whether word already exists
- [x] 1.12 Implement board auto-creation: if `settings.boardId` provided use it; if row has `board` name and no matching board exists for user, create it; deduplicate board names within the import batch
- [x] 1.13 Implement tag auto-creation: normalise to lowercase, `findOrCreate` per tag; apply both `settings.tagIds` (global) and row-level tags; deduplicate tag names within batch
- [x] 1.14 Truncate `notes` to 1000 characters server-side; include `reason: "Note truncated to 1000 characters"` warning in preview row
- [x] 1.15 Set `ImportStatus` in execute response: `completed` if `errors === 0`; `partial_failure` if `imported > 0 && errors > 0`; `failed` if `imported === 0`
- [x] 1.16 Apply `@UseGuards(JwtAuthGuard)` on both endpoints; all entities scoped to `req.user.id`
- [x] 1.17 Unit tests: `ImportService` — normalisation, within-batch dedup, `skip`/`import-anyway` modes, board/tag auto-creation, batch size enforcement, ImportStatus derivation
- [x] 1.18 Unit tests: `ImportController` — auth guard, DTO validation, `400` on oversized batch, `401` without token

---

## Phase 2: TXT Import — Complete Vertical Slice

**Goal:** End-to-end TXT import shippable. User can paste or upload a `.txt` file, see an instant preview, confirm import, and see the result summary. All five import flow steps working.

**Dependencies:** Phase 1 (backend endpoints stable).

- [x] 2.1 Create `entities/import-session/model/types.ts` — `ImportStatus`, `ImportRowStatus`, `ParsedRow` (client-side: `{ word, lineNumber, rawText, status, reason? }`), `ImportSettings`, `ImportPreviewResult`, `ImportExecuteResult`
- [x] 2.2 Create `shared/lib/import/normalizeWord.ts` — `normalizeWord(raw: string): string` (trim + lowercase)
- [x] 2.3 Create `shared/lib/import/parsers/types.ts` — `ImportParser` interface, `ParserInput`, `ParseResult`, `ColumnMap`, `ColumnSuggestion`
- [x] 2.4 Create `shared/lib/import/parsers/txtParser.ts` — implements `ImportParser`; `canParse` returns `true` for plain text or `.txt` filename; `parse` splits on newlines, calls `normalizeWord`, filters empties, marks within-batch duplicates; includes `lineNumber` and `rawText` on every `ParsedRow`
- [x] 2.5 Create `shared/lib/import/parsers/parserRegistry.ts` — `selectParser(input: ParserInput): ImportParser`; for Phase 2 only `txtParser` is registered
- [x] 2.6 Create `features/import-vocabulary/api/importApi.ts` — `postImportPreview(payload): Promise<ImportPreviewResult>` and `postImportExecute(payload): Promise<ImportExecuteResult>` using `apiClient`
- [x] 2.7 Create `useImportPreviewMutation.ts` — `useMutation` wrapping `postImportPreview`
- [x] 2.8 Create `useImportExecuteMutation.ts` — `useMutation` wrapping `postImportExecute`; on success invalidate `['vocabulary']` and `['boards']` React Query cache keys
- [x] 2.9 Create `useImportFlow.ts` — step enum `'upload' | 'parsing' | 'anki-map' | 'preview' | 'importing' | 'complete' | 'error'`; exposes `step`, `goTo`, `reset`, `parsedRows`, `setParsedRows`, `serverPreviewRows`, `setServerPreviewRows`, `result`, `setResult`, `error`, `setError`
- [x] 2.10 Create `ImportSheet.tsx` — `AdaptiveSheet` container; renders the correct sub-component per step; `onClose` prop; backdrop dismissal disabled only on `complete` step
- [x] 2.11 Create `ImportUploader.tsx` — paste textarea (debounce 200ms, call `txtParser` on input); "Or upload a file" file picker button (`accept=".txt,.csv"`); `FileReader.readAsText()` with UTF-8-BOM stripping; file type validation (`.txt`, `.csv` only); inline errors (never `alert()`); drag-and-drop with visual highlight state; emits `onParsed(rows: ParsedRow[])` and `onError(message: string)`
- [x] 2.12 Create `ImportPreview.tsx` — scrollable row table (word column, status badge column); summary header "N words ready · D duplicates · E errors"; call `useImportPreviewMutation` on mount to check vocabulary duplicates; merge server `duplicate_vocabulary` status into client rows; loading skeleton while server preview in-flight; "Import [N] words" button disabled when 0 valid rows
- [x] 2.13 Create `ImportSettings.tsx` — board picker (inline dropdown using existing boards data), global tag chips (reuse existing tag input), duplicate mode selector (`skip` / `import-anyway` radio group); collapsible section below preview summary; changing any setting re-fires server preview mutation (debounced 300ms)
- [x] 2.14 Create `ImportResult.tsx` — `ImportStatus`-aware styling (green for `completed`, amber for `partial_failure`, red for `failed`); summary counts "Imported N · Skipped D · Failed E"; expandable "View [E] failed words" section with word + reason per error row; "View vocabulary" button (navigate + close sheet); "Import more" button (reset flow to upload step)
- [x] 2.15 Create `CSS modules` for all import components — upload area dashed border + drag-over accent state; preview row table; status badge palette (using `--color-success`, `--color-warning`, `--color-danger`); result summary cards
- [x] 2.16 Add `featureFlags.vocabularyImport` (`VITE_IMPORT_ENABLED`, default `true` in dev); add "Import" entry point button to vocabulary page header alongside the Review button; gate behind flag
- [x] 2.17 Unit tests: `txtParser` — empty input, whitespace-only lines, normalisation, within-batch dedup, `lineNumber` and `rawText` fields populated correctly
- [ ] 2.18 Manual end-to-end: paste words → instant preview → server duplicate check → import → result summary with `ImportStatus` → vocabulary list updated with new cards (all have meanings)

---

## Phase 3: CSV Support

**Goal:** CSV files with optional `tags`, `board`, `notes` columns working end-to-end. Metadata visible in preview. Board/tag "Will create:" indicators. Single-column fallback.

**Dependencies:** Phase 2 (full import flow working for TXT).

- [x] 3.1 Add `papaparse` and `@types/papaparse` to `frontend/package.json`; verify dynamic import pattern works with Vite (`import('papaparse')`)
- [x] 3.2 Create `shared/lib/import/parsers/csvParser.ts` — implements `ImportParser`; `canParse` returns `true` for `.csv` filename or comma/semicolon-delimited content; dynamic import of papaparse; detect header row by checking for `word`/`tags`/`board`/`notes` keys (case-insensitive); parse rows into `ParsedRow[]` with all metadata fields; handle CRLF, UTF-8-BOM; mark unmatched-quote rows as errors; fallback to single-column (word-per-line) mode when 1 column + no recognised header; truncate rows beyond 500 with a warning
- [x] 3.3 Register `csvParser` in `parserRegistry.ts`; route `.csv` files through `csvParser` in `ImportUploader` file picker and drag-and-drop handlers
- [x] 3.4 Extend `ParsedRow` type with `tags?: string[]`, `board?: string`, `notes?: string`
- [x] 3.5 Implement tags parsing in `csvParser`: split `tags` column on semicolons, `normalizeWord` each tag, filter empties
- [x] 3.6 Extend `ImportPreview.tsx` to show tags chips and board badge per row; notes preview on row expand (click row to expand inline); "Will create: [name]" chip for boards/tags not yet in user's account (from server preview response)
- [x] 3.7 Extend `ImportSettings.tsx` board override: show "Board column in file will be ignored" notice when override is active; show "Board column used per row" when no override
- [x] 3.8 Verify `.apkg` rejection in `ImportUploader` — `.apkg` extension shows specific error: "Anki .apkg files are not supported. Export from Anki as Notes in Plain Text instead."
- [x] 3.9 Unit tests: `csvParser` — word-only CSV, full 4-column CSV, column order variation, empty word cell, CRLF endings, >500 row truncation, unmatched quotes, single-column fallback, semicolon tag splitting
- [ ] 3.10 Manual end-to-end: upload a 4-column CSV → verify tags/board/notes in preview → verify "Will create:" indicators → import → confirm cards have meanings and correct metadata

---

## Phase 4: Preview and UX Polish

**Goal:** Preview row performance for large lists, filter tabs, mobile layout, accessibility audit. No new import formats — this phase is purely UX hardening.

**Dependencies:** Phase 3 (CSV working; full format support minus Anki).

- [x] 4.1 Implement row virtualisation in `ImportPreview` — use CSS `content-visibility: auto` with a fixed row height (44px); benchmark with 500 rows on a mid-range mobile device; confirm no jank during scroll
- [x] 4.2 Add filter tabs to `ImportPreview`: "All" / "Valid" / "Duplicates" / "Errors"; `role="tablist"` + `role="tab"`; empty-filter state message when selection returns no rows
- [x] 4.3 Implement `error` step in `ImportSheet` — show error message from `useImportExecuteMutation` on failure; "Try again" returns to upload step; "Close" dismisses sheet
- [x] 4.4 Mobile layout: sheet takes full viewport height on mobile; preview rows min-height 44px; import button sticky at bottom of sheet; settings panel opens as an inline section below preview on mobile (no sub-sheet)
- [x] 4.5 Accessibility: import button `aria-label` includes word count; preview table uses `role="table"` / `role="row"` / `role="cell"`; filter tabs keyboard-navigable; error rows `aria-label` includes reason text; focus returns to trigger button on sheet close
- [x] 4.6 Add "Search manually" shortcut in result error rows — each failed word row shows a small "Search" link that navigates to `/search?q=[word]` and closes the import sheet; gives users an immediate recovery path for words not found in the dictionary
- [x] 4.7 Verify preview server-call debouncing — settings changes (board/tag/duplicate mode) must debounce the `useImportPreviewMutation` call by 300ms; confirm no excessive requests in browser network tab
- [x] 4.8 Add `featureFlags.vocabularyImport` to settings page: show an "Import vocabulary" list item that opens the import sheet when the flag is enabled

---

## Phase 5: Anki CSV Support

**Goal:** Anki Notes in Plain Text CSV exports importable with column-mapping UI.

**Dependencies:** Phase 3 (csvParser and parser registry in place; column-mapping architecture can build on them).

- [x] 5.1 Create `shared/lib/import/parsers/ankiParser.ts` — implements `ImportParser`; `canParse` returns `true` for tab-separated input or multi-column CSV with no recognised Lexis header; `parse` returns `requiresColumnMapping: true` with `columnSuggestions` from the heuristic; heuristic: column with shortest median value length + highest ratio of single-token values is the suggested word column
- [x] 5.2 Register `ankiParser` in `parserRegistry.ts` with lower priority than `csvParser` (falls through to Anki detection only when CSV header detection fails)
- [x] 5.3 Update `useImportFlow.ts` to check `parseResult.requiresColumnMapping`; if `true`, route to `anki-map` step instead of `preview`
- [x] 5.4 Create `AnkiColumnMapper.tsx` — column card grid (up to 6 columns, horizontally scrollable); each card shows column label, up to 5 sample values from first rows; radio/button to select as word column; optional secondary picker for tags column; limitation notice: "Only the selected word column is imported. Meanings will be fetched from the dictionary after import."; "Use this column" confirm button
- [x] 5.5 On `AnkiColumnMapper` confirm: call `ankiParser.parse(input)` with the confirmed `columnMap`; advance to `preview` step with resulting `ParsedRow[]`
- [x] 5.6 Implement Anki tags column: if user maps a tags column, split on spaces (Anki space-separated format), normalise each tag; reflected in `ParsedRow.tags`
- [x] 5.7 Create `AnkiColumnMapper.module.css` — column card grid layout, selection highlight (accent border), sample values list, limitation notice callout (using `--color-bg-secondary`)
- [ ] 5.8 Manual end-to-end: export a real Anki deck as "Notes in Plain Text"; upload; confirm column detection heuristic pre-selects the correct word column; complete import; verify words imported with meanings
- [x] 5.9 Unit tests: `ankiParser` — tab-separated two-column input, `canParse` returns `false` for single-column plain text, `canParse` returns `false` for CSV with recognised header, column heuristic selects shorter-median-length column correctly

---

## Phase Dependencies Summary

```
Phase 1 (Backend: endpoints, enrichment, ImportStatus)
    └── Phase 2 (TXT: complete vertical slice, all flow steps)
              └── Phase 3 (CSV: parseCsv, metadata columns, board/tag indicators)
                        └── Phase 4 (Polish: virtualisation, filters, mobile, a11y)
                        └── Phase 5 (Anki: column mapper, ankiParser)
```

Phases 4 and 5 can run in parallel once Phase 3 is complete.

Phase complete when:
- all tasks checked
- no TypeScript errors (`npx tsc --noEmit`)
- unit tests pass
- manual end-to-end verified for each import format
- no null-meaning cards created at any point (verify via `SELECT * FROM cards WHERE meanings IS NULL` returning 0 rows post-import)
