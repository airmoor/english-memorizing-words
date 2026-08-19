## ADDED Requirements

### Requirement: Board visibility state
Every board SHALL have a `visibility` of either `private` or `unlisted`, defaulting to `private` for newly created boards and for all boards that existed before this capability shipped.

#### Scenario: New board defaults to private
- **WHEN** a user creates a new board
- **THEN** the board's visibility is `private` and it has no share link

#### Scenario: Existing boards are unaffected
- **WHEN** this capability is deployed
- **THEN** every board that already existed remains `private` with no share link, and its behavior in `/vocabulary` is unchanged

### Requirement: Owner can share a board via link
A board owner SHALL be able to set their board's visibility to `unlisted`, which generates a share link the owner can copy.

#### Scenario: Owner shares a private board
- **WHEN** the owner toggles a `private` board to `unlisted`
- **THEN** the system generates a new unique share slug for the board and displays a copyable share link

#### Scenario: Re-sharing after unsharing issues a new link
- **WHEN** the owner sets a board back to `private` and later sets it to `unlisted` again
- **THEN** the system issues a new share slug, and the previously issued link no longer resolves to the board

#### Scenario: Owner is shown that a board is currently shared
- **WHEN** the owner views a board whose visibility is `unlisted`
- **THEN** the board UI displays a persistent indicator that the board is shared and its link is live

### Requirement: Unsharing a board invalidates its link
Setting a board's visibility back to `private` SHALL immediately invalidate its existing share link.

#### Scenario: Link stops working after unsharing
- **WHEN** the owner sets an `unlisted` board back to `private`
- **THEN** requests to that board's previous share link return the same response as a nonexistent link

### Requirement: Anyone with an unlisted board's link can view it read-only
The system SHALL serve a read-only view of an unlisted board's name, description, color, and word list to any requester holding a valid share slug, without requiring authentication.

#### Scenario: Signed-out visitor opens a valid share link
- **WHEN** an unauthenticated visitor requests a valid share slug for an `unlisted` board
- **THEN** the system returns the board's name, description, color, and word list, and does not return the owner's account information

#### Scenario: Invalid or private slug returns not found
- **WHEN** a requester provides a slug that does not correspond to any `unlisted` board — including a slug that belonged to a board later set back to `private`
- **THEN** the system responds as if the board does not exist, with no distinction between "never existed" and "no longer shared"

#### Scenario: Shared board content cannot be edited from the read-only view
- **WHEN** a visitor (signed in or not) views a board through its share link
- **THEN** the view offers no way to add, remove, or edit words on the source board

### Requirement: Signed-in viewer can clone a shared board into their own account
A signed-in user viewing an unlisted board through its share link SHALL be able to create their own independent copy of that board and its words in one action.

#### Scenario: Viewer clones a shared board
- **WHEN** a signed-in user selects "Add to my vocabulary" on a shared board's read-only view
- **THEN** the system creates a new board owned by that user, containing copies of the source board's words, and the new board is fully editable by its owner like any other board

#### Scenario: Clone reuses the viewer's existing cards where possible
- **WHEN** a cloned word already exists in the viewer's own vocabulary
- **THEN** the system links the existing card into the new board instead of creating a duplicate card

#### Scenario: Clone does not stay linked to the source
- **WHEN** the source board is edited or deleted after a clone was made
- **THEN** the clone is unaffected — no fields on the clone update, and the clone continues to exist if the source is deleted

#### Scenario: Signed-out visitor is prompted to sign in before cloning
- **WHEN** an unauthenticated visitor on a shared board's read-only view attempts to add it to their vocabulary
- **THEN** the system prompts them to sign in or register before the clone action completes, and does not lose the intended board on redirect back
