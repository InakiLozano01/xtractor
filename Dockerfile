# ---- base ----
FROM node:26.12.1-alpine@sha256:9bd229b644e391df00fb989efa732335aefc6170a05d8c163c5c8ca9870da401 AS base
RUN apk upgrade --no-cache
RUN apk add --no-cache openssl \
 && wget -qO /tmp/npm.tgz https://registry.npmjs.org/npm/-/npm-12.2.0.tgz \
 && test "$(openssl dgst -sha512 -binary /tmp/npm.tgz | openssl base64 -A)" = 'ZsJjKpTnlmSXOLLXiU1xDCzC4Wlok4IwZmh/aw2KUuXytU7q6qMv/cUT7MoeSf95Slwuw/lRXYefGzGCspHPNQ==' \
 && npm install --global /tmp/npm.tgz --ignore-scripts --no-audit --no-fund \
 && rm /tmp/npm.tgz \
 && test "$(npm --version)" = 12.2.0
RUN npm install --global pnpm@12.14.0 --allow-scripts=pnpm --no-audit --no-fund
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps ----
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- typecheck (fails the build on TS errors) ----
FROM deps AS typecheck
WORKDIR /app
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_BUILD_WORKERS=1
RUN npm run typecheck

# ---- builder ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_URL=https://xtractor.inakilozano.com
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_BUILD_WORKERS=1
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked npm run build \
 && node .docker/trace-runtime.mjs scripts/migrate.mjs scripts/seed-admin.mjs

# ---- runner ----
FROM base AS runner
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/lib/node_modules/pnpm /usr/local/lib/node_modules/yarn /root/.cache/node/corepack /opt/yarn-* \
 && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx /usr/local/bin/yarn /usr/local/bin/yarnpkg
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache bash
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
RUN chmod +x ./scripts/entrypoint.sh
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1
CMD ["./scripts/entrypoint.sh"]
