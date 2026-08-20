## ADDED Requirements

### Requirement: Assign a board from the vocabulary list
A signed-in user SHALL be able to add or remove a saved word's board membership directly from its row in the vocabulary list, without opening the word's detail panel.

#### Scenario: User assigns a board from a list row
- **WHEN** a user activates the board-assignment control on a word row in the vocabulary list (compact or detailed view)
- **THEN** the system shows the current set of the user's boards with the word's existing memberships checked, and toggling a board immediately assigns or removes the word from that board

#### Scenario: Control respects the boards feature flag
- **WHEN** the boards/tags feature flag is disabled
- **THEN** no board-assignment control is shown on list rows

### Requirement: Assign a board from Search at save time
A signed-in user SHALL be able to add a newly saved word to a board directly from the Search page, without navigating away.

#### Scenario: User assigns a board right after saving a word
- **WHEN** a user has just saved a word from Search
- **THEN** a board-assignment control is available on that word's entry, opening the same board picker used elsewhere in the app

### Requirement: Newly created board is pre-selected for the word in progress
When a user creates a new board from within a word's board-assignment flow, that word SHALL already be a member of the new board once creation completes.

#### Scenario: Creating a board while assigning a word
- **WHEN** a user opens "New board" from a word's board picker and successfully creates it
- **THEN** the newly created board is immediately assigned to that word, and the picker reflects it as checked without an additional action

#### Scenario: Creating a board from a context with no word in progress
- **WHEN** a user creates a board from a surface not tied to a specific word (e.g. the boards sidebar's "New board", or the Home page's first-board prompt)
- **THEN** the new board is created empty, exactly as today — no word is auto-assigned

### Requirement: Distinct empty state for a genuinely empty board
Viewing a board with zero words and no active search/filter SHALL show a message and next step specific to an empty board, distinct from the "no results for this filter" state.

#### Scenario: Opening a board with no words
- **WHEN** a user selects a board that has no words assigned and no search/filter is active
- **THEN** the vocabulary list shows an empty-board message with a way to return to All Vocabulary, rather than a "no matches" filter message

#### Scenario: Filtering within a non-empty board to zero results
- **WHEN** a search or filter is active within a board and it matches nothing
- **THEN** the existing "no matches" filter empty state is shown, unchanged

