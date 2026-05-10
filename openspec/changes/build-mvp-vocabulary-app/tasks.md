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
- [x] 4.3 Implement dictionary provider abstraction with Merriam-Webster Learner's primary + Free Dictionary fallback
- [x] 4.3a Create provider interface (`IDictionaryProvider`) and selection service (`DictionaryProviderService`)
- [x] 4.3b Implement Merriam-Webster provider (uses entries[0]; key from `MERRIAM_API_KEY` env)
- [x] 4.3c Implement Free Dictionary provider as fallback
- [x] 4.3d Add migration `1746500000000-AddDictionaryProvider`: words.transcription, words.provider, drop meanings.transcription
- [x] 4.3e Add migration `1746500000001-AddSenseNumber`: meanings.sense_number for MW dictionary-style hierarchy
- [x] 4.3f MW normalizer resolves bare letter sense numbers ("a", "b") into canonical "1a" / "1b" using the most recent top-level number
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

- [x] 6.1 Create `ReviewsModule` with `ReviewsService`, `ReviewsController`
- [x] 6.2 Implement `GET /api/reviews/next`: return next due card for the authenticated user
- [x] 6.3 Implement `POST /api/reviews/:cardId`: accept rating (again|hard|good|easy), apply SM-2 update, insert review_log
- [x] 6.4 Implement SM-2 algorithm function (ease recalculation, interval progression, next_review date)
- [x] 6.5 Clamp ease_factor at minimum 1.3
- [ ] 6.6 Write unit tests for SM-2 algorithm (all four ratings, ease floor, interval progression)
- [ ] 6.7 Write unit tests for ReviewService (due cards query, rating submission)

## 7. Frontend — Auth Pages

- [x] 7.1 Install Tanstack Query, Zustand, and axios (or fetch wrapper)
- [x] 7.2 Create `/register` page: form with email + password fields, submit calls POST /auth/register
- [x] 7.3 Create `/login` page: form with email + password, submit calls POST /auth/login
- [x] 7.4 Implement auth state: store access token in memory (not localStorage); use Zustand
- [x] 7.5 Implement axios interceptor: auto-refresh access token via refresh cookie on 401
- [x] 7.6 Add route guard: redirect unauthenticated users to `/login`

## 8. Frontend — Word Search Page

- [x] 8.1 Create `/search` page with a text input and search button
- [x] 8.2 Call `GET /api/words/:text` on submit; show loading state (debounced 300 ms + Enter)
- [x] 8.3 Render each meaning as a card: definition, transcription, part of speech, synonyms, examples
- [x] 8.4 Show "Save" button per meaning; show "Save all" button at the top
- [x] 8.5 Mark already-saved meanings with a visual indicator ("Saved ✓" badge, accent-subtle style)
- [x] 8.6 Handle 404 (word not found) and 503 (API unavailable) with appropriate UI messages
- [x] 8.7 Wire "Save" to `POST /api/vocabulary/meanings/:id` with optimistic UI update
- [x] 8.8 Wire "Save all" to `POST /api/vocabulary/words/:wordId/save-all`
- [x] 8.9 Render search results as a single canonical dictionary entry (`WordEntry` + `Sense`); replace the per-meaning Card layout. Senses grouped by part of speech, sub-senses indented under their parent number.

## 9. Frontend — Vocabulary Page

- [x] 9.1 Create `/vocabulary` page listing all saved meanings
- [x] 9.2 Each row shows: word text, definition preview, part of speech
- [x] 9.3 Implement remove button per meaning (calls DELETE, removes from list optimistically)
- [x] 9.4 Show empty state when vocabulary is empty

## 9b. Frontend — Home Dashboard + Navigation

- [x] 9b.1 Add Home (`/home`) dashboard: greeting, due-today CTA, stats grid (streak / saved / reviewed today / due today), Recently saved (top 5)
- [x] 9b.2 Add Home as the leftmost item in the global header navigation; redirect `/` to `/home` for authenticated users
- [x] 9b.3 Replace per-page Review counter (`ProgressHeader`) with in-session progress bar (`SessionProgress`) — bulk stats moved to /home
- [x] 9b.4 Standardise authenticated pages on the global `AppHeader` (Review page no longer ships its own composite header)
- [x] 9b.5 Post-login navigation lands on `/home` instead of `/search`

## 9c. Frontend — Visual Identity & Theme System

- [x] 9c.1 Introduce Lexis brand: SVG logo (phonetic-bracket monogram `/L/`) + italic serif wordmark; reusable `<Logo />` component
- [x] 9c.2 Header redesigned to 3-column grid: logo (left) · centered pill nav · actions (right); sticky with backdrop blur
- [x] 9c.3 Theme system expanded from 2 to 4: Light, Sepia, Dark, Midnight. Cycle button persists choice to localStorage (`lexis.theme`)
- [x] 9c.4 Typography: add `--font-serif` (Iowan/Charter/Georgia stack) for word display + headings; `--font-sans` for UI; `--font-mono` reserved
- [x] 9c.5 Atmospheric polish: focus ring, theme-aware shadows, smooth transitions (`--ease-out`, `--ease-spring`), hover lift on word entry, animated theme toggle
- [x] 9c.6 AuthForm uses the Logo component instead of bespoke "Learn English" heading

## 9d. Frontend — Layout System & Theme Completion

- [x] 9d.1 Add `Container` primitive with three width presets (narrow/default/wide) under `shared/ui/layout/`. Centralises max-width and responsive horizontal padding.
- [x] 9d.2 Migrate Home, Search, Vocabulary, Review pages off bespoke `max-width` declarations onto `Container`. Eliminates the visible width "jump" between routes.
- [x] 9d.3 Add responsive horizontal padding tokens — `--content-padding-x` widens on tablets (≥720px) and laptops (≥1024px) for editorial airiness.
- [x] 9d.4 Replace cycle-only theme toggle with a proper `ThemePicker` dropdown showing all four themes with labels + active checkmark; ESC + click-outside dismiss.
- [x] 9d.5 Honour `prefers-color-scheme: dark` for first-time visitors when no stored preference exists.
- [x] 9d.6 Honour `prefers-reduced-motion: reduce` globally — collapses animation/transition durations to ~0ms via a single `*` rule.

## 9e. Frontend — Theme Settings Page & Visual Polish

- [x] 9e.1 Refactor theme model to two axes — `mode: 'light' | 'dark' | 'system'` + per-mode variant (`lightVariant`, `darkVariant`). Resolved theme key (`light` | `sepia` | `dark` | `midnight`) derived deterministically.
- [x] 9e.2 Migrate legacy `lexis.theme` (single key) to new `lexis.theme.settings` (JSON) on first load; old key removed.
- [x] 9e.3 `system` mode listens to `prefers-color-scheme` via `matchMedia` and updates live without reload.
- [x] 9e.4 New `/settings` page: dedicated theme management UX with mode tiles + variant tiles + live preview swatch.
- [x] 9e.5 Header refinement — drop heavy nav-pill container; active link uses underline accent only. Settings gear icon replaces the in-header theme picker.
- [x] 9e.6 Search input: editorial typography (serif), focus ring with ambient glow, leading search-icon, integrated submit button.
- [x] 9e.7 Vocabulary item visual language matched to HomePage cards (serif word, hover lift, soft shadow).

## 10. Frontend — Review Page

- [x] 10.1 Create `/review` page; on load call `GET /api/review/due`
- [x] 10.2 Show session progress counter (X cards remaining)
- [x] 10.3 Render card front: word text + transcription, "Show answer" button
- [ ] 10.4 Render card back: definition, translation, part of speech, examples — definition, POS, examples implemented; translation N/A (not in domain model, English-only dictionary)
- [x] 10.5 Show four rating buttons: Again / Hard / Good / Easy
- [x] 10.6 On rating tap, call `POST /api/review/cards/:id/rate`, advance to next card
- [x] 10.7 Show completion screen when no cards remain, displaying next scheduled review date
- [x] 10.8 Fix `Unexpected end of JSON input` crash on Review page: shared API client treats HTTP 200 with empty body as `null` (NestJS serialises a `null` controller return that way)

## 11. PWA Configuration

- [x] 11.1 Install and configure `vite-plugin-pwa` (autoUpdate, skipWaiting, clientsClaim, cleanupOutdatedCaches)
- [x] 11.2 Add `manifest.webmanifest` — name "Lexis", standalone display, #1a0b2e theme/background, 5 icon sizes including maskable
- [x] 11.3 Generate PNG icons from brand SVG: 64×64, 192×192, 512×512, maskable-512×512, apple-touch-icon-180×180
- [x] 11.4 Configure Workbox: precache all JS/CSS/HTML/icons; NavigationFirst strategy for HTML nav; API calls intentionally excluded
- [x] 11.5 Add Apple PWA meta tags to index.html (apple-mobile-web-app-capable, status-bar-style, apple-mobile-web-app-title)
- [x] 11.6 Create `src/shared/pwa/usePwaInstall.ts` — hook for beforeinstallprompt, install(), dismiss()
- [x] 11.7 Add subtle install CTA to AppHeader: accent-bordered pill with install icon + dismiss button; fades in when installable
- [x] 11.8 Add standalone-mode CSS in index.css: safe-area insets, overscroll-behavior: none, tap highlight disabled
- [x] 11.9 Update README with PWA install instructions, local testing steps, iOS limitations

## 12. Integration & Validation

- [ ] 12.1 End-to-end smoke test: register → search word → save meaning → review card → rate card
- [ ] 12.2 Confirm cache hit: search same word twice; verify no second external API call (check DB fetched_at)
- [ ] 12.3 Verify SM-2 schedule: rate a card Good, check interval and next_review in DB
- [ ] 12.4 Verify cascade delete: remove a meaning from vocabulary, confirm card and review_logs are gone
- [ ] 12.5 Run backend unit tests (`npm test` in backend)
- [ ] 12.6 Fix any TypeScript or lint errors in both packages
