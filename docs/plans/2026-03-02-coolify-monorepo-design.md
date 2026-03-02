# CotizaPro — Coolify Production Deployment Design

Date: 2026-03-02
Status: Approved

## Objective

Migrate CotizaPro from a flat Next.js app to a Turborepo monorepo and prepare it for production deployment on a Coolify-managed VPS using Supabase Cloud as the backend platform.

## Architecture Decision

- Application hosting: Coolify (self-hosted VPS)
- Backend: Supabase Cloud
- Build orchestration: Turborepo
- Reverse proxy / SSL: Coolify built-in (Traefik) — no nginx in container

## Repository Structure (target)

```
cotizapro/
├── apps/
│   └── web/                    # Next.js 16 app
│       ├── app/
│       ├── components/
│       ├── hooks/
│       ├── types/
│       ├── public/
│       ├── supabase/
│       ├── next.config.ts      # output: 'standalone' added
│       └── package.json
├── packages/
│   ├── auth/                   # Supabase client factories (browser + server + middleware)
│   │   └── src/
│   ├── db/                     # Supabase TypeScript types
│   │   └── src/
│   └── ui/                     # Shared shadcn/ui components
│       └── src/
├── Dockerfile                  # Updated for monorepo context
├── docker-compose.yml          # Local dev only, nginx removed
├── turbo.json
├── package.json                # Root workspace
└── .env.example
```

## Critical Fixes Required

| # | File | Change | Reason |
|---|------|--------|--------|
| 1 | `apps/web/next.config.ts` | Add `output: 'standalone'` | Dockerfile copies `.next/standalone` — build fails without this |
| 2 | `docker-compose.yml` | Remove nginx service | Coolify provides Traefik proxy + SSL — nginx is redundant and conflicting |
| 3 | `Dockerfile` | Update for monorepo build context | Must install root workspace deps, then build `apps/web` |
| 4 | `packages/auth/` | Extract `lib/supabase/` here | Spec requires auth logic outside app folder |
| 5 | `packages/ui/` | Extract `components/ui/` here | Shared component isolation |
| 6 | `packages/db/` | Extract Supabase types | Type sharing across packages |
| 7 | `turbo.json` | Create build pipeline config | Orchestrate builds across packages |
| 8 | Root `package.json` | Add workspaces config | Enable npm workspace linking |
| 9 | `.env.example` | Verify all Coolify vars present | Operator reference for Coolify dashboard |

## Coolify Deployment Model

Coolify deploys the single Next.js container:
- Build: Docker build from root `Dockerfile`
- Env vars: Set in Coolify dashboard (not in files)
- Health check: `GET /api/health` — already implemented
- SSL: Let's Encrypt via Coolify/Traefik
- Domain: Configured in Coolify service settings

## Packages Design

### packages/auth
Exports:
- `createBrowserClient()` — for client components
- `createServerClient()` — for server components, API routes, actions
- `updateSession()` — middleware session refresh

Dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `next`

### packages/db
Exports:
- TypeScript types generated from Supabase schema
- No runtime logic — types only

Dependencies: none (dev: `supabase` CLI types)

### packages/ui
Exports:
- All shadcn/ui components from `components/ui/`
- Shared utilities (`cn`, `cva`)

Dependencies: `tailwind-merge`, `class-variance-authority`, `clsx`, `lucide-react`

## Turbo Pipeline

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "lint": {},
    "type-check": {}
  }
}
```

## Dockerfile Strategy (monorepo)

Multi-stage:
1. `deps` stage: Install root workspace dependencies
2. `builder` stage: Run `turbo build --filter=web` (builds only app/web and its package deps)
3. `runner` stage: Copy `.next/standalone` from `apps/web`, set up non-root user, expose 3000

## Security Preserved

- All existing RLS policies: unchanged
- Auth separation (browser/server clients): maintained in `packages/auth`
- Security headers in `next.config.ts`: preserved
- No secrets in source code: env vars only via Coolify dashboard

## Out of Scope

- Redis caching layer (future)
- Background worker service (future)
- Edge CDN integration (future)
- Observability instrumentation (future)
