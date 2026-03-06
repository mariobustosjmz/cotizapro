# Architecture Decision Records (ADRs)

## ADR-001: Next.js 15 App Router

**Decision:** Use Next.js 15 with App Router instead of Pages Router.

**Rationale:**
- Server Components reduce client JS bundle by default
- Nested layouts enable shared auth/org context without prop drilling
- Server Actions for mutations without separate API routes
- Streaming and Suspense for better UX on slow queries

---

## ADR-002: Supabase for Backend

**Decision:** Use Supabase (PostgreSQL + Auth + RLS) instead of a custom backend.

**Rationale:**
- RLS handles multi-tenant isolation at the DB level — no application-level filtering needed
- Auth is managed (JWT, refresh, email verification)
- Realtime subscriptions built-in
- Reduces infrastructure surface area significantly

---

## ADR-003: Turborepo Monorepo

**Decision:** Use Turborepo + pnpm workspaces instead of separate repos.

**Rationale:**
- `packages/ui`, `packages/db`, `packages/auth` are shared across potential future apps
- Turbo caches build outputs — faster CI
- Single source of truth for types and DB schema

---

## ADR-004: Docker Standalone Build

**Decision:** Use Next.js `output: 'standalone'` with `outputFileTracingRoot` at monorepo root.

**Rationale:**
- Minimal Docker image (only required files copied)
- `outputFileTracingRoot` ensures monorepo packages are traced correctly
- Trade-off: server entry point is `apps/web/server.js` (not root), must be explicit in Dockerfile CMD

---

## ADR-005: Coolify for Hosting

**Decision:** Self-hosted Coolify on VPS instead of Vercel.

**Rationale:**
- Cost control for early stage (Vercel serverless costs unpredictable at scale)
- Full container control for background jobs, cron, etc.
- Trade-off: no Vercel Edge Network CDN — consider Cloudflare proxy for static assets

---

## ADR-006: Rate Limiting Skipped in Development

**Decision:** `lib/rate-limit.ts` skips rate limiting when `NODE_ENV !== 'production'`.

**Rationale:**
- E2E tests (338 tests) would hit rate limits locally causing false failures
- Rate limiting is enforced in production where it matters
- Explicitly documented to avoid confusion when reviewing the code

---

## ADR-007: Spanish UI, English Code

**Decision:** User-facing strings in Spanish, all code identifiers in English.

**Rationale:**
- Target market is Spanish-speaking HVAC businesses in Mexico
- English identifiers maintain compatibility with libraries, tools, and AI assistance
- DB constraint values are English (`fixed`, `per_hour`) — Spanish only in display labels
