# syntax=docker/dockerfile:1
# Next.js + Prisma SQLite. Точка входа: gosu → nextjs, миграции перед стартом.

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates gosu \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV DATABASE_URL="file:./.docker-build.db"
RUN npx prisma generate && npm run build && rm -f .docker-build.db

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DATABASE_URL="file:./.npmci.db"
RUN npm ci --omit=dev && npx prisma generate && rm -f .npmci.db

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/src/generated ./src/generated

COPY docker/entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
  && chown -R nextjs:nodejs /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=50s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER root
ENTRYPOINT ["/docker-entrypoint.sh"]
