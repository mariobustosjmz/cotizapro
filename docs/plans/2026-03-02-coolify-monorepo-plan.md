# CotizaPro — Coolify Monorepo Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate CotizaPro from a flat Next.js app to a Turborepo monorepo and make it production-ready for Coolify VPS deployment.

**Architecture:** Turborepo root with `apps/web` (Next.js) and `packages/auth`, `packages/db`, `packages/ui`. Packages export shared logic; `apps/web` re-exports via thin shims so existing `@/` imports require zero changes across 109 files. Coolify deploys the single Next.js container via an updated multi-stage Dockerfile.

**Tech Stack:** Next.js 16, Turborepo, npm workspaces, Docker multi-stage, Coolify/Traefik

---

## Pre-flight Checklist

Before starting, verify the dev server is stopped and git working tree is clean:

```bash
git status  # should show no unstaged changes
```

---

## Task 1: Add `output: 'standalone'` to next.config.ts

This is the single most critical fix. The existing Dockerfile copies `.next/standalone` but Next.js won't produce it without this config.

**Files:**
- Modify: `next.config.ts`

**Step 1: Open next.config.ts and add the standalone output config**

Add `output: 'standalone'` and `experimental.outputFileTracingRoot` (needed later for monorepo):

```typescript
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Required for monorepo: traces files from the repo root, not just apps/web
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  // ... rest of existing config unchanged
```

Note: `outputFileTracingRoot` uses `../../` because after the move this file lives at `apps/web/next.config.ts`. For now (flat structure) use `./` temporarily, then update in Task 8.

For now (still flat), add only `output: 'standalone'`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  headers: async () => {
    // ... existing headers unchanged
  },
};

export default nextConfig;
```

**Step 2: Verify the build produces standalone output**

```bash
npm run build
ls .next/standalone
```

Expected: directory `.next/standalone/` exists with `server.js` inside.

**Step 3: Commit**

```bash
git add next.config.ts
git commit -m "fix: add standalone output for Docker deployment"
```

---

## Task 2: Remove nginx from docker-compose.yml

Coolify provides its own Traefik reverse proxy and handles SSL via Let's Encrypt. The nginx service in docker-compose conflicts with this and is not needed.

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Edit docker-compose.yml — remove the nginx service and update the app service**

Replace the entire file with:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: cotizapro-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - TWILIO_WHATSAPP_FROM=${TWILIO_WHATSAPP_FROM}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - EMAIL_FROM=${EMAIL_FROM}
      - CRON_SECRET=${CRON_SECRET}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Note: `networks` block removed too — Coolify manages container networking.

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "fix: remove nginx from docker-compose, Coolify handles proxy"
```

---

## Task 3: Verify and complete .env.example

Coolify operators use `.env.example` as their reference when setting env vars in the Coolify dashboard.

**Files:**
- Modify or create: `.env.example`

**Step 1: Check current .env.example**

```bash
cat .env.example 2>/dev/null || echo "file not found"
```

**Step 2: Ensure .env.example contains ALL required variables**

The file must contain exactly this (with placeholder values, never real secrets):

```bash
# Supabase (Cloud)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio (WhatsApp notifications)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
CRON_SECRET=your_random_secret_for_cron_endpoint

# Node
NODE_ENV=production
```

**Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: complete env.example with all Coolify required vars"
```

---

## Task 4: Initialize Turborepo root workspace

Transform the repo root into a Turborepo workspace. The current `package.json` at root will become the workspace root (not the app's package.json).

**Files:**
- Modify: `package.json` (root)
- Create: `turbo.json`

**Step 1: Install turbo as a dev dependency**

```bash
npm install turbo --save-dev --workspace-root 2>/dev/null || npm install turbo --save-dev
```

**Step 2: Update root package.json**

Replace the scripts section and add workspaces. The root package.json should look like:

```json
{
  "name": "cotizapro-monorepo",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev --filter=web",
    "build": "turbo build --filter=web",
    "lint": "turbo lint",
    "type-check": "turbo type-check"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

Note: `test:e2e` scripts stay in `apps/web/package.json` after the move (Task 6).

**Step 3: Create turbo.json at repo root**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

**Step 4: Commit**

```bash
git add package.json turbo.json
git commit -m "feat: initialize Turborepo root workspace"
```

---

## Task 5: Create packages/auth

Extract Supabase client factories into a standalone package. The existing files in `lib/supabase/` move here. `apps/web/lib/supabase/` will become a thin re-export shim (Task 7).

**Files:**
- Create: `packages/auth/package.json`
- Create: `packages/auth/tsconfig.json`
- Create: `packages/auth/src/index.ts`
- Move (copy for now): `lib/supabase/client.ts` → `packages/auth/src/client.ts`
- Move (copy for now): `lib/supabase/server.ts` → `packages/auth/src/server.ts`
- Move (copy for now): `lib/supabase/middleware.ts` → `packages/auth/src/middleware.ts`

**Step 1: Create the directory structure**

```bash
mkdir -p packages/auth/src
```

**Step 2: Create packages/auth/package.json**

```json
{
  "name": "@cotizapro/auth",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "next": ">=15.0.0"
  },
  "dependencies": {
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.95.3"
  }
}
```

**Step 3: Create packages/auth/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Step 4: Copy lib/supabase/* to packages/auth/src/**

```bash
cp lib/supabase/client.ts packages/auth/src/client.ts
cp lib/supabase/server.ts packages/auth/src/server.ts
cp lib/supabase/middleware.ts packages/auth/src/middleware.ts
```

**Step 5: Create packages/auth/src/index.ts (barrel export)**

```typescript
export { createBrowserClient } from './client'
export { createServerClient } from './server'
export { updateSession } from './middleware'
```

Verify the actual function names exported by checking:

```bash
grep "^export" lib/supabase/client.ts lib/supabase/server.ts lib/supabase/middleware.ts
```

Adjust index.ts exports to match actual exported names.

**Step 6: Commit**

```bash
git add packages/auth/
git commit -m "feat: add packages/auth with Supabase client factories"
```

---

## Task 6: Create packages/db

A types-only package exposing Supabase database types. This has no runtime logic — only TypeScript interfaces.

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/src/index.ts`

**Step 1: Create directory**

```bash
mkdir -p packages/db/src
```

**Step 2: Create packages/db/package.json**

```json
{
  "name": "@cotizapro/db",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {}
}
```

**Step 3: Create packages/db/src/index.ts**

Check what's in `types/`:

```bash
ls types/
```

Create a barrel that re-exports from the existing types:

```typescript
// Re-exports Supabase and domain types
// These will be moved from apps/web/types/ in a future cleanup pass
export type { Database } from './database'
```

For now, create a minimal placeholder since types live in `types/` and will move during Task 8:

```typescript
// Placeholder — types currently live in apps/web/types/
// Move type definitions here as the monorepo matures
export {}
```

**Step 4: Commit**

```bash
git add packages/db/
git commit -m "feat: add packages/db placeholder for shared database types"
```

---

## Task 7: Create packages/ui

Extract shadcn/ui components into a shared UI package.

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`
- Copy: `components/ui/*.tsx` → `packages/ui/src/`
- Copy: `lib/utils.ts` → `packages/ui/src/utils.ts` (if it exists)

**Step 1: Create directory**

```bash
mkdir -p packages/ui/src
```

**Step 2: Check for lib/utils.ts**

```bash
cat lib/utils.ts 2>/dev/null || echo "not found"
```

**Step 3: Create packages/ui/package.json**

```json
{
  "name": "@cotizapro/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.564.0",
    "tailwind-merge": "^3.4.0"
  }
}
```

**Step 4: Copy components/ui/* to packages/ui/src/**

```bash
cp components/ui/*.tsx packages/ui/src/
cp lib/utils.ts packages/ui/src/utils.ts 2>/dev/null || true
```

**Step 5: Create packages/ui/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Step 6: Create packages/ui/src/index.ts — barrel export**

```bash
# Generate barrel from actual files
ls packages/ui/src/*.tsx | xargs -I{} basename {} .tsx
```

Create the barrel:

```typescript
export * from './badge'
export * from './button'
export * from './card'
export * from './data-table'
export * from './form-field'
export * from './input'
export * from './label'
export * from './pagination'
export * from './skeleton'
export * from './textarea'
export * from './toast'
export { cn } from './utils'
```

Adjust the list to match actual files from the `ls` output above.

**Step 7: Commit**

```bash
git add packages/ui/
git commit -m "feat: add packages/ui with shared shadcn components"
```

---

## Task 8: Move Next.js app to apps/web/

This is the largest task. All app source files move into `apps/web/`. Git history is preserved with `git mv`.

**Step 1: Create apps/web directory**

```bash
mkdir -p apps/web
```

**Step 2: Move app-level directories using git mv**

```bash
git mv app apps/web/app
git mv components apps/web/components
git mv hooks apps/web/hooks
git mv lib apps/web/lib
git mv types apps/web/types
git mv public apps/web/public
git mv supabase apps/web/supabase
git mv middleware.ts apps/web/middleware.ts
git mv next.config.ts apps/web/next.config.ts
git mv next-env.d.ts apps/web/next-env.d.ts
git mv tsconfig.json apps/web/tsconfig.json
git mv postcss.config.mjs apps/web/postcss.config.mjs
git mv components.json apps/web/components.json
git mv eslint.config.mjs apps/web/eslint.config.mjs
git mv playwright.config.ts apps/web/playwright.config.ts
git mv e2e apps/web/e2e
```

Also move scripts if they are app-specific:

```bash
git mv scripts apps/web/scripts 2>/dev/null || true
```

**Step 3: Create apps/web/package.json (the app's own package.json)**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "type-check": "tsc --noEmit",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  },
  "dependencies": {
    "@cotizapro/auth": "*",
    "@cotizapro/db": "*",
    "@cotizapro/ui": "*",
    "@radix-ui/react-label": "^2.1.8",
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.95.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "html-entities": "^2.6.0",
    "jspdf": "^4.1.0",
    "jspdf-autotable": "^5.0.7",
    "lucide-react": "^0.564.0",
    "next": "16.1.6",
    "radix-ui": "^1.4.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "recharts": "^3.7.0",
    "resend": "^6.9.2",
    "stripe": "^20.3.1",
    "tailwind-merge": "^3.4.0",
    "twilio": "^5.12.1",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@playwright/test": "^1.45.0",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "dotenv": "^17.3.1",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "shadcn": "^3.8.4",
    "tailwindcss": "^4",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5"
  }
}
```

**Step 4: Update apps/web/tsconfig.json — add package path aliases**

Replace the paths section:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@cotizapro/auth": ["../../packages/auth/src/index.ts"],
      "@cotizapro/db": ["../../packages/db/src/index.ts"],
      "@cotizapro/ui": ["../../packages/ui/src/index.ts"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

**Step 5: Update apps/web/next.config.ts — add outputFileTracingRoot and transpilePackages**

```typescript
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  transpilePackages: ['@cotizapro/auth', '@cotizapro/db', '@cotizapro/ui'],
  headers: async () => {
    // ... existing headers unchanged
  },
};

export default nextConfig;
```

**Step 6: Stage all moved files**

```bash
git add apps/web/package.json
git add apps/web/tsconfig.json
git add apps/web/next.config.ts
```

**Step 7: Commit the move**

```bash
git commit -m "feat: move Next.js app to apps/web (Turborepo monorepo)"
```

---

## Task 9: Create re-export shims (preserve all existing imports)

The 63 files importing from `@/lib/supabase/` and 46 from `@/components/ui/` must continue to work without modification. The shim approach re-exports from the packages.

**Files:**
- Modify: `apps/web/lib/supabase/client.ts` (shim)
- Modify: `apps/web/lib/supabase/server.ts` (shim)
- Modify: `apps/web/lib/supabase/middleware.ts` (shim)

**Step 1: Replace lib/supabase/client.ts with a shim**

```typescript
// Shim: re-exports from @cotizapro/auth package
export { createBrowserClient } from '@cotizapro/auth'
```

**Step 2: Replace lib/supabase/server.ts with a shim**

```typescript
// Shim: re-exports from @cotizapro/auth package
export { createServerClient } from '@cotizapro/auth'
```

**Step 3: Replace lib/supabase/middleware.ts with a shim**

```typescript
// Shim: re-exports from @cotizapro/auth package
export { updateSession } from '@cotizapro/auth'
```

Verify the exact exported function names first:

```bash
grep "^export" apps/web/lib/supabase/client.ts apps/web/lib/supabase/server.ts apps/web/lib/supabase/middleware.ts
```

Adjust shim exports to match.

**Step 4: Commit**

```bash
git add apps/web/lib/supabase/
git commit -m "feat: add re-export shims for backwards-compatible imports"
```

---

## Task 10: Update Dockerfile for monorepo

The Dockerfile must now install from the workspace root, use turbo to build only the web app, and copy standalone output from `apps/web/.next/standalone`.

**Files:**
- Modify: `Dockerfile`

**Step 1: Replace Dockerfile with monorepo-aware version**

```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

# Install dependencies
FROM base AS deps
WORKDIR /app

# Copy workspace manifests first (layer caching)
COPY package.json package-lock.json* turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/

RUN npm ci

# Build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
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

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Step 2: Commit**

```bash
git add Dockerfile
git commit -m "feat: update Dockerfile for Turborepo monorepo"
```

---

## Task 11: Install workspace dependencies and verify build

**Step 1: Install from workspace root**

```bash
cd /repo/root  # wherever your monorepo root is
npm install
```

**Step 2: Run the build via turbo**

```bash
npm run build
```

Expected output includes turbo build log, then Next.js build summary. Watch for:
- `✓ Compiled successfully`
- `.next/standalone` directory created in `apps/web/`

If the build fails, check:
- Missing path aliases: update `apps/web/tsconfig.json`
- Missing package exports: check `packages/auth/src/index.ts` barrel
- TypeScript errors: run `npx tsc --noEmit` in `apps/web/`

**Step 3: Verify standalone output exists**

```bash
ls apps/web/.next/standalone/
```

Expected: `server.js` exists.

**Step 4: Test health endpoint locally (optional)**

```bash
npm run dev  # in apps/web
curl http://localhost:3000/api/health
```

Expected: `{"status":"healthy",...}`

**Step 5: Commit if no errors**

```bash
git add package-lock.json
git commit -m "chore: install monorepo workspace dependencies"
```

---

## Task 12: Verify Docker build locally

**Step 1: Build the Docker image**

```bash
docker build -t cotizapro-test .
```

Watch for each stage completing. If the builder stage fails, read the error — most common issues:
- Turbo not found: add `npx` prefix or install turbo at root
- Standalone not at expected path: check `apps/web/.next/standalone`

**Step 2: Run the container locally to test**

```bash
docker run --rm \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
  -e NODE_ENV=production \
  cotizapro-test
```

**Step 3: Hit the health endpoint**

```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"healthy","checks":{"database":{"status":"ok"},"environment":{"status":"ok"}},...}`

If `database` check shows `error`, verify SUPABASE env vars are correct in the run command.

**Step 4: Stop the container and commit nothing** (just verification)

```bash
docker stop $(docker ps -q --filter ancestor=cotizapro-test) 2>/dev/null || true
```

---

## Task 13: Coolify Configuration Reference

This task is documentation-only. No code changes.

**Coolify Service Setup (do in Coolify dashboard):**

1. Create new resource → Docker Compose or Dockerfile
2. Connect your Git repository
3. Set build context: `/` (repo root)
4. Set Dockerfile path: `./Dockerfile`
5. Set port: `3000`

**Environment variables to set in Coolify dashboard:**

Copy all vars from `.env.example` and fill in real values:

```
NEXT_PUBLIC_SUPABASE_URL=https://yourref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
CRON_SECRET=random_secret_here
NODE_ENV=production
```

**Health check in Coolify:**
- Path: `/api/health`
- Interval: 30s
- Unhealthy threshold: 3 failures

**Stripe webhook:**
After domain is live, go to Stripe dashboard → Webhooks → Add endpoint:
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events: `customer.subscription.*`, `invoice.*`, `checkout.session.completed`

---

## Task 14: Final commit and tag

**Step 1: Verify git log shows clean history**

```bash
git log --oneline -15
```

**Step 2: Create a release tag**

```bash
git tag v1.0.0-coolify-ready
```

**Step 3: Push to remote**

```bash
git push origin main --tags
```

---

## Rollback Plan

If the monorepo migration causes issues, the flat-app critical fixes (Tasks 1-3) are independent and can be kept:

```bash
git revert HEAD~N  # revert monorepo tasks keeping Tasks 1-3
```

The minimum viable Coolify deployment requires only:
- Task 1 (`output: 'standalone'`)
- Task 2 (remove nginx from docker-compose)
- Task 3 (.env.example)

Everything else is structural improvement.

---

## Summary of Changes

| Task | Change | Risk |
|------|--------|------|
| 1 | `output: 'standalone'` in next.config | Low — config only |
| 2 | Remove nginx from docker-compose | Low — Coolify replaces it |
| 3 | Complete .env.example | Zero — docs only |
| 4 | Turborepo root setup | Medium — affects build scripts |
| 5-7 | Create packages/auth, db, ui | Medium — new packages |
| 8 | Move app to apps/web/ | High — large file move |
| 9 | Re-export shims | Low — no logic change |
| 10 | Update Dockerfile | Medium — build critical |
| 11-12 | Build verification | Zero — verification only |
| 13 | Coolify config reference | Zero — docs only |
