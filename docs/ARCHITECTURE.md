# Architecture — CotizaPro

## Overview

CotizaPro is a multi-tenant SaaS for service businesses (HVAC, etc.) to manage clients, quotes, payments, calendar, and analytics.

## Monorepo Structure

```
my-saas-app/
├── apps/
│   └── web/              # Next.js 15 App Router (main application)
├── packages/
│   ├── auth/             # Shared auth utilities
│   ├── db/               # Supabase client + schema types
│   └── ui/               # Shared UI components (shadcn/ui)
├── deploy/               # Docker, nginx, compose
├── tools/                # Dev scripts
├── docs/                 # This folder
├── supabase/             # DB migrations and seed
└── .cloud/               # AI agent context
```

## Layer Responsibilities

### `apps/web/app/`
Pages and API routes. Pages are Server Components by default. Client components use `'use client'`.

### `apps/web/app/api/`
REST API routes. All handlers:
1. Validate with Zod (`lib/validations/cotizapro.ts`)
2. Authenticate via `getUser()` (never trust `getSession()`)
3. Enforce org isolation via RLS (Supabase client carries JWT)
4. Return `{ data, error }` or use `handleApiError()`

### `apps/web/components/`
Reusable UI components. `ui/` = shadcn primitives, `dashboard/` = feature components.

### `apps/web/lib/`
- `supabase/` — client factories (server vs browser)
- `validations/cotizapro.ts` — all Zod schemas
- `error-handler.ts` — centralized error handling
- `rate-limit.ts` — production-only rate limiting

### `packages/db/`
Supabase type generation and shared DB client config.

### `supabase/migrations/`
All schema changes. Sequential numbered files. Never modify DB directly.

## Auth Flow

1. User logs in via Supabase Auth (email/password)
2. JWT issued with `organization_id`, `role` in claims
3. `middleware.ts` refreshes token on every request
4. Server components use `createServerClient()` — reads cookies
5. RLS policies enforce `organization_id` isolation at DB level

## Multi-Tenancy

Every user-data table has `organization_id UUID NOT NULL`. RLS policies:
```sql
USING (organization_id = auth.jwt()->>'organization_id')
```
This ensures complete data isolation without any application-level filtering.

## Key DB Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Root tenant entity |
| `profiles` | User profile extending auth.users |
| `clients` | Customer records |
| `service_catalog` | Service/product catalog |
| `quotes` | Quote header |
| `quote_items` | Line items per quote |
| `quote_payments` | Payment records per quote |
| `work_events` | Work calendar entries |
| `quote_templates` | Reusable quote templates |

## Deployment

Deployed on Coolify (self-hosted) as a Docker container using Next.js standalone output.
See `deploy/Dockerfile` for the multi-stage build.

Critical: with `outputFileTracingRoot` pointing to monorepo root, the standalone server
is at `apps/web/server.js` — not `server.js` at root.
