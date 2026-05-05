## 1. Project Scaffold

- [x] 1.1 Initialize monorepo structure: create `backend/` and `frontend/` directories with root `package.json` (workspaces)
- [x] 1.2 Scaffold NestJS backend: `nest new backend` with TypeScript strict mode
- [ ] 1.3 Scaffold Next.js frontend: `npx create-next-app@latest frontend` with App Router, TypeScript, Tailwind
- [x] 1.4 Add `.env.example` files to both packages (DB URL, JWT secrets, API base URL)
- [x] 1.5 Set up Docker Compose for local PostgreSQL instance

## 2. Database Schema

- [x] 2.1 Install TypeORM (or Prisma) and PostgreSQL driver in backend
- [x] 2.2 Create migration: `users` table (id, email, password_hash, created_at)
- [x] 2.3 Create migration: `words` table (id, text UNIQUE, fetched_at)
- [x] 2.4 Create migration: `meanings` table (id, word_id FK, definition, transcription, part_of_speech, synonyms TEXT[], examples TEXT[])
- [x] 2.5 Create migration: `user_meanings` table (id, user_id FK, meaning_id FK, saved_at, UNIQUE user_id+meaning_id)
- [x] 2.6 Create migration: `cards` table (id, user_id FK, meaning_id FK, ease_factor, interval, next_review, created_at, UNIQUE user_id+meaning_id)
- [x] 2.7 Create migration: `review_logs` table (id, card_id FK, rating, reviewed_at)
- [x] 2.8 Verify all foreign key constraints and indexes (words.text, cards.next_review, user_meanings unique)

## 3. Authentication Module (Backend)

- [x] 3.1 Install `@nestjs/passport`, `passport-jwt`, `bcrypt`, `@nestjs/jwt`
- [x] 3.2 Create `AuthModule` with `AuthService`, `AuthController`
- [x] 3.3 Implement `POST /auth/register`: validate input, hash password, create user, return access token
- [x] 3.4 Implement `POST /auth/login`: validate credentials, return access token
- [ ] 3.5 Implement `POST /auth/refresh`: validate refresh cookie, rotate tokens
- [ ] 3.6 Implement `POST /auth/logout`: clear refresh cookie
- [x] 3.7 Create `JwtAuthGuard` and apply to VocabularyController
- [ ] 3.8 Write unit tests for AuthService (register, login, duplicate email, wrong password)

## 4. Words Module (Backend)

- [x] 4.1 Create `WordsModule` with `WordsService`, `WordsController`
- [x] 4.2 Implement `GET /api/words/:text`: check DB cache first; if found, return meanings
- [x] 4.3 Implement Free Dictionary API client (`https://api.dictionaryapi.dev/api/v2/entries/en/:word`)
- [x] 4.4 Implement DB write on cache miss: insert word + all meanings in a single transaction
- [x] 4.5 Normalize API response to internal Meaning schema (handle missing fields as empty arrays)
- [x] 4.6 Return 404 if external API returns not found; return 503 on network error
- [x] 4.7 Write unit tests for WordsService (cache hit, cache miss success, cache miss 404, API error)

## 5. Vocabulary Module (Backend)

- [x] 5.1 Create `VocabularyModule` with `VocabularyService`, `VocabularyController`
- [x] 5.2 Implement `POST /api/vocabulary/meanings/:meaningId`: save meaning + create card in one transaction (idempotent)
- [x] 5.3 Implement `POST /api/vocabulary/words/:wordId/save-all`: save all meanings of a word (skip already-saved, wrap in transaction)
- [x] 5.4 Implement `GET /api/vocabulary`: return all saved meanings for the authenticated user
- [x] 5.5 Implement `DELETE /api/vocabulary/meanings/:meaningId`: remove user_meaning + cascade delete card + review_logs
- [x] 5.6 Write unit tests for VocabularyService (save, save-all idempotency, delete cascade)

## 6. Review Module (Backend)

- [ ] 6.1 Create `ReviewModule` with `ReviewService`, `ReviewController`
- [ ] 6.2 Implement `GET /api/review/due`: return all cards where next_review <= today for the authenticated user
- [ ] 6.3 Implement `POST /api/review/cards/:cardId/rate`: accept rating (again|hard|good|easy), apply SM-2 update, insert review_log
- [ ] 6.4 Implement SM-2 algorithm function (ease recalculation, interval progression, next_review date)
- [ ] 6.5 Clamp ease_factor at minimum 1.3
- [ ] 6.6 Write unit tests for SM-2 algorithm (all four ratings, ease floor, interval progression)
- [ ] 6.7 Write unit tests for ReviewService (due cards query, rating submission)

## 7. Frontend — Auth Pages

- [ ] 7.1 Install Tanstack Query, Zustand, and axios (or fetch wrapper)
- [ ] 7.2 Create `/register` page: form with email + password fields, submit calls POST /auth/register
- [ ] 7.3 Create `/login` page: form with email + password, submit calls POST /auth/login
- [ ] 7.4 Implement auth state: store access token in memory (not localStorage); use Zustand
- [ ] 7.5 Implement axios interceptor: auto-refresh access token via refresh cookie on 401
- [ ] 7.6 Add route guard: redirect unauthenticated users to `/login`

## 8. Frontend — Word Search Page

- [ ] 8.1 Create `/search` page with a text input and search button
- [ ] 8.2 Call `GET /api/words/:text` on submit; show loading state
- [ ] 8.3 Render each meaning as a card: definition, transcription, part of speech, synonyms, examples
- [ ] 8.4 Show "Save" button per meaning; show "Save all" button at the top
- [ ] 8.5 Mark already-saved meanings with a visual indicator (check icon or different button state)
- [ ] 8.6 Handle 404 (word not found) and 503 (API unavailable) with appropriate UI messages
- [ ] 8.7 Wire "Save" to `POST /api/vocabulary/meanings/:id` with optimistic UI update
- [ ] 8.8 Wire "Save all" to `POST /api/vocabulary/words/:wordId/save-all`

## 9. Frontend — Vocabulary Page

- [ ] 9.1 Create `/vocabulary` page listing all saved meanings
- [ ] 9.2 Each row shows: word text, definition preview, part of speech
- [ ] 9.3 Implement remove button per meaning (calls DELETE, removes from list optimistically)
- [ ] 9.4 Show empty state when vocabulary is empty

## 10. Frontend — Review Page

- [ ] 10.1 Create `/review` page; on load call `GET /api/review/due`
- [ ] 10.2 Show session progress counter (X cards remaining)
- [ ] 10.3 Render card front: word text + transcription, "Show answer" button
- [ ] 10.4 Render card back: definition, translation, part of speech, examples
- [ ] 10.5 Show four rating buttons: Again / Hard / Good / Easy
- [ ] 10.6 On rating tap, call `POST /api/review/cards/:id/rate`, advance to next card
- [ ] 10.7 Show completion screen when no cards remain, displaying next scheduled review date

## 11. PWA Configuration

- [ ] 11.1 Install and configure `@ducanh2912/next-pwa` (or `next-pwa`)
- [ ] 11.2 Add `manifest.json` (name, icons, theme color, display: standalone)
- [ ] 11.3 Configure service worker to pre-cache app shell (/, /search, /vocabulary, /review)
- [ ] 11.4 Test installability on mobile (Chrome DevTools → Application → Manifest)

## 12. Integration & Validation

- [ ] 12.1 End-to-end smoke test: register → search word → save meaning → review card → rate card
- [ ] 12.2 Confirm cache hit: search same word twice; verify no second external API call (check DB fetched_at)
- [ ] 12.3 Verify SM-2 schedule: rate a card Good, check interval and next_review in DB
- [ ] 12.4 Verify cascade delete: remove a meaning from vocabulary, confirm card and review_logs are gone
- [ ] 12.5 Run backend unit tests (`npm test` in backend)
- [ ] 12.6 Fix any TypeScript or lint errors in both packages
