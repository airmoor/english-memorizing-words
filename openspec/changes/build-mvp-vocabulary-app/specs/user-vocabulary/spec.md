## ADDED Requirements

### Requirement: Meanings are saved, not words
The system SHALL associate saved items with specific meanings, not with words directly.

#### Scenario: User saves a meaning
- **WHEN** user saves a meaning
- **THEN** a row is created in `user_meanings` linking the user to that meaning; no word-level save record is created

#### Scenario: Two users save different meanings of the same word
- **WHEN** user A saves meaning 1 of "set" and user B saves meaning 2 of "set"
- **THEN** each user's vocabulary contains only their saved meaning; the underlying `words` and `meanings` rows are shared

---

### Requirement: View personal vocabulary
The system SHALL allow a user to view all their saved meanings.

#### Scenario: User has saved meanings
- **WHEN** an authenticated user navigates to the vocabulary page
- **THEN** system returns all meanings saved by that user, including word text, definition, part of speech, and transcription

#### Scenario: User has no saved meanings
- **WHEN** an authenticated user navigates to the vocabulary page with no saved items
- **THEN** system returns an empty list and the UI displays an empty-state prompt to search for words

---

### Requirement: Remove a saved meaning
The system SHALL allow a user to remove a meaning from their vocabulary.

#### Scenario: User removes a meaning
- **WHEN** user removes a meaning from their vocabulary
- **THEN** the `user_meanings` row is deleted; the associated `cards` row for that meaning is also deleted; the shared `meanings` row is NOT deleted

#### Scenario: Removing a meaning removes its card and logs
- **WHEN** a meaning is removed from the user's vocabulary
- **THEN** all `cards` and `review_logs` associated with that user + meaning are also deleted (cascading)

---

### Requirement: No duplicate saved meanings
The system SHALL prevent a user from saving the same meaning more than once.

#### Scenario: Attempt to save an already-saved meaning
- **WHEN** user attempts to save a meaning they have already saved
- **THEN** system returns a 200 response (idempotent) without creating a duplicate row
