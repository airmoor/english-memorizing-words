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

# JWT
JWT_SECRET=change-me-secret

# App
PORT=3001
NODE_ENV=development

# Merriam-Webster Learner's Dictionary API (optional)
# Register at: https://dictionaryapi.com/register/index
# Falls back to Free Dictionary API if unset.
MERRIAM_API_KEY=
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
| Swagger  | http://localhost:3001/api     |

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

## Architecture Notes

- **Dictionary-first model:** `words` → `meanings` → `examples`. Word lookup normalizes Merriam-Webster responses into this schema; transcription (IPA) lives on `words`.
- **SM-2 spaced repetition:** ratings (Again / Hard / Good / Easy) compute ease factor and next review date stored per card.
- **Auth:** JWT issued as an httpOnly cookie; all authenticated routes are guarded server-side.
- **Frontend architecture:** Feature-Sliced Design — `pages` orchestrate `features`, which contain API calls and UI. `shared/ui` holds the design system (Card variants, Typography, layout primitives).
- **Theme system:** Two-axis (mode × variant) with 11 themes. Tokens injected via CSS custom properties; glass surfaces use `backdrop-filter` selectively.
