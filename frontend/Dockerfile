FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_URL is baked into the JS bundle at build time.
# Railway passes this as a build variable — do not hardcode.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
# Stored as a template — PORT is substituted at container start by the CMD below
COPY nginx.conf /etc/nginx/nginx.conf.template
# envsubst '$PORT' substitutes only $PORT, leaving nginx variables like $uri untouched
CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
