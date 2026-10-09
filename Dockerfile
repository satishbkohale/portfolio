# syntax=docker/dockerfile:1
#
# Satish Kohale portfolio: static Astro site served with its production
# security headers (public/_headers) by scripts/serve-dist.mjs.
#
#   docker build -t satish-kohale-portfolio .
#   docker run --rm -p 8080:8080 satish-kohale-portfolio
#   open http://localhost:8080
#
# Build args:
#   SITE_URL  absolute URL the site will be served at (canonical links, sitemap,
#             security.txt). Default http://localhost:8080.
# Runtime env:
#   PORT (8080), HTTPS_HEADERS=1 when TLS is terminated by a proxy in front,
#   so HSTS and upgrade-insecure-requests are sent as on Cloudflare.

ARG NODE_VERSION=24

# ---------------------------------------------------------------------------
# 1. Build: install with the repo's supply-chain rules, production build, checks.
#    Debian (glibc) rather than Alpine: wrangler's workerd binary needs glibc.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app

RUN npm install --global pnpm@12.10.1 && npm cache clean --force

# Dependencies first, so this layer is cached until the lockfile changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG SITE_URL=http://localhost:8080
ENV ASTRO_TELEMETRY_DISABLED=1
# Production build: drafts removed, dist checks enforced. A localhost SITE_URL
# is allowed only for local images.
RUN case "$SITE_URL" in http://localhost*|http://127.0.0.1*) export ALLOW_LOCALHOST_SITE=1 ;; esac; \
    SITE_URL="$SITE_URL" pnpm build:prod

# ---------------------------------------------------------------------------
# 2. Runtime: Node on Alpine, only dist/ and the server script, non-root.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime

# Package managers are not needed at runtime: remove them (smaller attack surface).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    HTTPS_HEADERS=0

WORKDIR /srv
# Owned by root and read-only for the app user.
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts/serve-dist.mjs ./serve-dist.mjs

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/" || exit 1

CMD ["node", "serve-dist.mjs"]
