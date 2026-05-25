## ADDED Requirements

### Requirement: Preview shows all parsed rows before import
The system SHALL display a scrollable table of all parsed rows after the user provides input (paste or file upload). The preview SHALL appear before any import action is taken. Each row SHALL show: the normalised word, assigned tags (if any), assigned board (if any), and a row status indicator (valid / duplicate / error).

#### Scenario: Preview renders parsed rows
- **WHEN** a user uploads a file with 10 words
- **THEN** the preview shows 10 rows, one per word
- **AND** each row displays the word text and any associated tags, board, or notes from the source

#### Scenario: Preview is scrollable for large lists
- **WHEN** a file with 200 words is parsed
- **THEN** the preview renders in a scrollable container without freezing the UI
- **AND** rows are virtualised if the count exceeds 100 (windowed rendering)

---

### Requirement: Preview highlights duplicate rows
The system SHALL detect and visually distinguish two types of duplicates before import:
1. **Within-batch duplicates** — the same word appears more than once in the uploaded file
2. **Existing-vocabulary duplicates** — the word already exists in the user's vocabulary

Each duplicate row SHALL show a badge or icon explaining the reason.

#### Scenario: Within-batch duplicate detected
- **WHEN** a file contains the word "apple" on lines 1 and 7
- **THEN** the first occurrence shows status "Ready to import"
- **AND** the second occurrence shows status "Duplicate — already in this list (line 1)"

#### Scenario: Existing vocabulary duplicate detected
- **WHEN** the user uploads a word that already exists in their saved vocabulary
- **THEN** that row shows status "Already in your vocabulary"
- **AND** the chosen duplicate mode (skip / merge / reimport) is reflected in the status label

#### Scenario: Duplicate count shown in preview summary
- **WHEN** the preview contains 50 words with 3 within-batch duplicates and 5 vocabulary duplicates
- **THEN** the preview header shows "50 words · 8 duplicates · 0 errors"

---

### Requirement: Preview highlights malformed rows with reasons
The system SHALL mark every row that cannot be imported due to a parsing or validation error. Each error row SHALL show a human-readable reason explaining specifically why the row failed.

#### Scenario: Row with missing word value
- **WHEN** a CSV row has an empty word cell
- **THEN** the row is shown in the preview with error status and reason: "Missing word"

#### Scenario: Row with word exceeding maximum length
- **WHEN** an imported word is longer than 100 characters
- **THEN** the row is shown with error status and reason: "Word is too long (max 100 characters)"

#### Scenario: Row with non-Latin or unsupported characters
- **WHEN** an imported word consists entirely of non-Latin characters (e.g. "яблоко")
- **THEN** the row is shown with a warning status: "This looks like a non-English word — it will still be imported but may not be found in the dictionary"

---

### Requirement: Preview includes an import summary header
The system SHALL display a summary line above the preview rows showing total parsed count, duplicate count, and error count. This summary SHALL update live when the user changes import settings.

#### Scenario: Summary header reflects parsed data
- **WHEN** a file is parsed and the preview is shown
- **THEN** the header reads: "[N] words ready · [D] duplicates · [E] errors"

#### Scenario: Summary updates when duplicate mode changes
- **WHEN** the user changes duplicate mode from "Skip" to "Merge" in import settings
- **THEN** the "duplicates" count in the summary updates to reflect how many will now be merged rather than skipped

---

### Requirement: Preview rows are filterable
The system SHALL provide a row filter control in the preview that allows the user to show "All", "Valid only", "Duplicates only", or "Errors only". The default filter is "All".

#### Scenario: Filtering to errors only
- **WHEN** the user selects the "Errors only" filter
- **THEN** only rows with error status are shown in the preview table
- **AND** valid and duplicate rows are hidden

#### Scenario: Empty filter result
- **WHEN** the user selects "Errors only" and there are no errors
- **THEN** the preview shows an inline message: "No errors found — your list looks clean."

---

### Requirement: Import settings are accessible alongside the preview
The system SHALL display import settings (board assignment, tag assignment, duplicate mode) as a collapsible or side-by-side section accessible from the preview step without navigating away. Changing a setting SHALL update the preview immediately.

#### Scenario: Board assignment setting shown in preview
- **WHEN** the preview step is active
- **THEN** a settings section is visible showing "Add to board: (none)" with a picker to change it

#### Scenario: Setting a global tag updates preview rows
- **WHEN** the user adds a global tag "lesson-1" in import settings
- **THEN** all "valid" preview rows update to show "lesson-1" as an assigned tag

---

### Requirement: Import action is disabled when all rows are errors
The system SHALL disable the "Import [N] words" action button when the preview contains no valid rows to import (all rows are either errors or within-batch duplicates set to skip).

#### Scenario: All rows are errors
- **WHEN** every parsed row has an error status
- **THEN** the import button is disabled and shows "Nothing to import"

#### Scenario: Some rows are valid
- **WHEN** the preview has at least one valid row
- **THEN** the import button is enabled and shows "Import [N] words" where N is the valid + merge-mode-duplicate count
