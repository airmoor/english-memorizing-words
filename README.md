# Lexis

Dictionary-first spaced repetition app for learning advanced English vocabulary.
Words are sourced from the Merriam-Webster Learner's Dictionary and reviewed via the SM-2 algorithm.

## Tech Stack

**Frontend:** React, Vite, TypeScript, TanStack Query, React Router, CSS Modules

**Backend:** NestJS, TypeORM, PostgreSQL, Passport (JWT via httpOnly cookie)

**Infrastructure:** Docker (PostgreSQL only)

## Project Structure

```
frontend/   React SPA — Feature-Sliced Design (pages / features / entities / shared)
backend/    NestJS REST API — auth, vocabulary, words, reviews
```

## Environment Variables

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/learnenglish

# JWT (required)
JWT_ACCESS_SECRET=change-me-secret

# JWT token lifetimes (optional — defaults shown)
ACCESS_TOKEN_TTL_SECONDS=900        # 15 minutes
REFRESH_TOKEN_TTL=2592000000        # 30 days, in ms

# App
PORT=3001
NODE_ENV=development

# Frontend URL — used to build password-reset links in emails
FRONTEND_URL=http://localhost:5173

# Merriam-Webster Learner's Dictionary API (optional)
# Register at: https://dictionaryapi.com/register/index
# Falls back to Free Dictionary API if unset.
MERRIAM_API_KEY=

# Transactional email (optional)
# Without it, password-reset emails are simulated (link logged to console).
RESEND_API_KEY=
```

Frontend has no `.env` file — it proxies `/api` to `localhost:3001` via Vite.

## Local Development

**Prerequisites:** Node 20+, npm, Docker

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Run database migrations
npm --workspace backend run migration:run

# 4. Start backend
npm --workspace backend run start:dev

# 5. Start frontend (separate terminal)
npm --workspace frontend run dev
```

## Services

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:5173         |
| Backend  | http://localhost:3001         |
| Swagger  | http://localhost:3001/api/docs |

## Scripts

**Backend** (`npm --workspace backend run <script>`):

| Script           | Description                        |
|------------------|------------------------------------|
| `start:dev`      | Start with file watching           |
| `migration:run`  | Apply all pending migrations       |
| `migration:revert` | Revert the last migration        |
| `test`           | Run tests                          |
| `lint`           | Lint source files                  |

**Frontend** (`npm --workspace frontend run <script>`):

| Script   | Description          |
|----------|----------------------|
| `dev`    | Start dev server     |
| `build`  | Production build     |
| `lint`   | Lint source files    |

## PWA

Lexis is installable as a Progressive Web App on desktop and mobile.

**Installing:**
- **Chrome/Edge/Android:** Address bar → install icon, or header "Install" button when available.
- **iOS Safari:** Share → "Add to Home Screen". The app runs in standalone (full-screen) mode.

**Testing locally:**

```bash
# Build production bundle (service worker is not active in dev mode)
npm --workspace frontend run build

# Preview the production build (handles SPA routing correctly)
npm --workspace frontend run preview
```

Then open `http://localhost:4173` in Chrome and check DevTools → Application → Service Workers.

> **Note:** Do not use `npx serve frontend/dist` without the `-s` flag — bare `serve` returns 404 for client-side routes (`/search`, `/review`, etc.) because it has no SPA fallback. Either use `vite preview` (recommended) or `npx serve -s frontend/dist`.

**Testing offline mode:**
1. Open the served build in Chrome.
2. DevTools → Network → set "Offline".
3. Reload — the app shell should load from cache.
4. API calls will fail (expected: auth/review data is never cached).

**Update strategy:**
The service worker uses `autoUpdate` with `skipWaiting` + `clientsClaim`. New deployments activate immediately across all open tabs with no stale-cache window.

**Known iOS limitations:**
- `beforeinstallprompt` is not supported on iOS — the header install button does not appear. Users must install via Share → "Add to Home Screen" manually.
- Push notifications require a separate Web Push setup (not yet implemented).
- `status-bar-style: black-translucent` requires the `viewport-fit=cover` viewport meta (already set).

## Architecture Notes

- **Dictionary-first model:** `words` → `meanings` → `examples`. Word lookup normalizes Merriam-Webster responses into this schema; transcription (IPA) lives on `words`.
- **SM-2 spaced repetition:** ratings (Again / Hard / Good / Easy) compute ease factor and next review date stored per card.
- **Auth:** JWT issued as an httpOnly cookie; all authenticated routes are guarded server-side.
- **Frontend architecture:** Feature-Sliced Design — `pages` orchestrate `features`, which contain API calls and UI. `shared/ui` holds the design system (Card variants, Typography, layout primitives).
- **Theme system:** Two-axis (mode × variant) with 11 themes. Tokens injected via CSS custom properties; glass surfaces use `backdrop-filter` selectively.
