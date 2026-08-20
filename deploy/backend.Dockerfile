# Backend image for the self-hosted deployment (iaxxai / podman).
#
# Build context is the REPO ROOT, not backend/: this is an npm-workspaces
# monorepo and the only lockfile lives at the root, so `npm ci` cannot run from
# inside backend/ at all. Build with:
#   podman build -f deploy/backend.Dockerfile .
#
# Kept separate from backend/Dockerfile on purpose — that one targets Railway
# and is still what local tooling expects.

FROM node:22-alpine AS builder
WORKDIR /app

# Manifests first so the dependency layer is cached independently of source.
# All workspace manifests are required: npm ci validates the lockfile against
# every workspace declared in the root package.json, and fails if one is absent.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace backend --include-workspace-root

COPY backend/ backend/
RUN npm run build --workspace backend


FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root \
    && npm cache clean --force

COPY --from=builder --chown=node:node /app/backend/dist ./backend/dist

USER node
WORKDIR /app/backend

# The app binds $PORT; this is documentation, and matches the port the NixOS
# module publishes.
EXPOSE 9300

# Migrations must run before the app boots — `node dist/main.js` alone would
# start against an un-migrated database. This mirrors the package.json
# `start:prod` script. `npx` resolves the locally installed typeorm binary by
# walking up to the hoisted node_modules; `exec` hands PID 1 to node afterwards
# so SIGTERM from podman reaches the server directly.
CMD ["sh", "-c", "npx typeorm migration:run -d dist/data-source.js && exec node dist/main.js"]
