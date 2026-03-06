FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
FROM base AS deps
WORKDIR /app

# Copy workspace manifests first (layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app

# Copy installed deps (entire workspace with node_modules)
COPY --from=deps /app ./
# Overlay full source
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Build only the web app and its dependencies
RUN npx turbo build --filter=web

# Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
