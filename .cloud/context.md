# Project Context — CotizaPro

## Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript 5.x, TailwindCSS 3.x
- **Backend:** Next.js API routes (server-side), Supabase (PostgreSQL + Auth + RLS)
- **Auth:** Supabase Auth with JWT, Row-Level Security on all tables
- **Billing:** Stripe (subscriptions, webhooks)
- **Hosting:** Coolify (self-hosted, VPS), Traefik (TLS), Docker standalone
- **Monorepo:** Turborepo + pnpm workspaces

## Purpose
CotizaPro is a multi-tenant SaaS for HVAC and service businesses to manage clients, create quotes, track payments, schedule work, and analyze income. Each organization's data is fully isolated via Supabase RLS using `organization_id`.

## Key Patterns
- **API routes:** `/apps/web/app/api/**` — all return `{ data, error }` or `{ success, error }`
- **Validation:** Zod schemas in `apps/web/lib/validations/cotizapro.ts`
- **Error handling:** `apps/web/lib/error-handler.ts` — `handleApiError()`, `validationErrorResponse()`
- **Auth:** `createServerClient()` (server), `createBrowserClient()` (client) from `@supabase/ssr`
- **DB tables:** `clients`, `service_catalog`, `quotes`, `quote_items`, `quote_payments`, `work_events`, `quote_templates`, `profiles`, `organizations`
- **unit_type values:** `fixed | per_hour | per_sqm | per_unit` (DB constraint — never Spanish labels)
- **Numeric columns:** Return as strings from Supabase — always cast with `Number()`
- **UUID:** Use `gen_random_uuid()` in migrations (never `uuid_generate_v4()`)

## Critical Rules
- NEVER bypass RLS — all queries use the Supabase client with user context
- NEVER use `select('*')` — always explicit column lists
- NEVER trust client-side price data — fetch from Stripe/DB server-side
- NEVER hardcode secrets — use environment variables
- NEVER mutate objects — use spread/immutable patterns
- All schema changes go in `supabase/migrations/` — never modify DB directly
- `packages/ui/tsconfig.json` must include `"lib": ["dom", "dom.iterable", "ES2020"]`
- Docker standalone: server is at `apps/web/server.js` (not root `server.js`)

## Deployment
- Platform: Coolify at `http://srv1449341.hstgr.cloud:8000`
- App UUID: `esgc800c8g88c0kk400gwcww`
- Live URL: https://esgc800c8g88c0kk400gwcww.46.202.176.7.sslip.io
- GitHub: https://github.com/mariobustosjmz/cotizapro

## Demo Account
- Email: `demo@climasol.mx` / Password: `ClimaSol2026!`
- Org: ClimaSol HVAC, org_id: `00000000-0000-0000-0000-000000000002`
