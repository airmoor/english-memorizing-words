## ADDED Requirements

### Requirement: User can upload a CSV file with a word column
The system SHALL accept `.csv` file uploads where a column named `word` (case-insensitive) is present. The `word` column is the only required column. All rows with a non-empty `word` value SHALL be parsed. The header row SHALL be detected automatically and excluded from word extraction.

#### Scenario: Minimal CSV with word column only
- **WHEN** a user uploads a CSV with header `word` and rows ["apple", "run", "achieve"]
- **THEN** the system parses 3 words and advances to the preview step

#### Scenario: CSV with optional metadata columns
- **WHEN** a user uploads a CSV with header `word,tags,board,notes` and rows ["apple,fruit;food,Nature,A common fruit"]
- **THEN** the system parses the word as "apple", tags as ["fruit", "food"], board as "Nature", notes as "A common fruit"
- **AND** the preview shows all metadata associated with each row

#### Scenario: CSV with columns in non-standard order
- **WHEN** a user uploads a CSV with header `notes,board,word,tags`
- **THEN** the system detects the `word` column by name regardless of column position
- **AND** parses all rows correctly

#### Scenario: Row missing the word column value
- **WHEN** a CSV row has an empty `word` cell
- **THEN** the row is marked as a parsing error in the preview with reason: "Missing word"
- **AND** the row is excluded from the import count

---

### Requirement: CSV tags column uses semicolon as separator
The system SHALL parse the `tags` column by splitting on semicolons (`;`). Each resulting tag SHALL be trimmed of whitespace. Empty segments after splitting SHALL be ignored. Tags SHALL be normalised to lowercase. The system SHALL create tags that do not yet exist for the user.

#### Scenario: Multiple tags on a word
- **WHEN** a CSV row has tags column value "fruit; food; common"
- **THEN** the system parses 3 tags: ["fruit", "food", "common"]

#### Scenario: Tags with extra whitespace
- **WHEN** a CSV row has tags column value "  fruit ;  food  "
- **THEN** the system trims each tag and parses ["fruit", "food"]

#### Scenario: Tags column is empty
- **WHEN** a CSV row has an empty tags column
- **THEN** no tags are assigned to that word
- **AND** no error is shown for the row

#### Scenario: New tag that does not exist for the user
- **WHEN** a CSV row specifies a tag "botany" and the user has no existing "botany" tag
- **THEN** the "botany" tag is created for the user as part of the import execution
- **AND** the preview shows "Will create: botany" next to the new tag

---

### Requirement: CSV board column assigns words to a board
The system SHALL read the `board` column value and assign each word to the named board. If the named board does not exist for the user, the system SHALL create it during import execution. If the `board` column is absent or empty for a row, the word is imported without board assignment (unless a global board override is set in import settings).

#### Scenario: Board column references existing board
- **WHEN** a CSV row has board column value "Business English" and the user has that board
- **THEN** the imported word is assigned to the existing "Business English" board

#### Scenario: Board column references a new board name
- **WHEN** a CSV row has board column value "Nature" and the user has no "Nature" board
- **THEN** the "Nature" board is created for the user during import
- **AND** the preview shows "Will create: Nature" next to the board name

#### Scenario: Board column is empty
- **WHEN** a CSV row has no board value
- **THEN** the word is imported without board assignment
- **AND** global board override from import settings is applied if set

#### Scenario: Import settings board override takes precedence
- **WHEN** a user sets a global board override in import settings ("Lesson 1") AND a CSV row has board column value "Nature"
- **THEN** the global board override ("Lesson 1") is used and the CSV board column is ignored
- **AND** the preview clearly indicates the override is active

---

### Requirement: CSV notes column attaches a note to the imported card
The system SHALL read the `notes` column value and attach it as a card note to the imported word. Notes are plain text. Notes exceeding 1000 characters SHALL be truncated at the 1000-character boundary with a warning shown in the preview.

#### Scenario: Notes column has a value
- **WHEN** a CSV row has notes column value "Irregular verb - past tense: ran"
- **THEN** the imported card has this text saved as its note

#### Scenario: Notes column exceeds 1000 characters
- **WHEN** a CSV row has a notes value longer than 1000 characters
- **THEN** the note is truncated to 1000 characters
- **AND** the preview row shows a warning icon with tooltip "Note truncated to 1000 characters"

---

### Requirement: CSV parser handles malformed rows gracefully
The system SHALL never crash on malformed CSV input. Rows with parsing errors SHALL be flagged in the preview with a human-readable reason. The import SHALL proceed for all valid rows regardless of how many rows are malformed.

#### Scenario: Row with unmatched quotes
- **WHEN** a CSV row contains an unclosed quote character (e.g. `"apple,noun`)
- **THEN** the row is flagged as a parsing error with reason: "Could not parse row — check for unmatched quotes"
- **AND** all other rows are parsed normally

#### Scenario: CSV with Windows CRLF line endings
- **WHEN** a CSV file uses CRLF (`\r\n`) line endings
- **THEN** the system parses the file correctly without treating `\r` as part of the word value

#### Scenario: CSV with more than 500 rows
- **WHEN** a user uploads a CSV with 600 rows
- **THEN** the system shows a warning: "Only the first 500 rows will be imported. Split your file for larger imports."
- **AND** the preview shows exactly 500 rows (the first 500 from the file)

---

### Requirement: CSV with no recognised header falls back to single-column mode
When a CSV file has no header row containing `word`, `tags`, `board`, or `notes`, the system SHALL treat the entire file as a word-per-line list — the same as TXT import — if the file has only one column. If the file has multiple columns and no recognisable header, the Anki column-mapping flow SHALL be triggered instead.

#### Scenario: Single-column CSV with no header
- **WHEN** a CSV file has rows ["apple", "run", "achieve"] with no header
- **THEN** the system treats it as a word-per-line import and parses 3 words

#### Scenario: Multi-column CSV with no recognised header
- **WHEN** a CSV file has rows ["apple", "a red fruit"] with no header
- **THEN** the system triggers the Anki-style column-mapping UI
