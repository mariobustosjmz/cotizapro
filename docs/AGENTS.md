# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

CotizaPro is a multi-tenant SaaS for HVAC/plumbing/service professionals to create, send, and track quotes. Built with Next.js 16 (App Router), React 19, TypeScript (strict mode), Supabase (Auth + PostgreSQL + Realtime), Stripe (billing), and TailwindCSS 4.

The app's UI and validation messages are in **Spanish (es-MX)**. Currency is MXN with 16% IVA tax.

## Build & Development Commands

```bash
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint (flat config, eslint.config.mjs)
npm run test:e2e         # Playwright E2E tests (headless, all browsers)
npm run test:e2e:headed  # Playwright E2E tests (headed mode)
npm run test:e2e:ui      # Playwright interactive UI mode
npx supabase start       # Start local Supabase instance
```

Run a single E2E test file:
```bash
npx playwright test e2e/specs/03-clients.spec.ts
```

Run a single test by name:
```bash
npx playwright test -g "test name pattern"
```

There is no unit test runner configured in package.json (Vitest is mentioned in docs but not installed). E2E via Playwright is the primary test mechanism.

## Architecture

### Routing & Rendering

Next.js App Router with three route groups:
- `app/(marketing)/` — Public landing page
- `app/(auth)/` — Login, signup, forgot-password, onboarding
- `app/(dashboard)/dashboard/` — All protected pages (clients, quotes, services, reminders, analytics, billing, team, settings)

**Server Components by default.** Only add `'use client'` when interactivity is needed. The dashboard layout (`app/(dashboard)/layout.tsx`) authenticates via `supabase.auth.getUser()` and fetches the user profile; if no profile exists, redirects to `/onboarding`.

### Authentication & Middleware

- `middleware.ts` runs on every request: checks payload size limits, then delegates to `lib/supabase/middleware.ts` which refreshes the Supabase session and redirects unauthenticated users away from protected routes.
- Public routes: `/`, `/login`, `/signup`, `/auth`, `/onboarding`.
- Server-side auth: `await createServerClient()` from `lib/supabase/server.ts`, then `supabase.auth.getUser()`. Never trust `getSession()` alone.
- Client-side auth: `createBrowserClient()` from `lib/supabase/client.ts`.

### Multi-Tenancy

Every data table has `organization_id`. The user's org is looked up via their `profiles` row. RLS policies enforce org isolation at the database level. Always include `organization_id` in inserts and filter by it in queries.

### API Route Pattern

All API routes follow this consistent pattern (see `app/api/clients/route.ts` as the canonical example):
1. Apply rate limiter (`lib/rate-limit.ts`)
2. Authenticate via `supabase.auth.getUser()`
3. Fetch user's `organization_id` from `profiles`
4. Validate input with Zod schemas from `lib/validations/cotizapro.ts`
5. Sanitize search input via `lib/search-sanitizer.ts` (escapes LIKE wildcards)
6. Execute Supabase query with explicit column selects and `.limit()`
7. Handle errors via `handleApiError()` from `lib/error-handler.ts`
8. Log via `logger` from `lib/logger.ts` (auto-redacts PII)

### Key Libraries

- **`lib/error-handler.ts`** — `ApiError` class with predefined error factories (`ApiErrors.UNAUTHORIZED()`, etc.) and `handleApiError()` for consistent JSON error responses. Also handles Supabase-specific error codes (PGRST116 for not found, 23505 for unique constraint).
- **`lib/rate-limit.ts`** — In-memory rate limiters. Pre-configured: `defaultApiLimiter` (100/15min), `strictAuthLimiter` (5/15min), `messageLimiter` (10/day). Rate limiting is **disabled** in non-production environments.
- **`lib/logger.ts`** — PII-safe logger that redacts emails, phone numbers, API keys, and JWTs. Use `logger.info/warn/error/security/api/database`.
- **`lib/stripe/index.ts`** — Lazy-initialized Stripe client via Proxy (avoids build-time errors when env vars are missing). Plan definitions (`PLANS`) are co-located here.
- **`lib/integrations/email.ts`** — Resend for email delivery. `lib/integrations/pdf.ts` — jsPDF for quote PDF generation.

### Validation

All Zod schemas live in `lib/validations/cotizapro.ts`. Domain types include: clients, services (categories: hvac/painting/plumbing/electrical/other), quotes with line items, reminders. Custom field definitions support dynamic form fields per entity type.

### Database

- Migrations in `supabase/migrations/` (numbered sequentially 001-012).
- Core tables: `organizations`, `profiles`, `clients`, `service_catalog`, `quotes`, `quote_items`, `quote_notifications`, `follow_up_reminders`, `custom_field_definitions`.
- Types in `types/database.types.ts` and `types/custom-fields.ts`.

### E2E Testing

Playwright config (`playwright.config.ts`):
- Tests in `e2e/specs/` (numbered 01-07)
- Page Object Model in `e2e/pages/` (extends `BasePage`)
- Fixtures in `e2e/fixtures/`, helpers in `e2e/helpers/`
- Global setup/teardown for database seeding
- Runs against chromium, firefox, webkit
- Auto-starts dev server in local mode

### UI Components

`components/ui/` contains shadcn/ui-based primitives (button, input, card, badge, label, textarea, form-field, data-table). `components/forms/` has `DynamicField` and `DynamicFieldsSection` for custom fields. `components/dashboard/` has layout pieces (sidebar, header, stats). `components/billing/` has `PlanSelector` and `BillingHistory`.

Path alias: `@/*` maps to the project root.

## Critical Rules

- **No emojis** in code or comments.
- **TypeScript strict mode** — no `any`, no implicit types.
- **Immutability** — use spread operator, never mutate objects/arrays.
- **Bounded queries** — all user-facing queries must include `.limit()`.
- **Explicit columns** — never `select('*')` in production code.
- **RLS enforcement** — never bypass Row-Level Security; always use the Supabase client (not service role) for user-scoped data.
- All schema changes go through `supabase/migrations/`.
- Commit messages follow conventional format: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`.

## Environment Variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`.

Optional (for WhatsApp/SMS): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
