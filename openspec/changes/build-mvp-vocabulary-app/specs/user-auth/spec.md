## ADDED Requirements

### Requirement: User registration
The system SHALL allow a new user to create an account with an email address and password.

#### Scenario: Successful registration
- **WHEN** user submits a valid email and password (min 8 characters)
- **THEN** system creates a new user account, returns a 201 response, and issues an access token and sets a refresh token cookie

#### Scenario: Duplicate email
- **WHEN** user submits an email that already exists in the database
- **THEN** system returns a 409 Conflict error with message "Email already in use"

#### Scenario: Invalid email format
- **WHEN** user submits a malformed email address
- **THEN** system returns a 400 Bad Request error with a validation message

#### Scenario: Password too short
- **WHEN** user submits a password shorter than 8 characters
- **THEN** system returns a 400 Bad Request error indicating minimum length requirement

---

### Requirement: User login
The system SHALL allow an existing user to authenticate with email and password.

#### Scenario: Successful login
- **WHEN** user submits correct email and password
- **THEN** system returns a 200 response with an access token (JWT, 15-minute expiry) and sets an httpOnly refresh token cookie (7-day expiry)

#### Scenario: Wrong password
- **WHEN** user submits correct email but wrong password
- **THEN** system returns a 401 Unauthorized error; response MUST NOT indicate whether the email or password was incorrect

#### Scenario: Unknown email
- **WHEN** user submits an email not registered in the system
- **THEN** system returns a 401 Unauthorized error (same generic message as wrong password)

---

### Requirement: Token refresh
The system SHALL allow a user to obtain a new access token using a valid refresh token.

#### Scenario: Valid refresh token
- **WHEN** client sends a request to POST /auth/refresh with a valid httpOnly refresh token cookie
- **THEN** system returns a new access token and rotates the refresh token cookie

#### Scenario: Expired or invalid refresh token
- **WHEN** client sends a request with an expired or tampered refresh token
- **THEN** system returns a 401 Unauthorized error and clears the cookie

---

### Requirement: Protected route access
The system SHALL require a valid access token for all non-auth endpoints.

#### Scenario: Valid access token
- **WHEN** client includes a valid Bearer access token in the Authorization header
- **THEN** system processes the request normally

#### Scenario: Missing or expired access token
- **WHEN** client makes a request without a token or with an expired token
- **THEN** system returns a 401 Unauthorized error

---

### Requirement: Logout
The system SHALL allow a user to invalidate their session.

#### Scenario: Successful logout
- **WHEN** user calls POST /auth/logout with a valid access token
- **THEN** system clears the refresh token cookie and returns a 200 response
