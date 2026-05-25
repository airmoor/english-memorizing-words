## ADDED Requirements

### Requirement: System accepts Anki CSV exports
The system SHALL accept CSV files exported from Anki ("Notes in Plain Text" export format). Anki exports are typically tab-separated, may have no header row, and contain at least two columns (front and back of the flashcard). The system SHALL detect likely Anki format by the presence of tab separators and/or the absence of a recognised column header.

#### Scenario: Tab-separated file detected as Anki export
- **WHEN** a user uploads a CSV file that uses tab characters as delimiters
- **THEN** the system detects the tab-separated format and opens the column-mapping step

#### Scenario: Comma-separated multi-column file with no recognised header
- **WHEN** a user uploads a CSV file with two or more columns and no `word`, `tags`, `board`, or `notes` header
- **THEN** the system opens the column-mapping step

---

### Requirement: User maps columns before import
The system SHALL show a column-mapping UI when an Anki-style file is detected. The user SHALL select which column represents the English word to import. The remaining columns SHALL be ignored. The column-mapping step SHALL precede the preview step.

#### Scenario: Column mapping with two columns
- **WHEN** the uploaded file has columns [Column 1 (values: "apple", "run"), Column 2 (values: "яблоко", "бежать")]
- **THEN** the system shows both columns with sample values
- **AND** pre-selects the column with the highest ratio of single-word English-looking values as the word column
- **AND** the user can override the selection before proceeding

#### Scenario: User confirms column mapping
- **WHEN** the user selects "Column 1" as the word column and clicks "Use this column"
- **THEN** the system extracts words from that column only and advances to the import preview step

#### Scenario: User changes the default column suggestion
- **WHEN** the system pre-selects Column 1 but the user selects Column 2 instead
- **THEN** the system uses Column 2 for word extraction
- **AND** the preview reflects the new selection

---

### Requirement: Column mapping shows sample values for each column
The system SHALL display up to 5 sample values for each column in the mapping UI so the user can identify the correct word column without needing to understand Anki's export format.

#### Scenario: Sample values displayed per column
- **WHEN** the column-mapping UI is shown for a file with 3 columns
- **THEN** each column card shows up to 5 example values from the first rows of the file
- **AND** column cards are scrollable if there are more than 4 columns

#### Scenario: Column with all empty sample values
- **WHEN** a column has no data in the first 5 rows
- **THEN** the column card shows "(empty)" as the sample indicator
- **AND** the column can still be selected

---

### Requirement: Anki tags column is optionally mapped
After selecting the word column, the user SHALL have the option to also map an Anki tags column. Anki stores tags space-separated. If the user maps a tags column, the system SHALL split tags on spaces and normalise them to lowercase.

#### Scenario: User maps an Anki tags column
- **WHEN** a column contains values like "verb irregular grammar"
- **THEN** the system splits on spaces and imports 3 tags: ["verb", "irregular", "grammar"]

#### Scenario: User skips tags column mapping
- **WHEN** the user does not select a tags column
- **THEN** no tags are imported from the file (global tag overrides from import settings still apply)

---

### Requirement: System clearly communicates Anki import limitations
The import UI SHALL display a clearly worded limitation notice during the Anki column-mapping step explaining what is and is not imported from Anki exports.

#### Scenario: Limitation notice is displayed
- **WHEN** the Anki column-mapping step is shown
- **THEN** the UI displays a notice: "Only the selected word column is imported. Translations, notes, and card history from Anki are not supported. Meanings will be fetched from the Lexis dictionary after import."

#### Scenario: .apkg file is uploaded
- **WHEN** a user uploads a `.apkg` file
- **THEN** the system shows an unsupported format error: "Anki .apkg files are not supported. In Anki, go to File → Export → Notes in Plain Text (.txt) and import that file instead."
- **AND** the file is not parsed

---

### Requirement: Anki import proceeds to the standard preview step after mapping
After column mapping is confirmed, the Anki import SHALL follow the same preview and settings flow as a standard CSV import. No special treatment is applied to Anki-sourced rows during preview, import settings, or result summary.

#### Scenario: Anki import reaches preview after mapping
- **WHEN** a user completes the column-mapping step
- **THEN** the standard import preview is shown with the extracted words
- **AND** the standard import settings (board, tags, duplicate mode) are available
