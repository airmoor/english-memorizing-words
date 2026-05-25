## ADDED Requirements

### Requirement: Backend validates and previews an import batch
The system SHALL expose a `POST /import/preview` endpoint that accepts a structured import payload and returns per-row validation results without writing any data. The endpoint SHALL check for existing-vocabulary duplicates server-side. No dictionary lookups SHALL occur during preview. The response SHALL be returned within 500ms for batches up to 500 words.

#### Scenario: Preview request returns validation results
- **WHEN** a client sends 10 words to `POST /import/preview`
- **THEN** the response contains 10 rows with status: `valid`, `duplicate_vocabulary`, or `error`
- **AND** each error row includes a `reason` string
- **AND** no cards, boards, tags, or dictionary calls are made

#### Scenario: Existing vocabulary duplicates detected in preview
- **WHEN** 3 of the 10 submitted words already exist in the user's vocabulary
- **THEN** those 3 rows are returned with `status: "duplicate_vocabulary"`
- **AND** the 7 remaining rows are returned with `status: "valid"`

#### Scenario: Preview enforces batch size limit
- **WHEN** a request submits more than 500 words
- **THEN** the endpoint returns `400 Bad Request` with message: "Batch size exceeds maximum of 500 words."

---

### Requirement: Backend executes an import batch with synchronous enrichment
The system SHALL expose a `POST /import/execute` endpoint that enriches all valid words (cache-first, dictionary API fallback) and creates cards only after meanings are successfully resolved. Cards with null meanings SHALL NOT be created under any circumstances. The endpoint SHALL return an `ImportExecuteResult` containing an `ImportStatus` and counts.

#### Scenario: Successful import — all words cached
- **WHEN** all submitted words already exist in the `words` table with meanings
- **THEN** cards are created immediately with meanings attached
- **AND** the response contains `{ status: "completed", imported: N, skipped: 0, errors: 0, errorRows: [] }`

#### Scenario: Successful import — some words fetched from dictionary
- **WHEN** some submitted words are not in the cache
- **THEN** the backend fetches meanings from the dictionary API for those words
- **AND** cards are created only after meanings are resolved
- **AND** the response contains `{ status: "completed", imported: N, skipped: 0, errors: 0, errorRows: [] }`

#### Scenario: Partial failure — some words not found in dictionary
- **WHEN** 3 of 20 words cannot be found in the dictionary after all provider fallbacks
- **THEN** 17 cards are created with meanings
- **AND** the 3 failed words are returned as error rows with reason "Word not found in dictionary"
- **AND** the response contains `{ status: "partial_failure", imported: 17, errors: 3, errorRows: [...] }`
- **AND** the endpoint returns `200 OK` (partial success is not a 4xx error)

#### Scenario: Import with skipped duplicates
- **WHEN** 5 of 20 submitted words already exist and duplicate mode is `skip`
- **THEN** 15 cards are created for the new words
- **AND** the 5 existing words are not modified
- **AND** the response contains `{ status: "completed", imported: 15, skipped: 5, errors: 0, errorRows: [] }`

#### Scenario: Import with import-anyway mode
- **WHEN** 5 of 20 submitted words already exist and duplicate mode is `import-anyway`
- **THEN** all 20 words are processed for enrichment
- **AND** 20 cards are created (including 5 additional cards for words already in vocabulary)
- **AND** the response contains `{ status: "completed", imported: 20, skipped: 0, errors: 0, errorRows: [] }`

#### Scenario: Complete failure — all words fail enrichment
- **WHEN** all submitted words cannot be found in the dictionary
- **THEN** no cards are created
- **AND** the response contains `{ status: "failed", imported: 0, errors: N, errorRows: [...] }`

---

### Requirement: ImportStatus communicates the lifecycle state of an import
The system SHALL include an `ImportStatus` field in all execute responses. This field SHALL reflect the overall quality of the import result. The values `queued` and `processing` are reserved for a future async job mode and SHALL NOT be returned by the synchronous MVP execute endpoint.

```typescript
type ImportStatus =
  | 'queued'            // reserved: job received, enrichment not yet started
  | 'processing'        // reserved: enrichment in progress
  | 'completed'         // all submitted words successfully imported
  | 'partial_failure'   // some imported, some failed enrichment or validation
  | 'failed'            // nothing imported (all duplicates, all failed, or network error)
```

#### Scenario: All words imported successfully
- **WHEN** execute completes with all words resolved
- **THEN** response includes `status: "completed"`

#### Scenario: Mix of successes and failures
- **WHEN** execute completes with at least one success and at least one failure
- **THEN** response includes `status: "partial_failure"`

#### Scenario: Nothing imported
- **WHEN** execute completes with zero cards created (all skipped or all failed)
- **THEN** response includes `status: "failed"`

---

### Requirement: Import automatically creates missing boards and tags
The system SHALL create any boards or tags specified in the import that do not yet exist for the user. Board and tag creation SHALL occur within the same transaction as card creation. Name normalisation (trim, lowercase for tags) SHALL be applied. Board names retain original casing.

#### Scenario: New board created during import
- **WHEN** an import specifies board "Nature" and the user has no "Nature" board
- **THEN** the "Nature" board is created for the user
- **AND** all imported words assigned to "Nature" in the CSV are added to the new board

#### Scenario: New tag created during import
- **WHEN** an import includes tag "botany" and the user has no "botany" tag
- **THEN** the "botany" tag is created (lowercase, trimmed) for the user
- **AND** all imported words assigned "botany" are tagged correctly

#### Scenario: Import settings board override creates new board
- **WHEN** the user specifies a global board override "Lesson 1" that does not exist
- **THEN** "Lesson 1" is created and all imported words are assigned to it

---

### Requirement: Import result is shown as a non-closeable summary until acknowledged
The system SHALL display the import result summary after execute returns. The summary SHALL distinguish between `completed`, `partial_failure`, and `failed` statuses visually. The sheet SHALL NOT be dismissible by tapping the backdrop during the result step.

#### Scenario: Result summary shown with status-aware styling
- **WHEN** the import completes with `status: "completed"`
- **THEN** the result screen shows success styling with: "Imported: [N] words"

#### Scenario: Partial failure result shown
- **WHEN** the import completes with `status: "partial_failure"`
- **THEN** the result screen shows amber/warning styling with counts: "Imported: N · Skipped: D · Failed: E"
- **AND** an expandable "View [E] failed words" section shows each error row with its reason

#### Scenario: Complete failure result shown
- **WHEN** the import completes with `status: "failed"`
- **THEN** the result screen shows error styling explaining what went wrong
- **AND** an "Import more" option allows the user to try a different file or word list

#### Scenario: Backdrop dismissal blocked on result step
- **WHEN** the import result step is shown
- **THEN** tapping the backdrop behind the sheet does NOT close the sheet
- **AND** the user must use "View vocabulary" or "Import more" to proceed

---

### Requirement: Import is protected by user authentication
The system SHALL require valid authentication on both `POST /import/preview` and `POST /import/execute`. All created cards, boards, and tags SHALL be owned by the authenticated user. No cross-user data access is possible through the import flow.

#### Scenario: Unauthenticated import request is rejected
- **WHEN** a request is made to `POST /import/execute` without a valid auth token
- **THEN** the endpoint returns `401 Unauthorized`

#### Scenario: Import is scoped to the authenticated user
- **WHEN** a user imports 10 words
- **THEN** all created cards belong to that user's account only
- **AND** no other user's vocabulary is affected
