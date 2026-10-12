# CotizaPro Plataforma Implementation Plan

> **For agentic workers:** Executed natively in the authoring session (autonomous mode authorized via `/loop`). Steps use checkbox (`- [ ]`) syntax. No commits: the user's global rule forbids auto-commit; every task ends with "stage nothing, record in ledger".

**Goal:** Stabilize CotizaPro, deploy it on the shared Hostinger VPS, and add the block-based pricing engine, trade templates and the public showcase.

**Architecture:** Pure TypeScript engine package (`@cotizapro/quoting`) used client-side for preview and server-side as the source of truth. Supabase migrations 033–034 add account type, price lists, configurable products and showcase tables; anonymous access only through SECURITY DEFINER RPCs. Next.js 16 App Router pages consume both. Production runs a dedicated reduced Supabase stack plus the Next.js container behind the shared Caddy.

**Tech Stack:** Next.js 16.1, React 19, TypeScript 5 strict, Zod 4, Supabase (Postgres 17, GoTrue, PostgREST 14, Storage, Realtime), Vitest 3, Playwright 1.5x, Docker Compose, Caddy 2.

**Spec:** `docs/superpowers/specs/2026-10-11-cotizapro-plataforma-design.md`

## Global Constraints

- No `any`, no implicit types; immutable updates only; functions < 50 lines; files < 400 lines (existing 891-line quote page must not grow).
- No native `<select>`: use `components/ui/combobox.tsx`. Required labels end in ` *`. Cancel left, submit right, both `flex-1`.
- Explicit column lists in every `select()`, `.limit()` on user-facing queries, never `select('*')`.
- Server recomputes every configurable item with `evaluateProduct`; client-sent prices are ignored.
- Anonymous endpoints never use the service role; they call `get_public_profile`, `submit_quote_request`, `get_review_request`, `submit_review`.
- New migrations use `gen_random_uuid()` and start at `033`.
- Money in cents inside the engine; DB stays `DECIMAL(10,2)`.
- VPS coexistence rule §0: read real state, dated backup, smoke all domains before/after, only touch `# >>> cotizapro` block, prefixed service names `cotizapro-*`.
- Never commit or push; never print secrets in chat.

## Review Focus

1. **Price list missing a combination** (e.g. filtrasol 12 mm): the form must show the engine error inline and block saving, not save a $0 item. Test in Task 5 (`ConfigurableItemForm` shows error; API returns 422).
2. **Stale price snapshot**: editing a price list must not change totals of already-saved quotes. Test in Task 4 (API test: save, change list, reload quote → same subtotal).
3. **Review link reuse / forging**: a used or expired token must render "ya enviada"/"expirada" and `submit_review` must reject it. Test in Task 9 (E2E `23-review-flow`).
4. **Spam on "Pedir cotización"**: 6th request within an hour from the same IP must get 429 with a friendly message. Test in Task 10 (route test with mocked RPC error `rate_limited`).
5. **Unpublished profile or private photo leakage**: `/p/<slug>` of an unpublished profile returns 404 and private photos are not signed for anon. Test in Task 8 (SQL test via psql as `anon`).

---

### Task 1: Fase 0 — Baseline, test debt and repo hygiene

**Files:**
- Modify: `.gitignore` (add `.turbo/`, `**/dist/`, `.playwright-mcp/`, `apps/web/test-results/`, `apps/web/playwright-report/`, root `*.png` screenshots)
- Modify: `apps/web/e2e/pages/reminders.page.ts` (Combobox instead of native select)
- Modify: other page objects that still wait for `select[name=...]` (discovered from the baseline run)
- Modify: `apps/web/supabase/migrations/032_ensure_templates_seed.sql` (column typo, already done; Gate 2 pending)

- [ ] Run baseline: `PLAYWRIGHT_TEST_BASE_URL=http://localhost:3100 pnpm exec playwright test --reporter=line` → record pass/fail per spec in ledger.
- [ ] For each failure classify: test debt (selector drift) vs product bug. Product bugs: reproduce, document, do not fix without Gate 1.
- [ ] Fix test debt using the combobox pattern: click `input[placeholder^="Selecciona"]`, type, click `[role="option"]`.
- [ ] Re-run the affected specs until green.

### Task 2: Engine package `@cotizapro/quoting` (DONE)

**Files:** `packages/quoting/src/{schema,types,math,price-lists,inputs,validate,evaluate,quote-item}.ts`, `src/blocks/*`, `src/templates/*`, `src/__tests__/*`.

**Produces:**
- `evaluateProduct(product: unknown, input: Record<string, unknown>, ctx: { name: string; priceLists: PriceList[] }): Result<QuoteLineResult>`
- `validateProduct(raw: unknown, lists: PriceList[]): Result<ProductDefinition>`
- `toQuoteItemFields(r: QuoteLineResult)`, `aggregateMaterials(lines[][])`
- `TRADE_TEMPLATES`, `getTradeTemplate(key)`, `instantiateTemplate(t, newId)`

- [x] Tests first (25 RED), implement, GREEN 42/42, coverage lines 99.6 %, branches 90 %.

### Task 3: Migrations 033–034 applied and verified

**Files:** `apps/web/supabase/migrations/033_accounts_and_pricing_engine.sql`, `034_public_showcase.sql`, `apps/web/supabase/tests/showcase_security.sql`

- [ ] Apply both with psql on `127.0.0.1:54332`; must be idempotent (apply twice).
- [ ] Security test as `anon`: `select get_public_profile('unpublished')` → null; `select * from reviews` → 0 rows / permission; `submit_quote_request` 6× same ip_hash → `rate_limited`.
- [ ] Add `transpilePackages: ['@cotizapro/quoting']` and workspace dependency in `apps/web/package.json`.

### Task 4: Server-side pricing API

**Files:**
- Create: `apps/web/lib/pricing/load-pricing-context.ts` (loads price lists + product for org, explicit columns)
- Create: `apps/web/lib/pricing/price-quote-items.ts` (`priceQuoteItems(supabase, orgId, items) → Result<PricedItem[]>`)
- Create: `apps/web/app/api/price-lists/route.ts`, `apps/web/app/api/price-lists/[id]/route.ts`
- Create: `apps/web/app/api/pricing/preview/route.ts` (authenticated preview, same engine)
- Modify: `apps/web/app/api/quotes/route.ts` and `[id]/route.ts` (configurable items go through `priceQuoteItems`)
- Modify: `apps/web/lib/validations/cotizapro.ts` (`quoteItemSchema` accepts `{ service_id, input }` for configurable items)

- [ ] Tests: Vitest for `price-quote-items` with fake loader (missing price → error; snapshot frozen).
- [ ] E2E/API: create quote with configurable item → subtotal equals engine; change list price → old quote unchanged.

### Task 5: Configurable item UI in quotes

**Files:**
- Create: `apps/web/components/quoting/configurable-item-form.tsx`, `breakdown-table.tsx`, `use-product-preview.ts`
- Modify: `apps/web/app/(dashboard)/dashboard/quotes/new/page.tsx` (render the form when the chosen service has `pricing_blocks`; no growth beyond extraction)
- Modify: `apps/web/lib/pdf/QuotePDF.tsx` (item measures + "Lista de materiales")

### Task 6: Catalog editors

**Files:** `apps/web/app/(dashboard)/dashboard/price-lists/page.tsx`, `components/quoting/price-list-editor.tsx`, `components/quoting/product-definition-editor.tsx` (blocks list with per-type forms + test calculator), sidebar link.

### Task 7: Onboarding with account type and trade

**Files:** `apps/web/app/(auth)/onboarding/page.tsx`, `apps/web/app/api/auth/organization/route.ts`, `apps/web/lib/onboarding/apply-trade-template.ts` (inserts price lists + services via `instantiateTemplate`, creates draft `public_profiles`).

### Task 8: Public showcase page

**Files:** `apps/web/app/p/[slug]/page.tsx` (Server Component, `generateMetadata`), `components/showcase/*`, `apps/web/lib/showcase/get-public-profile.ts` (anon RPC + signed photo URLs).

### Task 9: Reviews

**Files:** `apps/web/app/r/[token]/page.tsx`, `app/api/reviews/route.ts` (anon submit with IP rate limit), `app/api/quotes/[id]/review-request/route.ts` (authenticated, returns link), quote detail button "Pedir reseña", `e2e/specs/23-review-flow.spec.ts`.

### Task 10: Quote requests

**Files:** `components/showcase/quote-request-form.tsx`, `app/api/public/quote-requests/route.ts`, `app/(dashboard)/dashboard/solicitudes/page.tsx`, `app/api/quote-requests/[id]/convert/route.ts`, email notification via `lib/integrations/email.ts`, `e2e/specs/24-quote-request.spec.ts`.

### Task 11: Showcase admin, photos and QR card

**Files:** `app/(dashboard)/dashboard/vitrina/page.tsx`, `components/showcase/profile-editor.tsx`, `components/quoting/job-photos.tsx` (upload to `job-photos/<org>/<quote>/<uuid>.<ext>`), `app/api/showcase/qr-card/route.ts` (PDF with `qrcode` + `@react-pdf/renderer`).

### Task 12: Realistic multi-account seed

**Files:** `apps/web/scripts/seed/index.ts`, `accounts.ts`, `clients.ts`, `quotes.ts`, `showcase.ts`; script `pnpm --filter web seed`.

- [ ] Idempotent by fixed UUID namespace `00000000-0000-0000-00c0-*`; uses service role (local or VPS shell only, never a route).
- [ ] Verify counts per org after run; rerun gives identical counts.

### Task 13: New E2E journeys

**Files:** `e2e/specs/20-workshop-journey.spec.ts`, `21-configurable-product.spec.ts`, `22-public-profile.spec.ts`, `23-review-flow.spec.ts`, `24-quote-request.spec.ts`.

### Task 14: Deploy to VPS

**Files:** `deploy/vps/supabase/docker-compose.yml`, `deploy/vps/app/docker-compose.yml`, `deploy/vps/Caddyfile.cotizapro`, `deploy/vps/scripts/{gen-keys.mjs,backup.sh,demo-reset.sh,set-resend-key.sh,deploy.sh}`, `deploy/vps/README.md`.

- [ ] §0 pre-check: smoke all domains, container list, RAM.
- [ ] DNS A `cotizapro`, `api.cotizapro` → 2.25.244.18.
- [ ] Bring up Supabase stack, apply migrations 001–034, seed demo accounts, create MEGAGLASS real org.
- [ ] Build + run app, append Caddy block preserving inode, register in caddy-guard, reload.
- [ ] §0 post-check identical; prod smoke + E2E journey against demo account.
- [ ] Update `~/.claude/docs/infra/hostinger-vps-inventario.md`.

### Task 15: Usage tests, evidence and handoff

- [ ] Drive the real flows in the browser on production, capture and evaluate screenshots.
- [ ] Write `docs/handoff/2026-10-11-cotizapro-plataforma-handoff.md` per autonomous-handoff skill.
