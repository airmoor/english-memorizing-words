## ADDED Requirements

### Requirement: User can import words from pasted plain text
The system SHALL allow users to paste plain English text into an import input area and have the words extracted, normalised, and queued for import. Each non-empty line SHALL be treated as one word. Whitespace at the start and end of each line SHALL be trimmed. Empty lines SHALL be silently ignored.

#### Scenario: Valid paste with multiple words
- **WHEN** a user pastes "apple\nrun\nachieve\n\neffort" into the import text area
- **THEN** the system parses 4 words: ["apple", "run", "achieve", "effort"]
- **AND** empty lines are discarded
- **AND** a preview of 4 rows is shown before import

#### Scenario: Paste with leading and trailing whitespace on lines
- **WHEN** a user pastes "  banana  \n  walk  "
- **THEN** the system trims each line and parses 2 words: ["banana", "walk"]

#### Scenario: Paste with only empty lines
- **WHEN** a user pastes text that contains only whitespace and newlines
- **THEN** the system shows an inline validation error: "No words found. Enter one English word per line."
- **AND** the import action is disabled

#### Scenario: Paste with a single word
- **WHEN** a user pastes a single word with no newlines
- **THEN** the system parses 1 word and proceeds to the preview step

---

### Requirement: User can upload a .txt file for import
The system SHALL allow users to upload a `.txt` file via a file picker or drag-and-drop. The file SHALL be parsed using the same one-word-per-line logic as the paste flow. Files with any encoding other than UTF-8 or UTF-8-BOM SHALL show a warning but still attempt to parse using the detected encoding.

#### Scenario: Valid .txt file upload
- **WHEN** a user uploads a `.txt` file containing "apple\nrun\nachieve"
- **THEN** the system reads the file in the browser, parses 3 words, and advances to the preview step

#### Scenario: UTF-8-BOM file upload
- **WHEN** a user uploads a `.txt` file with a UTF-8 BOM prefix
- **THEN** the BOM is stripped and parsing proceeds normally with correct word extraction

#### Scenario: Unsupported file type
- **WHEN** a user uploads a `.docx` or `.pdf` file
- **THEN** the system shows an inline error: "Only .txt and .csv files are supported."
- **AND** the file is rejected without parsing

#### Scenario: Empty file upload
- **WHEN** a user uploads a `.txt` file that is empty or contains only whitespace
- **THEN** the system shows an inline error: "The file appears to be empty. Check the file and try again."

#### Scenario: File exceeds size limit
- **WHEN** a user uploads a `.txt` file larger than 1MB
- **THEN** the system shows an inline error: "File is too large. Maximum import size is 500 words."

---

### Requirement: Import input supports drag-and-drop
The system SHALL accept drag-and-drop of `.txt` and `.csv` files onto the import upload area. The drop target SHALL provide visual feedback (highlighted border) during drag-over. Dragging an unsupported file type SHALL show an immediate rejection indicator.

#### Scenario: Drag-and-drop valid .txt file
- **WHEN** a user drags a `.txt` file over the upload area and drops it
- **THEN** the file is accepted, parsed, and the preview step is shown

#### Scenario: Drag-and-drop unsupported file type
- **WHEN** a user drags a `.docx` file over the upload area
- **THEN** the drop zone shows a red/danger indicator ("Unsupported file type")
- **AND** dropping the file shows the inline error message without crashing

---

### Requirement: Plain-text import normalises word casing
The system SHALL normalise all imported words to lowercase before deduplication and import. The normalisation SHALL be applied client-side during parsing so the preview shows normalised words.

#### Scenario: Mixed-case input
- **WHEN** a user pastes "Apple\nRUN\nAchieve"
- **THEN** the preview shows ["apple", "run", "achieve"]
- **AND** the stored words use the normalised lowercase form

#### Scenario: Casing collision with existing word
- **WHEN** a user imports "Apple" and the user's vocabulary already contains "apple"
- **THEN** the system detects the duplicate after normalisation and applies the chosen duplicate mode
