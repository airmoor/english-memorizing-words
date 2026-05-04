## ADDED Requirements

### Requirement: Word lookup with local cache
The system SHALL first check the local database before calling any external dictionary API.

#### Scenario: Word found in local database
- **WHEN** an authenticated user searches for a word that already exists in the `words` table
- **THEN** system returns all associated meanings from the database WITHOUT calling the external API

#### Scenario: Word not in database — successful external fetch
- **WHEN** an authenticated user searches for a word not in the database
- **THEN** system calls the external dictionary API, inserts the word and all its meanings into the database, and returns the meanings

#### Scenario: Word not in database — external API returns not found
- **WHEN** the external API returns a 404 for the searched word
- **THEN** system returns a 404 response to the client; nothing is written to the database

#### Scenario: External API unavailable
- **WHEN** the external API call fails due to a network or server error
- **THEN** system returns a 503 Service Unavailable error; nothing is written to the database

---

### Requirement: Meaning data completeness
Each meaning stored in the database MUST include all fields available from the source.

#### Scenario: Full meaning data returned
- **WHEN** the external API provides definition, transcription, part of speech, synonyms, and examples for a meaning
- **THEN** all fields are stored in the `meanings` table and returned to the client

#### Scenario: Partial meaning data (missing optional fields)
- **WHEN** the external API omits synonyms or examples for a meaning
- **THEN** those fields are stored as empty arrays; the meaning is still saved and returned

---

### Requirement: Search result display
The frontend SHALL display all meanings for a searched word.

#### Scenario: Multiple meanings returned
- **WHEN** a word has multiple meanings (different parts of speech or definitions)
- **THEN** all meanings are displayed, each showing: definition, transcription (if available), part of speech, synonyms, and usage examples

#### Scenario: Single meaning returned
- **WHEN** a word has exactly one meaning
- **THEN** that meaning is displayed with its full data

---

### Requirement: Save single meaning
The system SHALL allow a user to save one specific meaning from search results.

#### Scenario: User saves one meaning
- **WHEN** user taps "Save" on a single meaning card
- **THEN** that meaning is added to the user's vocabulary (user_meanings) and a flashcard is created; button updates to a saved state

#### Scenario: Meaning already saved
- **WHEN** user views search results for a word they have previously saved meanings from
- **THEN** already-saved meanings MUST be visually distinguished (e.g., checkmark or filled icon)

---

### Requirement: Save all meanings
The system SHALL allow a user to save all meanings for a word at once.

#### Scenario: User saves all meanings
- **WHEN** user taps "Save all" on the search results page
- **THEN** all meanings are added to the user's vocabulary and corresponding flashcards are created in one operation

#### Scenario: Some meanings already saved
- **WHEN** user taps "Save all" but some meanings are already saved
- **THEN** system MUST only save the unsaved meanings (idempotent); no duplicate entries are created
