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

---

## ADR-008: Cobro semi-manual con Mercado Pago y solo lectura al vencer

**Decisión:** Ligas de suscripción de Mercado Pago por plan (variables `MP_LINK_*`); el operador activa y renueva desde `/admin` con RPCs `admin_*` que validan `is_platform_admin()` y auditan en `plan_activations`. Al vencer `current_period_end`, la cuenta queda en solo lectura de inmediato (402 en las rutas que escriben). Gratis y los planes pagados sin periodo no vencen. Los límites por plan están programados pero apagados (`PLAN_LIMITS_ENFORCED=false`) durante el piloto.

**Rationale:**
- Se arranca sin webhook ni credenciales de Mercado Pago en la app; las mismas RPC sirven después para un webhook.
- El navegador nunca decide el monto ni el plan: lo calcula el servidor y lo escribe una RPC; el trigger `guard_org_billing_columns` bloquea los cambios directos.
- El cron se autentica con el hash de `CRON_SECRET` porque el contenedor de producción no tiene service role.

---

## ADR-009: IA local con créditos mensuales

**Decisión:** Las funciones de IA usan `gemma3:4b` en el Ollama compartido (API `/v1` compatible con OpenAI) y se cobran en créditos por empresa. Cupos mensuales: Gratis 25, Solo 150, Taller 400, Empresa 1,200; tope diario de 40 créditos por usuario. Créditos por función: borrador de WhatsApp 3, descripción de partida 2, seguimiento 1, reescribir 1, textos de la vitrina 2. El periodo es el mes calendario en `America/Monterrey` con reinicio el día 1. Paquetes: +200 créditos por $49 y +1,000 por $199 MXN, vigentes hasta fin de mes (ligas `MP_LINK_AI_PACK_200` y `MP_LINK_AI_PACK_1000`).

**Rationale:**
- Costo cero por llamada y sin enviar datos de clientes a terceros.
- `ai_reserve` reserva con candado por empresa y `ai_finish` (con nonce) cobra solo lo que sale bien; errores, tiempos agotados, desconexión y salidas inválidas se reembolsan. Las reservas abiertas expiran.
- No se guarda contenido: la bitácora solo tiene función, créditos, tokens, latencia y estado.
- La IA nunca pone precios: salen del catálogo, las listas de precios o `@cotizapro/quoting`. Todo resultado es borrador hasta que una persona lo guarda.
- Una cola en proceso (1 llamada a la vez, 1 por empresa, 6 en espera) protege el Ollama que comparten otros proyectos.
- La base decide los límites con el ajuste `ai.limits_enforced`; `AI_LIMITS_ENFORCED=false` equivale exactamente a `'off'` en la base (se fija con `ALTER DATABASE ... SET`, solo con aprobación del operador). Cualquier otro valor deja los límites activos.

**Decisiones tomadas durante la implementación:**
- Las empresas en solo lectura (plan vencido) no pueden usar IA, porque consumir créditos es una escritura (402, igual que el resto de rutas que escriben). El estado de la IA sí se consulta.
- Las sugerencias aparecen en una caja con botón explícito "Usar" en lugar de llenar el campo en vivo; una falla no deja texto a medias.
- Reescribir tiene límites de largo por contexto (notas, términos, respuesta a reseña), validados en servidor y en cliente.
- Las partidas dudosas del borrador de WhatsApp llevan la marca `needs_review` (por ejemplo, m2 sin medidas o producto configurable sin medidas); se muestran con aviso y bloquean el envío hasta que la persona las revisa.
- Coincidencia ambigua de clientes: si teléfono y nombre apuntan a clientes distintos, o el nombre es de una sola palabra con varias coincidencias, el resultado es `ambiguous` y no se elige cliente.
- Los paquetes exigen referencia y esta es única por empresa (índice parcial en 043; duplicada responde 409), para que reintentar el alta no duplique créditos.
- El helper E2E que reinicia créditos solo funciona contra hosts locales y usa service role únicamente ahí.
- La IA falsa (`/api/dev/fake-ai/v1`) solo responde en desarrollo o pruebas y con `AI_BASE_URL` apuntando explícitamente a ella; en producción da 404.

**Límites conocidos:**
- Los clientes se comparan entre los 500 más recientes de la empresa.
- Los mensajes de `ai:eval` son sintéticos; deben reemplazarse por mensajes reales anonimizados antes de evaluar el modelo en el servidor.
- `quotes/new/page.tsx` ya superaba las 400 líneas antes de este trabajo; se extrajeron componentes para que no crezca, pero dividir la página queda fuera de alcance.
