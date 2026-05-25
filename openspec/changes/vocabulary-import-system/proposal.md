## Why

Users currently build vocabulary one word at a time through search — there is no way to bulk-add words from an existing list, a teacher's handout, a spreadsheet, or a migration from another app. This creates a high onboarding barrier: learners with existing word lists have no path into Lexis without manually searching each word. Adding an import system unlocks teacher workflows, app migrations, and bulk vocabulary onboarding with zero friction.

## What Changes

- New import entry point in the app (accessible from vocabulary page and settings)
- Iteration 1: plain-text import — paste or upload a `.txt` file, one word per line
- Iteration 2: structured CSV import — `word, tags, board, notes` columns with optional metadata
- Iteration 3: Anki-compatible CSV mapping — column detection and flexible mapping for Anki exports
- Import processing layer — words are enriched (meanings resolved from cache or dictionary) before cards are created; no cards with null meanings are ever written to the vocabulary
- Import preview UI — parsed rows shown before committing, with duplicate/error indicators; preview is instant (client-side only, no API calls)
- Import settings panel — board assignment, tag assignment, duplicate handling (skip / import anyway)
- Import result summary — imported / skipped / error counts with `ImportStatus`; never silent failures
- Backend import endpoint — batch word resolution with synchronous enrichment, deduplication, structured result

## Capabilities

### New Capabilities

- `import-txt`: Accept pasted text or a `.txt` upload; parse one English word per line; normalise whitespace and casing; deduplicate within batch; route through the import processing layer
- `import-csv`: Accept `.csv` upload with flexible column detection (`word`, `tags`, `board`, `notes`); only `word` is required; auto-create missing tags/boards; tolerate column order variation and encoding differences
- `import-anki`: Accept Anki CSV exports; detect likely word column via heuristics; present column-mapping UI; preview import before execution; clearly document limitations vs full `.apkg` support
- `import-preview`: Unified pre-import preview screen — instant client-side parsing, duplicate indicators, malformed row highlighting, existing-word detection (server-side), row-level error explanations; no dictionary enrichment during preview
- `import-session`: Server-side import processing layer — enriches words synchronously (cache-first, dictionary fallback), creates cards only after meanings are resolved, applies board/tag assignments, returns `ImportStatus` + structured result (imported / skipped / failed counts + row-level errors)

### Modified Capabilities

- *(none — all import paths are additive; no existing vocabulary, boards, or tags behaviour changes)*

## Impact

- **Backend**: New `ImportModule` with `POST /import/preview` and `POST /import/execute` endpoints; reuses existing `WordsService`, `VocabularyService`, `BoardsService`, `TagsService`; synchronous enrichment within the execute request — words not found in the dictionary are returned as errors, not created as incomplete cards
- **Frontend**: New `features/import-vocabulary` feature area; new `entities/import-session` entity (including `ImportStatus` type); parser abstraction layer in `shared/lib/import/parsers/` with a unified `ImportParser` interface; import entry point wired into vocabulary page header and settings
- **Database**: No new tables required for MVP; all created cards have meanings populated before commit; no null-meaning card state introduced anywhere in the data model
- **External dependencies**: No new external APIs; enrichment reuses existing dictionary providers (Merriam-Webster + Free Dictionary fallback)
- **No breaking changes**: All existing vocabulary, review, boards, and tags behaviour is unchanged
