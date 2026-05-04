## Why

Learners who want to expand their English vocabulary lack a focused tool that combines intelligent word lookup with spaced repetition practice. Existing apps are either too generic or too complex for vocabulary building; this MVP fills that gap with a clean, mobile-first experience.

## What Changes

- New full-stack application (Next.js frontend + NestJS backend + PostgreSQL)
- Dictionary lookup with local caching to avoid redundant external API calls
- Personal vocabulary built from saved word meanings (not raw words)
- SRS-based flashcard review system (SM-2 algorithm)
- JWT authentication for user accounts

## Capabilities

### New Capabilities

- `user-auth`: Registration, login, and JWT-based session management
- `word-search`: Search English words; fetch from external dictionary API if not cached locally
- `user-vocabulary`: Save individual meanings to a personal vocabulary list
- `srs-review`: Spaced repetition flashcard review with Again / Hard / Good / Easy ratings and SM-2 scheduling

### Modified Capabilities

- *(none — greenfield project)*

## Impact

- **Database**: New PostgreSQL schema — User, Word, Meaning, Card, ReviewLog tables
- **External dependency**: Dictionary API (Free Dictionary API or Merriam-Webster); results cached in DB after first fetch
- **Frontend**: Next.js PWA — word search page, vocabulary page, review page
- **Backend**: NestJS REST API — auth, words, vocabulary, review endpoints
- **No breaking changes** (greenfield)
