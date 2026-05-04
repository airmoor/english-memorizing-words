## ADDED Requirements

### Requirement: Review session — due cards only
The system SHALL only present cards whose `next_review` date is today or earlier.

#### Scenario: Cards are due
- **WHEN** an authenticated user starts a review session
- **THEN** system returns all cards where `next_review <= today`, ordered by `next_review` ascending

#### Scenario: No cards due
- **WHEN** no cards are due for review
- **THEN** system returns an empty list and the UI displays a completion message with the next review date

---

### Requirement: Card display (EN → RU direction)
Each card in the review session SHALL display a prompt and hide the answer until revealed.

#### Scenario: Card front (prompt)
- **WHEN** a card is presented to the user
- **THEN** the front face shows the English word text and optionally its transcription; the definition and translation are hidden

#### Scenario: Card back (answer revealed)
- **WHEN** user taps "Show answer"
- **THEN** the back face shows the definition and translation (if available), part of speech, and usage examples

---

### Requirement: Rating submission
The system SHALL accept a rating from the user after each card review and update the card's SRS schedule.

#### Scenario: User rates a card "Good"
- **WHEN** user taps "Good" (quality = 4)
- **THEN** system applies SM-2 update: increases interval, recalculates ease factor, sets next_review, saves a ReviewLog entry

#### Scenario: User rates a card "Again"
- **WHEN** user taps "Again" (quality = 0)
- **THEN** system resets interval to 1 day, reduces ease factor (min 1.3), sets next_review to tomorrow, saves a ReviewLog entry

#### Scenario: User rates a card "Hard"
- **WHEN** user taps "Hard" (quality = 2)
- **THEN** system resets interval to 1 day, reduces ease factor, sets next_review to tomorrow, saves a ReviewLog entry

#### Scenario: User rates a card "Easy"
- **WHEN** user taps "Easy" (quality = 5)
- **THEN** system applies SM-2 update with maximum quality: increases interval more aggressively, increases ease factor, sets next_review, saves a ReviewLog entry

---

### Requirement: SM-2 algorithm correctness
The system SHALL implement the SM-2 algorithm for scheduling.

#### Scenario: First review of a new card (Good)
- **WHEN** a card with interval = 0 is rated Good (q = 4)
- **THEN** interval becomes 1, ease factor remains 2.5, next_review = today + 1

#### Scenario: Second review (Good)
- **WHEN** a card with interval = 1 is rated Good (q = 4)
- **THEN** interval becomes 6, ease factor remains 2.5, next_review = today + 6

#### Scenario: Subsequent review (Good)
- **WHEN** a card with interval = 6 and ease = 2.5 is rated Good (q = 4)
- **THEN** interval becomes round(6 * 2.5) = 15, ease remains 2.5, next_review = today + 15

#### Scenario: Ease factor floor
- **WHEN** repeated low ratings would reduce ease factor below 1.3
- **THEN** ease factor is clamped at 1.3; it MUST NOT go below this value

---

### Requirement: Review log persistence
The system SHALL record every review action for future analytics.

#### Scenario: Review log entry created
- **WHEN** user submits any rating for a card
- **THEN** a row is inserted into `review_logs` with card_id, rating, and reviewed_at (UTC timestamp)

---

### Requirement: Session progress indicator
The frontend SHALL show the user how many cards remain in the current session.

#### Scenario: Cards remaining counter
- **WHEN** a review session is in progress
- **THEN** the UI displays the count of remaining due cards for this session (decrements as cards are rated)
