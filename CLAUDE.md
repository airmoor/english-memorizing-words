# CLAUDE.md — lexly ("Lexis")

Dictionary-first spaced-repetition app for advanced English vocabulary.
Words come from the Merriam-Webster Learner's Dictionary; review scheduling is SM-2.

## Shape of the repo

npm **workspaces monorepo**. The only lockfile is `package-lock.json` at the root —
`backend/` and `frontend/` have none, so nothing can `npm ci` from inside a workspace.

| Path | What |
|---|---|
| `backend/` | NestJS 10 + TypeORM 0.3 + Postgres. REST under `/api`; `/health` is deliberately outside that prefix |
| `backend/src/database/migrations/` | 21 TypeORM migrations. `synchronize: false` — schema changes ONLY via migrations |
| `backend/src/auth/` | JWT access token (in memory) + opaque single-use refresh token in an httpOnly cookie |
| `backend/src/pronunciations/` | provider cascade Merriam → Free Dictionary → Polly, then storage |
| `backend/src/reviews/sm2.ts` | the SM-2 algorithm |
| `frontend/` | React 19 SPA, Vite 8, PWA, TanStack Query, Feature-Sliced Design |
| `deploy/` | Dockerfiles for our own server. **Build context is the repo root** |
| `.forgejo/workflows/` | CI on git.iaxx.ai |

## Local development — unchanged by the deployment work

```bash
npm install
docker compose up -d                       # Postgres only
npm --workspace backend run migration:run
npm --workspace backend run start:dev      # :3001
npm --workspace frontend run dev           # :5173, proxies /api to :3001
```
`docker-compose.dev.yaml` brings up the whole stack incl. MinIO.
`backend/Dockerfile`, `frontend/Dockerfile` and `Dockerfile.dev` target Railway/local
and are **not** what the server builds — leave them alone unless that is the goal.

Tests: `npm --workspace backend run test` (Jest, 275) · `npm --workspace frontend run test` (Vitest, 92).

⚠️ `npm --workspace backend run lint` has never worked in this repo — there is no ESLint
config in `backend/` and ESLint 10 requires flat config. `frontend` lints but reports
~29 pre-existing `react-hooks` errors. Neither is a regression; don't "fix" them
in passing.

## Deployment (iaxxai)

Live at **https://dev.lexly.club** — tailnet-only, not reachable from the internet.
Production (`app.lexly.club`) is **not provisioned**; `deploy-prod.yml` exists but its
deploy step will fail until it is.

- Push to `main` → `deploy-dev.yml` builds both images, pushes to the Forgejo registry
  and pokes the deploy-agent. Never call the workflow by hand for a normal change.
- Push to `iaxx`, not `origin`: `git push iaxx main`. GitHub is a mirror.
- Server-side config lives in the **iaxx** repo, `nixos/apps/lexly.nix` — uid 5013,
  DB `lexly`, ports 9300 (api) / 9301 (web).

**One origin.** Caddy routes `/api/*` and `/health` to the backend, `/audio/*` to files
on disk, everything else to the frontend. So `VITE_API_URL` is built **empty** and
`shared/api/base.ts` falls back to a relative `/api`. Don't set it — a non-empty value
would reintroduce cross-origin cookies for no reason.

### Environment, and the three switches that pick a backend

| Var | Effect |
|---|---|
| `DATABASE_SSL` | TLS to Postgres. **Must stay false on the server** — it reaches Postgres over a unix socket, which answers the SSLRequest with `N`, and node-pg then aborts instead of falling back. It is not implied by `NODE_ENV` any more |
| `PRONUNCIATION_STORAGE_DIR` | set → audio goes to the local filesystem and S3 is skipped entirely. Unset → MinIO/S3 as before |
| `SMTP_HOST`+`SMTP_USER`+`SMTP_PASSWORD` | set → mail over SMTP. Unset → Resend if `RESEND_API_KEY`, else the reset link is only logged |

Every pronunciation provider — Merriam and Free Dictionary included, not just Polly —
puts its audio through `StorageService.put()` and stores **our** URL in
`word_pronunciations.audio_url`. So storage is not optional: with none configured,
pronunciation does not work at all.

Polly is deliberately not configured on the dev stand (it needs paid AWS credentials).
Words that neither dictionary has simply report no audio.

## Gotchas worth knowing

- `deploy/backend.Dockerfile` runs `typeorm migration:run` in its `CMD`. Plain
  `node dist/main.js` would start against an un-migrated database — that is the trap
  `backend/Dockerfile` falls into.
- The frontend container **requires** `PORT`. `nginx.conf` is a template with
  `listen ${PORT}`; unset, `envsubst` produces `listen ;` and nginx refuses to start.
- Mail from the container goes to `mail.iaxx.ai:465`, not 587 — 587 is not open on the
  podman bridge, and reaching the host's public IP hairpins in a way that never returns
  the SMTP banner.
- Cookies are `SameSite=None; Secure` in production, so the app only works over HTTPS.
