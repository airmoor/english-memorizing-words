# Frontend image for the self-hosted deployment (iaxxai / podman).
#
# Build context is the REPO ROOT (see deploy/backend.Dockerfile for why):
#   podman build -f deploy/frontend.Dockerfile --build-arg VITE_API_URL= .
#
# VITE_API_URL is baked into the bundle at build time. On iaxxai the SPA and the
# API share one origin (Caddy routes /api/* to the backend), so it is built
# EMPTY and shared/api/base.ts falls back to a relative "/api".

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace frontend --include-workspace-root

COPY frontend/ frontend/

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace frontend


FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
# Stored as a template: nginx.conf declares `listen ${PORT}` and PORT is
# substituted at container start. Without PORT set the config becomes
# `listen ;` and nginx refuses to start, so the NixOS module always sets it.
COPY frontend/nginx.conf /etc/nginx/nginx.conf.template

EXPOSE 80

# envsubst '$PORT' substitutes only $PORT, leaving nginx's own $uri/$host alone.
CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
