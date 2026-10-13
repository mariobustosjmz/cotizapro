# D2 — Cobro con Mercado Pago semi-manual, superadmin y vencimiento: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un negocio contrate Solo, Taller o Empresa con ligas de suscripción de Mercado Pago, que el operador active y renueve el plan desde `/admin`, y que la cuenta quede en solo lectura de inmediato al vencer, con avisos 7, 3 y 1 días antes y el día del vencimiento.

**Architecture:** La migración 042 agrega el periodo pagado a `organizations`, el superadmin de plataforma, la auditoría `plan_activations` y RPCs `SECURITY DEFINER` que validan `is_platform_admin()`; la app nunca usa service role en rutas de usuario. El estado de facturación (gratis, sin vencimiento, vigente, por vencer, vencido) se calcula con funciones puras en `lib/billing/*`, que alimentan el banner del panel, Facturación, `/admin` y el cron. El bloqueo de escritura vive en un helper `assertWritable()` que llama a `current_org_is_writable()` y responde 402 en las rutas de API que escriben. El cron diario autentica contra la base con el hash de `CRON_SECRET` (el contenedor de producción no recibe la service role).

**Tech Stack:** Next.js 16.1 (App Router), React 19, TypeScript 5 estricto, Tailwind 4, Zod 4, Supabase (Postgres 17, PostgREST 14), Resend, Vitest 3, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-cotizacion-publica-y-cobro-design.md` — sección **D2** completa y decisiones 3, 4 y 5 de la §5. D1 (migración 041) y los créditos de IA (migración 043) quedan fuera de este plan.

## Global Constraints

- Next.js 16 App Router, React 19, TypeScript estricto, Tailwind 4 (solo utilidades), Zod 4. Ids de organización con `z.guid()` (los ids demo `00000000-0000-0000-00c0-…` no pasan `z.string().uuid()`).
- Sin `any` ni tipos implícitos; actualizaciones inmutables; funciones de menos de 50 líneas; archivos de menos de 400; anidación de 3 niveles como máximo; tipos e interfaces compartidos en archivos `types.ts`.
- `select()` con columnas explícitas y `.limit()` en listas; nunca `select('*')` en código nuevo.
- Rutas de usuario: nunca service role y nunca saltarse RLS. El superadmin usa su sesión y RPCs `SECURITY DEFINER` que validan `is_platform_admin()` y lanzan `forbidden`. El cron usa RPCs que validan el hash de `CRON_SECRET`.
- Migración **042** (041 es de D1, 043 de créditos de IA). `gen_random_uuid()`. Idempotente (se puede aplicar dos veces). Se aplica en `BEGIN/COMMIT` y se registra en `supabase_migrations.schema_migrations` con `version = '042'`, `name = '042_billing_superadmin'`.
- 042 hace `CREATE OR REPLACE` de `guard_org_billing_columns` (creada en 040) y le suma `current_period_end`, `billing_provider` y `billing_reference`.
- Gratis nunca vence. Al vencer, la cuenta queda **en solo lectura de inmediato**, sin periodo de gracia; se puede ver y descargar todo, pero no crear, editar ni enviar. Los datos nunca se borran.
- Avisos: banner en el panel desde 7 días antes; correo al propietario a los 7, 3 y 1 días y el día del vencimiento, con un cron diario que usa Resend.
- Piloto sin candados (decisión 5): `planLimits()` programado y visible en Facturación, aplicación apagada con `PLAN_LIMITS_ENFORCED=false` por omisión. El único bloqueo activo en v1 es el de plan vencido.
- Ligas de Mercado Pago por plan desde `MP_LINK_STARTER`, `MP_LINK_PRO`, `MP_LINK_ENTERPRISE` (solo `https:`). Sin la variable, el plan se queda en "Próximamente". Si la cuenta tiene más usuarios que los incluidos, en lugar de la liga: "Te mandamos tu liga con el total exacto" y botón de WhatsApp al soporte (`SUPPORT_WHATSAPP_PHONE`) con el total de `monthlyCost()`.
- Copy de UI en español de México con acentos, sin emojis. `logger` (de `@/lib/logger`) en lugar de `console.log`.
- Formularios: sin `<select>` nativo (usar `Combobox`), etiquetas obligatorias terminan en ` *`, nunca "(opcional)", Cancelar a la izquierda y la acción a la derecha (ambos `flex-1`), gerundio mientras envía ("Activando...").
- Comandos: unit `cd apps/web && pnpm exec vitest run <ruta>`; tipos `cd apps/web && pnpm exec tsc --noEmit -p .`; build `cd apps/web && pnpm build`; E2E `cd apps/web && PLAYWRIGHT_TEST_BASE_URL=http://localhost:3100 pnpm exec playwright test <spec>`; BD local `postgresql://postgres:postgres@127.0.0.1:54332/postgres`.
- Git: nunca commit ni push automático. Cada paso "Commit" significa: mostrar `git status` y `git diff --stat`, **esperar la aprobación explícita del usuario** y solo entonces ejecutar el commit. Mensajes cortos convencionales en español, sin `Co-Authored-By` ni líneas de atribución. Si el usuario lo pide, se agrupan en 2 o 3 commits al final.
- Producción (VPS compartido Hostinger): ningún paso de la Task 14 se ejecuta sin aprobación explícita; se sigue la regla §0 de coexistencia (estado real, respaldo con fecha, solo el bloque propio, smoke de todos los dominios antes y después).

## Review Focus

1. **Cuentas demo y de presentación con plan pagado y sin `current_period_end`** (hoy hay 6 organizaciones `pro`/`active`, entre ellas MEGAGLASS de presentación): al desplegar 042 deben seguir escribiendo; un periodo vacío nunca bloquea. Pruebas: Task 1 (SQL: `org_is_writable` de `00000000-0000-0000-00c0-000000000001` es `true`) y Task 4 (unit: `billingState` con `currentPeriodEnd: null` da `open_ended` y no hay banner).
2. **Renovar una cuenta ya vencida:** el nuevo periodo cuenta desde hoy, no desde la fecha vieja (si no, el cliente paga un mes y sigue bloqueado); renovar antes de vencer suma desde el fin vigente. Prueba: Task 1 (SQL: vencida hace 10 días + 1 mes = `now() + 1 mes`; vigente + 2 meses = fin anterior + 2 meses).
3. **El cron corre dos veces el mismo día o dos corridas se enciman:** el propietario no recibe dos veces el mismo aviso, y si el envío falla se reintenta en la siguiente corrida. Pruebas: Task 2 (SQL: `claim` true → false → `release` → true) y Task 12 (unit: `runBillingNotices` no reclama un aviso ya enviado y libera el reclamo si Resend falla).
4. **Ids demo que no son UUID RFC 4122** (`00000000-0000-0000-00c0-000000000003`): las rutas `/api/admin/organizations/[id]/*` deben aceptarlos. Pruebas: Task 10 (unit: `organizationIdSchema` acepta el id demo) y Task 13 (E2E sobre Plomería Don Beto).
5. **La petición del cron trae `Authorization: Bearer <CRON_SECRET>`:** `createServerClient()` reenvía cualquier Bearer a PostgREST como JWT y la llamada fallaría con 401. La ruta usa un cliente anónimo sin cabeceras del request y la base valida el hash del secreto. Prueba: Task 12 (verificación local con `curl`: 200 con `considered ≥ 1`; con secreto incorrecto, 401).

---

## Decisiones que resuelven ambigüedades del spec

- **Cuándo se considera vencida una cuenta:** `plan <> 'free' AND current_period_end IS NOT NULL AND current_period_end <= now()`. Un plan pagado sin `current_period_end` (cuentas demo y de presentación, o pagadas antes de 042) **no vence**.
- **Suspender:** pone `current_period_end = now()` y `subscription_status = 'canceled'`, conserva el plan y lo registra con `action = 'suspend'`. No se puede suspender Gratis (`free_plan_not_suspendable`). Para bajar a Gratis se usa "Activar" con plan Gratis (sin vencimiento, monto 0).
- **Monto de la activación:** lo calcula el servidor (`activationAmount = monthlyCost(plan, usuarios).total × meses`); nunca se confía en el monto que mande el navegador. El RPC sí recibe `p_amount` para que un futuro webhook use la misma función.
- **`assertWritable` recibe el cliente de Supabase**, no la organización: llama a `current_org_is_writable()` (organización de quien llama). `org_is_writable(org_id)` existe para RLS en una fase posterior y solo la ejecuta `service_role`. Si la consulta falla, **falla abierta** (registra el error y deja pasar): el bloqueo es de cobro, no una frontera de seguridad.
- **Rutas sin bloqueo al vencer:** autenticación, contraseña y perfil propio, facturación, cron y webhooks, marcar notificaciones como leídas, ocultar la lista de primeros pasos, la vista previa de precios (no escribe), aceptar una invitación y las rutas públicas de terceros (solicitudes y reseñas desde la vitrina).
- **Avisos por correo:** cubos por días restantes (`ceil`): 4–7 → `d7`, 2–3 → `d3`, 1 → `d1`, ≤ 0 → `d0`. Cada cubo se envía una sola vez por periodo (tabla `billing_notices`). El cron solo mira organizaciones con vencimiento entre hace 3 días y dentro de 7 días, para no escribir a cuentas vencidas hace meses.
- **Credencial del cron:** tabla privada `platform_settings` con `cron_key_sha256`; el alta del hash es un paso de operación. El contenedor web de producción no recibe la service role (inventario del VPS), así que no se usa `createAdminClient()`.
- **Límites programados pero apagados:** con `PLAN_LIMITS_ENFORCED=true` se revisan el tope mensual de Gratis en `POST /api/quotes` y los lugares en `POST /api/team/invitations`. La revisión al **aceptar** la invitación, los candados por función ("Disponible en Taller") y el aviso de costo extra al invitar quedan para cuando se encienda el flag (el piloto no los necesita y `accept_invitation` no puede leer variables de entorno).
- **Mes para el tope de Gratis:** mes calendario en `America/Monterrey` (UTC−6, sin horario de verano desde 2022).
- **Plan actual vencido o por vencer en Facturación:** su tarjeta muestra "Renovar con Mercado Pago" con la misma liga. Planes que no alcanzan para los usuarios actuales (Solo con 2 personas) muestran "No alcanza para tu equipo".
- **Sin `SUPPORT_WHATSAPP_PHONE`:** se muestra el texto con el total exacto y "Escríbenos a soporte para recibir tu liga", sin botón.
- **`/admin` sin sesión:** el middleware ya redirige a `/login` (la ruta no es pública). Con sesión y sin ser superadmin: 404, tanto en la página como en las rutas de API.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `apps/web/supabase/migrations/042_billing_superadmin.sql` | Columnas, guardia, superadmin, auditoría, solo lectura, límites SQL, avisos del cron |
| `apps/web/supabase/tests/billing_superadmin.sql` | Pruebas SQL de la parte A (rollback) |
| `apps/web/supabase/tests/billing_notices.sql` | Pruebas SQL de la parte B (rollback) |
| `apps/web/lib/plans/types.ts` (modificar) | `PlanFeature`, `PlanLimits`, `LimitCheck` |
| `apps/web/lib/plans/limits.ts` (+ test) | `planLimits`, `planLimitsEnforced`, `checkSeatLimit`, `checkMonthlyQuotes`, `monthStartIso` |
| `apps/web/lib/plans/enforce-limits.ts` (+ test) | Revisiones con base de datos detrás del flag, respuesta 402 |
| `apps/web/lib/billing/types.ts` | `BillingSnapshot`, `BillingState`, `ExpiryBanner`, `BillingBadge`, `BillingNoticeKind`, `PlanCheckoutOption`, `CheckoutEnv`, `DueNotice` |
| `apps/web/lib/billing/expiry.ts` (+ test) | `daysUntilExpiry`, `billingState`, `snapshotFromRow`, `noticeKindFor`, `formatExpiryDate` |
| `apps/web/lib/billing/expiry-copy.ts` (+ test) | Textos: banner, línea de estado del plan, etiqueta de vencimiento en `/admin` |
| `apps/web/lib/billing/badge.ts` (+ test) | Etiqueta y tono del estado en Facturación |
| `apps/web/lib/billing/writable.ts` (+ test) | `assertWritable`, `planExpiredResponse` |
| `apps/web/lib/billing/require-writable-member.ts` | `requireMember` + `assertWritable` |
| `apps/web/lib/billing/checkout-option.ts` (+ test) | Liga de Mercado Pago, WhatsApp a soporte o "Próximamente" por plan |
| `apps/web/lib/billing/activation.ts` (+ test) | `activationAmount` |
| `apps/web/lib/billing/notices.ts` (+ test) | `parseDueNotices`, `runBillingNotices` |
| `apps/web/lib/billing/notice-rpc.ts` | Lectura y reclamo de avisos vía RPC |
| `apps/web/lib/email/plan-expiry-email.ts` (+ test) | Correo de aviso de vencimiento |
| `apps/web/lib/cron/verify-cron.ts` (+ test) | Validación del encabezado del cron en tiempo constante |
| `apps/web/lib/supabase/anon.ts` | Cliente anónimo sin cabeceras del request |
| `apps/web/lib/admin/types.ts` | Filas y resultados de superadmin |
| `apps/web/lib/admin/schemas.ts` (+ test) | Zod de búsqueda, activación, suspensión e id |
| `apps/web/lib/admin/rpc-errors.ts` (+ test) | Traducción de errores de las RPC `admin_*` |
| `apps/web/lib/admin/require-platform-admin.ts` | `isPlatformAdmin`, `requirePlatformAdmin` |
| `apps/web/lib/admin/organizations.ts` | Envolturas de las RPC `admin_*` |
| `apps/web/lib/admin/admin-api.ts` (+ test) | `postAdminAction` para los diálogos |
| `apps/web/app/api/admin/organizations/[id]/{activate,suspend,activations}/route.ts` | API HTTP delgada del superadmin |
| `apps/web/app/admin/page.tsx` | Pantalla `/admin` |
| `apps/web/components/admin/*.tsx` | Tabla, acciones, diálogos e historial |
| `apps/web/app/api/cron/billing-notices/route.ts` | Cron diario de avisos |
| `apps/web/app/api/cron/reminders-check/route.ts`, `apps/web/lib/reminders/due-notifications.ts` (+ test), `apps/web/supabase/tests/client_reminders_cron.sql` (modificar/crear) | Cron de recordatorios con la llave del cron en lugar de service role (Task 12b) |
| `apps/web/components/dashboard/plan-expiry-banner.tsx` | Banner amarillo o rojo |
| `apps/web/app/(dashboard)/layout.tsx` (modificar) | Lee periodo y muestra el banner |
| `apps/web/components/billing/{plan-cta,billing-summary-cards,plan-limits-table}.tsx` | Piezas de Facturación |
| `apps/web/components/billing/PlanSelector.tsx`, `app/(dashboard)/dashboard/billing/{page,BillingClient}.tsx` (modificar) | Facturación con Mercado Pago |
| 40 rutas de escritura en `apps/web/app/api/**` (modificar) | Bloqueo 402 al vencer (Tasks 5 y 6) |
| `apps/web/e2e/helpers/billing-admin.ts`, `apps/web/e2e/specs/25-plan-billing.spec.ts` | E2E de D2 |
| `.env.example`, `.env.production.example`, `docs/CRON_SETUP.md`, `docs/DECISIONS.md` (modificar) | Variables, cron y decisión registrada |

---

### Task 1: Migración 042, parte A (periodo, guardia, superadmin, auditoría y solo lectura)

**Files:**
- Create: `apps/web/supabase/migrations/042_billing_superadmin.sql`
- Create: `apps/web/supabase/tests/billing_superadmin.sql`

**Interfaces:**
- Consumes: `public.user_organization_id()`, `public.profiles`, `public.organizations`, trigger `guard_org_billing_columns` (040).
- Produces:
  - Columnas `organizations.current_period_end TIMESTAMPTZ NULL`, `billing_provider TEXT NULL` (`'mercadopago_manual' | 'stripe'`), `billing_reference TEXT NULL` (≤ 120).
  - Tablas `platform_admins(user_id PK, created_at)` y `plan_activations(...)`, sin acceso para `anon`/`authenticated`.
  - `is_platform_admin() → boolean` (authenticated).
  - `org_is_writable(p_org uuid) → boolean` (solo service_role) y `current_org_is_writable() → boolean` (authenticated).
  - `org_plan_limits(p_org uuid) → jsonb {plan, included_users, extra_users_allowed, monthly_quotes}` (authenticated, solo su organización).
  - `admin_list_organizations(p_search text, p_limit int, p_offset int) → table(id, name, slug, plan, subscription_status, current_period_end, member_count int, created_at, total_count bigint)`.
  - `admin_activate_plan(p_org uuid, p_plan text, p_users int, p_months int, p_amount numeric, p_reference text) → jsonb {organization_id, plan, current_period_end}`.
  - `admin_suspend_plan(p_org uuid, p_reason text) → jsonb {organization_id, plan, current_period_end}`.
  - `admin_list_plan_activations(p_org uuid, p_limit int) → table(id, action, previous_plan, new_plan, users_billed, months, amount, reference, reason, period_start, period_end, activated_by_email, created_at)`.
  - Mensajes de error (`SQLERRM`): `forbidden`, `invalid_plan`, `invalid_users`, `invalid_months`, `invalid_amount`, `invalid_reference`, `invalid_reason`, `org_not_found`, `free_plan_not_suspendable`.

- [ ] **Step 1: Escribir la prueba SQL que falla**

Crear `apps/web/supabase/tests/billing_superadmin.sql`:

```sql
-- Pruebas de la migración 042, parte A. Requiere el seed demo (cuentas *.demo.cotizapro.mx).
--   psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/billing_superadmin.sql
-- Todo corre en una transacción con ROLLBACK.
BEGIN;

CREATE TEMP TABLE _results (name TEXT, ok BOOLEAN, detail TEXT);
GRANT ALL ON _results TO anon, authenticated;

CREATE TEMP TABLE _fx AS
SELECT
  '00000000-0000-0000-00c0-000000000003'::uuid AS beto_org,
  '00000000-0000-0000-00c0-000000000002'::uuid AS voltaje_org,
  '00000000-0000-0000-00c0-000000000001'::uuid AS megaglass_org,
  (SELECT id FROM auth.users WHERE email = 'direccion@megaglass.demo.cotizapro.mx') AS admin_uid,
  (SELECT id FROM auth.users WHERE email = 'hector@voltaje.demo.cotizapro.mx') AS outsider_uid,
  (SELECT id FROM auth.users WHERE email = 'beto@plomeria.demo.cotizapro.mx') AS beto_uid,
  (SELECT id FROM organizations WHERE plan = 'free' ORDER BY created_at LIMIT 1) AS free_org;
GRANT SELECT ON _fx TO anon, authenticated;

INSERT INTO platform_admins (user_id) SELECT admin_uid FROM _fx;
UPDATE organizations SET plan = 'pro', subscription_status = 'active', current_period_end = NULL
WHERE id = (SELECT beto_org FROM _fx);

-- ---------------- postgres: reglas de solo lectura ----------------
INSERT INTO _results SELECT 'paid org without period stays writable', org_is_writable(megaglass_org), NULL FROM _fx;
UPDATE organizations SET current_period_end = now() - interval '30 days' WHERE id = (SELECT free_org FROM _fx);
INSERT INTO _results SELECT 'free org never expires', org_is_writable(free_org), NULL FROM _fx;

-- ---------------- anon ----------------
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;

DO $$
DECLARE v_state TEXT := '';
BEGIN
  BEGIN PERFORM is_platform_admin(); EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot call is_platform_admin', v_state = '42501', v_state);
  v_state := '';
  BEGIN PERFORM * FROM admin_list_organizations(NULL, 10, 0); EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot call admin_list_organizations', v_state = '42501', v_state);
END $$;

-- ---------------- authenticated: propietario de Plomería Don Beto ----------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', beto_uid)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_state TEXT;
BEGIN
  v_state := '';
  BEGIN UPDATE organizations SET current_period_end = now() + interval '1 year' WHERE id = '00000000-0000-0000-00c0-000000000003';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('owner cannot extend current_period_end', v_state = '42501', v_state);

  v_state := '';
  BEGIN UPDATE organizations SET billing_reference = 'pagado' WHERE id = '00000000-0000-0000-00c0-000000000003';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('owner cannot set billing_reference', v_state = '42501', v_state);

  v_state := '';
  BEGIN UPDATE organizations SET plan = 'enterprise' WHERE id = '00000000-0000-0000-00c0-000000000003';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('owner cannot change plan', v_state = '42501', v_state);

  v_state := '';
  BEGIN PERFORM count(*) FROM platform_admins; EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('authenticated cannot read platform_admins', v_state = '42501', v_state);

  v_state := '';
  BEGIN PERFORM count(*) FROM plan_activations; EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('authenticated cannot read plan_activations', v_state = '42501', v_state);

  v_state := '';
  BEGIN PERFORM org_is_writable('00000000-0000-0000-00c0-000000000003'); EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE; END;
  INSERT INTO _results VALUES ('authenticated cannot call org_is_writable', v_state = '42501', v_state);
END $$;

INSERT INTO _results SELECT 'owner is not platform admin', NOT is_platform_admin(), NULL;
INSERT INTO _results SELECT 'open-ended paid org is writable', current_org_is_writable(), NULL;
INSERT INTO _results
SELECT 'org_plan_limits of own org (Taller)',
  (org_plan_limits(beto_org)->>'included_users')::int = 3
  AND (org_plan_limits(beto_org)->>'extra_users_allowed')::boolean
  AND org_plan_limits(beto_org)->'monthly_quotes' = 'null'::jsonb,
  org_plan_limits(beto_org)::text
FROM _fx;
INSERT INTO _results SELECT 'org_plan_limits hides other orgs', org_plan_limits(voltaje_org) IS NULL, NULL FROM _fx;

-- ---------------- authenticated: usuario que no es superadmin ----------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', outsider_uid)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_err TEXT; v_fn TEXT;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY['list', 'activate', 'suspend', 'history'] LOOP
    v_err := '';
    BEGIN
      CASE v_fn
        WHEN 'list' THEN PERFORM * FROM admin_list_organizations(NULL, 10, 0);
        WHEN 'activate' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000002', 'enterprise', 1, 12, 0, 'hack');
        WHEN 'suspend' THEN PERFORM admin_suspend_plan('00000000-0000-0000-00c0-000000000003', 'hack');
        ELSE PERFORM * FROM admin_list_plan_activations('00000000-0000-0000-00c0-000000000003', 10);
      END CASE;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    INSERT INTO _results VALUES ('non-admin gets forbidden on ' || v_fn, v_err = 'forbidden', v_err);
  END LOOP;
END $$;

-- ---------------- authenticated: superadmin ----------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', admin_uid)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

INSERT INTO _results SELECT 'admin is platform admin', is_platform_admin(), NULL;
INSERT INTO _results
SELECT 'admin search finds Don Beto with 1 user', count(*) = 1 AND bool_and(member_count = 1), count(*)::text
FROM admin_list_organizations('plomeria-don-beto', 10, 0);
INSERT INTO _results SELECT 'search escapes % wildcard', count(*) = 0, count(*)::text FROM admin_list_organizations('%', 10, 0);
INSERT INTO _results SELECT 'list limit is clamped to 100', count(*) <= 100, count(*)::text FROM admin_list_organizations(NULL, 5000, 0);

DO $$
DECLARE v_first JSONB; v_second JSONB; v_end1 TIMESTAMPTZ; v_end2 TIMESTAMPTZ;
BEGIN
  v_first := admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 1, 999, 'MP-TEST-1');
  v_end1 := (v_first->>'current_period_end')::timestamptz;
  INSERT INTO _results VALUES ('first activation counts from today', v_end1 = now() + interval '1 month', v_end1::text);

  v_second := admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 2, 1998, 'MP-TEST-2');
  v_end2 := (v_second->>'current_period_end')::timestamptz;
  INSERT INTO _results VALUES ('renewal extends from current end', v_end2 = v_end1 + interval '2 months', v_end2::text);
END $$;

INSERT INTO _results
SELECT 'activations audited with admin email and amount',
  count(*) = 2 AND bool_and(activated_by_email = 'direccion@megaglass.demo.cotizapro.mx') AND sum(amount) = 2997,
  count(*)::text
FROM admin_list_plan_activations('00000000-0000-0000-00c0-000000000003', 10)
WHERE reference LIKE 'MP-TEST-%';

DO $$
DECLARE v_err TEXT; v_case TEXT;
BEGIN
  FOREACH v_case IN ARRAY ARRAY['invalid_plan', 'invalid_users', 'invalid_months', 'invalid_amount', 'invalid_reference', 'org_not_found', 'invalid_reason', 'free_plan_not_suspendable'] LOOP
    v_err := '';
    BEGIN
      CASE v_case
        WHEN 'invalid_plan' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'gold', 1, 1, 0, 'x');
        WHEN 'invalid_users' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 0, 1, 0, 'x');
        WHEN 'invalid_months' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 13, 0, 'x');
        WHEN 'invalid_amount' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 1, -1, 'x');
        WHEN 'invalid_reference' THEN PERFORM admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 1, 0, '  ');
        WHEN 'org_not_found' THEN PERFORM admin_activate_plan(gen_random_uuid(), 'pro', 1, 1, 0, 'x');
        WHEN 'invalid_reason' THEN PERFORM admin_suspend_plan('00000000-0000-0000-00c0-000000000003', 'x');
        ELSE PERFORM admin_suspend_plan((SELECT free_org FROM _fx), 'Prueba de suspensión');
      END CASE;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    INSERT INTO _results VALUES ('rejects ' || v_case, v_err = v_case, v_err);
  END LOOP;
END $$;

-- Cuenta vencida hace 10 días: la renovación cuenta desde hoy.
RESET ROLE;
UPDATE organizations SET current_period_end = now() - interval '10 days' WHERE id = (SELECT beto_org FROM _fx);
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', admin_uid)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_res JSONB;
BEGIN
  v_res := admin_activate_plan('00000000-0000-0000-00c0-000000000003', 'pro', 1, 1, 999, 'MP-TEST-3');
  INSERT INTO _results VALUES ('expired renewal counts from today',
    (v_res->>'current_period_end')::timestamptz = now() + interval '1 month', v_res::text);

  v_res := admin_suspend_plan('00000000-0000-0000-00c0-000000000003', 'Pago rechazado en prueba');
  INSERT INTO _results VALUES ('suspend ends the period now', (v_res->>'current_period_end')::timestamptz = now(), v_res::text);
END $$;

-- El propietario ya no puede escribir.
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', beto_uid)::text, true) FROM _fx;
SET LOCAL ROLE authenticated;
INSERT INTO _results SELECT 'suspended org is read-only', NOT current_org_is_writable(), NULL;

RESET ROLE;
INSERT INTO _results
SELECT 'suspend marks status canceled and audits it',
  o.subscription_status = 'canceled'
  AND EXISTS (SELECT 1 FROM plan_activations a WHERE a.organization_id = o.id AND a.action = 'suspend'),
  o.subscription_status
FROM organizations o WHERE o.id = (SELECT beto_org FROM _fx);

SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, detail FROM _results ORDER BY ok, name;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM _results;
ROLLBACK;
```

- [ ] **Step 2: Correr la prueba y confirmar que falla**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web
DB="postgresql://postgres:postgres@127.0.0.1:54332/postgres"
psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/billing_superadmin.sql
```

Expected: FAIL con `ERROR:  relation "platform_admins" does not exist`.

- [ ] **Step 3: Escribir la migración (parte A)**

Crear `apps/web/supabase/migrations/042_billing_superadmin.sql`:

```sql
-- ================================================
-- Migration: 042_billing_superadmin.sql
-- D2 del spec 2026-10-13: cobro semi-manual con Mercado Pago.
-- Parte A: periodo pagado, guardia de columnas de facturación, superadmin de plataforma,
--          activaciones auditadas, solo lectura al vencer y límites de plan en SQL.
-- Parte B: avisos de vencimiento para el cron diario.
-- Idempotente. No depende de 041 (D1).
-- ================================================

-- ---------------- Parte A ----------------

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_provider TEXT,
  ADD COLUMN IF NOT EXISTS billing_reference TEXT;

DO $$
BEGIN
  ALTER TABLE public.organizations ADD CONSTRAINT organizations_billing_provider_check
    CHECK (billing_provider IS NULL OR billing_provider IN ('mercadopago_manual', 'stripe'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.organizations ADD CONSTRAINT organizations_billing_reference_check
    CHECK (billing_reference IS NULL OR length(billing_reference) <= 120);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_current_period_end
  ON public.organizations (current_period_end) WHERE current_period_end IS NOT NULL;

-- 040 creó el trigger; aquí la función suma las columnas nuevas. Las RPC admin_* son SECURITY DEFINER
-- (dueño postgres), así que current_user deja de ser authenticated y sí pueden escribirlas.
CREATE OR REPLACE FUNCTION public.guard_org_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
       NEW.id IS DISTINCT FROM OLD.id
    OR NEW.plan IS DISTINCT FROM OLD.plan
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
    OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
    OR NEW.billing_provider IS DISTINCT FROM OLD.billing_provider
    OR NEW.billing_reference IS DISTINCT FROM OLD.billing_reference
  ) THEN
    RAISE EXCEPTION 'billing columns cannot be changed directly' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_admins FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.platform_admins TO service_role;

CREATE TABLE IF NOT EXISTS public.plan_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('activate', 'suspend')),
  previous_plan TEXT NOT NULL,
  new_plan TEXT NOT NULL,
  users_billed INTEGER CHECK (users_billed IS NULL OR users_billed BETWEEN 1 AND 500),
  months INTEGER CHECK (months IS NULL OR months BETWEEN 1 AND 12),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  reference TEXT CHECK (reference IS NULL OR length(reference) <= 120),
  reason TEXT CHECK (reason IS NULL OR length(reason) <= 300),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_activations_org_created
  ON public.plan_activations (organization_id, created_at DESC);
ALTER TABLE public.plan_activations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_activations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.plan_activations TO service_role;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- true = sin bloqueo de cobro. Gratis nunca vence; un plan pagado sin periodo (demo, presentación) tampoco.
CREATE OR REPLACE FUNCTION public.org_is_writable(p_org UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT o.plan = 'free' OR o.current_period_end IS NULL OR o.current_period_end > now()
    FROM public.organizations o WHERE o.id = p_org
  ), true)
$$;
REVOKE ALL ON FUNCTION public.org_is_writable(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_is_writable(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.current_org_is_writable()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.org_is_writable(public.user_organization_id())
$$;
REVOKE ALL ON FUNCTION public.current_org_is_writable() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_org_is_writable() TO authenticated, service_role;

-- Espejo de lib/plans/limits.ts para checks de base de datos en una fase posterior.
CREATE OR REPLACE FUNCTION public.org_plan_limits(p_org UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE o.plan
    WHEN 'free' THEN jsonb_build_object('plan', 'free', 'included_users', 1, 'extra_users_allowed', false, 'monthly_quotes', 5)
    WHEN 'starter' THEN jsonb_build_object('plan', 'starter', 'included_users', 1, 'extra_users_allowed', false, 'monthly_quotes', NULL)
    WHEN 'pro' THEN jsonb_build_object('plan', 'pro', 'included_users', 3, 'extra_users_allowed', true, 'monthly_quotes', NULL)
    WHEN 'enterprise' THEN jsonb_build_object('plan', 'enterprise', 'included_users', 10, 'extra_users_allowed', true, 'monthly_quotes', NULL)
  END
  FROM public.organizations o
  WHERE o.id = p_org
    AND (o.id = public.user_organization_id() OR public.is_platform_admin() OR auth.role() = 'service_role')
$$;
REVOKE ALL ON FUNCTION public.org_plan_limits(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_plan_limits(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_organizations(
  p_search TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 25, p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, name TEXT, slug TEXT, plan TEXT, subscription_status TEXT, current_period_end TIMESTAMPTZ,
  member_count INTEGER, created_at TIMESTAMPTZ, total_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_pattern TEXT := '%' || replace(replace(replace(COALESCE(btrim(p_search), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT o.id, o.name, o.slug, o.plan, o.subscription_status, o.current_period_end,
         (SELECT count(*)::integer FROM public.profiles p WHERE p.organization_id = o.id),
         o.created_at, count(*) OVER ()
  FROM public.organizations o
  WHERE o.name ILIKE v_pattern OR o.slug ILIKE v_pattern
  ORDER BY o.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_organizations(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_organizations(TEXT, INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_activate_plan(
  p_org UUID, p_plan TEXT, p_users INTEGER, p_months INTEGER, p_amount NUMERIC, p_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_reference TEXT := NULLIF(btrim(COALESCE(p_reference, '')), '');
  v_start TIMESTAMPTZ := now();
  v_end TIMESTAMPTZ;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_plan IS NULL OR p_plan NOT IN ('free', 'starter', 'pro', 'enterprise') THEN RAISE EXCEPTION 'invalid_plan' USING ERRCODE = '22023'; END IF;
  IF p_users IS NULL OR p_users NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid_users' USING ERRCODE = '22023'; END IF;
  IF p_months IS NULL OR p_months NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'invalid_months' USING ERRCODE = '22023'; END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023'; END IF;
  IF p_plan <> 'free' AND (v_reference IS NULL OR length(v_reference) > 120) THEN
    RAISE EXCEPTION 'invalid_reference' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_org FROM public.organizations WHERE id = p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'org_not_found' USING ERRCODE = 'P0002'; END IF;

  IF p_plan <> 'free' THEN
    v_start := GREATEST(now(), COALESCE(v_org.current_period_end, now()));
    v_end := v_start + make_interval(months => p_months);
  END IF;

  UPDATE public.organizations
  SET plan = p_plan,
      subscription_status = 'active',
      current_period_end = v_end,
      billing_provider = CASE WHEN p_plan = 'free' THEN NULL ELSE 'mercadopago_manual' END,
      billing_reference = v_reference,
      updated_at = now()
  WHERE id = p_org;

  INSERT INTO public.plan_activations (organization_id, action, previous_plan, new_plan, users_billed, months,
    amount, reference, period_start, period_end, activated_by)
  VALUES (p_org, 'activate', v_org.plan, p_plan, p_users,
    CASE WHEN p_plan = 'free' THEN NULL ELSE p_months END,
    CASE WHEN p_plan = 'free' THEN 0 ELSE round(p_amount, 2) END,
    v_reference, v_start, v_end, auth.uid());

  RETURN jsonb_build_object('organization_id', p_org, 'plan', p_plan, 'current_period_end', v_end);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_activate_plan(UUID, TEXT, INTEGER, INTEGER, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_activate_plan(UUID, TEXT, INTEGER, INTEGER, NUMERIC, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_suspend_plan(p_org UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF length(v_reason) NOT BETWEEN 3 AND 300 THEN RAISE EXCEPTION 'invalid_reason' USING ERRCODE = '22023'; END IF;

  SELECT * INTO v_org FROM public.organizations WHERE id = p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'org_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_org.plan = 'free' THEN RAISE EXCEPTION 'free_plan_not_suspendable' USING ERRCODE = '22023'; END IF;

  UPDATE public.organizations
  SET subscription_status = 'canceled', current_period_end = now(), updated_at = now()
  WHERE id = p_org;

  INSERT INTO public.plan_activations (organization_id, action, previous_plan, new_plan, reason, period_end, activated_by)
  VALUES (p_org, 'suspend', v_org.plan, v_org.plan, v_reason, now(), auth.uid());

  RETURN jsonb_build_object('organization_id', p_org, 'plan', v_org.plan, 'current_period_end', now());
END;
$$;
REVOKE ALL ON FUNCTION public.admin_suspend_plan(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_suspend_plan(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_plan_activations(p_org UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID, action TEXT, previous_plan TEXT, new_plan TEXT, users_billed INTEGER, months INTEGER,
  amount NUMERIC, reference TEXT, reason TEXT, period_start TIMESTAMPTZ, period_end TIMESTAMPTZ,
  activated_by_email TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT a.id, a.action, a.previous_plan, a.new_plan, a.users_billed, a.months, a.amount, a.reference, a.reason,
         a.period_start, a.period_end, u.email::text, a.created_at
  FROM public.plan_activations a
  LEFT JOIN auth.users u ON u.id = a.activated_by
  WHERE a.organization_id = p_org
  ORDER BY a.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_plan_activations(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_plan_activations(UUID, INTEGER) TO authenticated;
```

- [ ] **Step 4: Aplicar la migración en la base local, en transacción, y registrarla**

Solo base local. Producción va en la Task 14 con aprobación.

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web
DB="postgresql://postgres:postgres@127.0.0.1:54332/postgres"
psql "$DB" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
\i supabase/migrations/042_billing_superadmin.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('042', '042_billing_superadmin') ON CONFLICT (version) DO NOTHING;
COMMIT;
NOTIFY pgrst, 'reload schema';
SQL
```

Expected: termina con `COMMIT` y `NOTIFY`, sin `ERROR`. El `NOTIFY` hace que PostgREST vea las RPC y tablas nuevas sin reiniciarlo.

- [ ] **Step 5: Correr la prueba SQL y confirmar que pasa**

```bash
psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/billing_superadmin.sql
```

Expected: todas las filas `PASS` y la última consulta `passed | failed` con `failed = 0`.

- [ ] **Step 6: Confirmar que la migración es idempotente**

Repetir el comando del Step 4. Expected: `COMMIT` sin `ERROR`. Repetir el Step 5: `failed = 0`.

- [ ] **Step 7: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/supabase/migrations/042_billing_superadmin.sql apps/web/supabase/tests/billing_superadmin.sql
git commit -m "feat: migración 042 con superadmin, activaciones y solo lectura al vencer"
```

---

### Task 2: Migración 042, parte B (avisos de vencimiento para el cron)

**Files:**
- Modify: `apps/web/supabase/migrations/042_billing_superadmin.sql` (agregar la parte B al final)
- Create: `apps/web/supabase/tests/billing_notices.sql`

**Interfaces:**
- Consumes: tablas y columnas de la Task 1.
- Produces:
  - Tablas privadas `platform_settings(key PK, value, updated_at)` y `billing_notices(organization_id, period_end, kind, sent_at)` con PK `(organization_id, period_end, kind)`; `kind ∈ {'d7','d3','d1','d0'}`.
  - `cron_key_valid(p_key text) → boolean` (interna, sin EXECUTE para roles de la API).
  - `billing_notices_due(p_cron_key text) → table(organization_id uuid, organization_name text, plan text, current_period_end timestamptz, owner_email text, owner_name text, sent_kinds text[])` (anon, authenticated).
  - `claim_billing_notice(p_cron_key text, p_org uuid, p_period_end timestamptz, p_kind text) → boolean` (true solo la primera vez).
  - `release_billing_notice(p_cron_key text, p_org uuid, p_period_end timestamptz, p_kind text) → void`.
  - Error `forbidden` si la llave no coincide con `platform_settings.cron_key_sha256`.

- [ ] **Step 1: Escribir la prueba SQL que falla**

Crear `apps/web/supabase/tests/billing_notices.sql`:

```sql
-- Pruebas de la migración 042, parte B (avisos del cron). Requiere el seed demo.
--   psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/billing_notices.sql
BEGIN;

CREATE TEMP TABLE _results (name TEXT, ok BOOLEAN, detail TEXT);
GRANT ALL ON _results TO anon, authenticated;

INSERT INTO platform_settings (key, value)
VALUES ('cron_key_sha256', encode(extensions.digest('test-cron-key-0123456789abcdef0123456789', 'sha256'), 'hex'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

UPDATE organizations SET plan = 'pro', current_period_end = now() + interval '3 days'
WHERE id = '00000000-0000-0000-00c0-000000000003';
UPDATE organizations SET current_period_end = now() + interval '2 days'
WHERE id = (SELECT id FROM organizations WHERE plan = 'free' ORDER BY created_at LIMIT 1);

SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;

DO $$
DECLARE v_err TEXT; v_key TEXT;
BEGIN
  FOREACH v_key IN ARRAY ARRAY['otra-llave-0123456789abcdef0123456789', ''] LOOP
    v_err := '';
    BEGIN PERFORM * FROM billing_notices_due(NULLIF(v_key, '')); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
    INSERT INTO _results VALUES ('wrong or empty cron key is forbidden (' || length(v_key) || ')', v_err = 'forbidden', v_err);
  END LOOP;

  v_err := '';
  BEGIN PERFORM cron_key_valid('test-cron-key-0123456789abcdef0123456789'); EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot call cron_key_valid', v_err = '42501', v_err);

  v_err := '';
  BEGIN PERFORM count(*) FROM billing_notices; EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot read billing_notices', v_err = '42501', v_err);

  v_err := '';
  BEGIN PERFORM count(*) FROM platform_settings; EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot read platform_settings', v_err = '42501', v_err);
END $$;

INSERT INTO _results
SELECT 'due list has Don Beto with owner email and no sent kinds',
  count(*) = 1 AND bool_and(owner_email = 'beto@plomeria.demo.cotizapro.mx') AND bool_and(cardinality(sent_kinds) = 0),
  count(*)::text
FROM billing_notices_due('test-cron-key-0123456789abcdef0123456789')
WHERE organization_id = '00000000-0000-0000-00c0-000000000003';

INSERT INTO _results
SELECT 'free orgs are never due', count(*) = 0, count(*)::text
FROM billing_notices_due('test-cron-key-0123456789abcdef0123456789') WHERE plan = 'free';

DO $$
DECLARE
  v_key CONSTANT TEXT := 'test-cron-key-0123456789abcdef0123456789';
  v_org CONSTANT UUID := '00000000-0000-0000-00c0-000000000003';
  v_end TIMESTAMPTZ;
  v_first BOOLEAN; v_second BOOLEAN; v_third BOOLEAN; v_err TEXT := '';
BEGIN
  SELECT current_period_end INTO v_end FROM billing_notices_due(v_key) WHERE organization_id = v_org;
  v_first := claim_billing_notice(v_key, v_org, v_end, 'd3');
  v_second := claim_billing_notice(v_key, v_org, v_end, 'd3');
  PERFORM release_billing_notice(v_key, v_org, v_end, 'd3');
  v_third := claim_billing_notice(v_key, v_org, v_end, 'd3');
  INSERT INTO _results VALUES ('claim is once per kind and release allows retry', v_first AND NOT v_second AND v_third,
    format('%s/%s/%s', v_first, v_second, v_third));

  INSERT INTO _results
  SELECT 'sent kinds are reported back', 'd3' = ANY(sent_kinds), sent_kinds::text
  FROM billing_notices_due(v_key) WHERE organization_id = v_org;

  BEGIN PERFORM claim_billing_notice(v_key, v_org, v_end, 'd5'); EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('unknown notice kind is rejected', v_err = '23514', v_err);
END $$;

RESET ROLE;
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, detail FROM _results ORDER BY ok, name;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM _results;
ROLLBACK;
```

- [ ] **Step 2: Correr la prueba y confirmar que falla**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web
DB="postgresql://postgres:postgres@127.0.0.1:54332/postgres"
psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/billing_notices.sql
```

Expected: FAIL con `ERROR:  relation "platform_settings" does not exist`.

- [ ] **Step 3: Agregar la parte B al final de la migración**

Agregar al final de `apps/web/supabase/migrations/042_billing_superadmin.sql`:

```sql
-- ---------------- Parte B: avisos de vencimiento ----------------
-- El contenedor web de producción no recibe la service role: el cron se autentica con el hash de CRON_SECRET.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;

CREATE TABLE IF NOT EXISTS public.billing_notices (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_end TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('d7', 'd3', 'd1', 'd0')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, period_end, kind)
);
ALTER TABLE public.billing_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_notices FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.billing_notices TO service_role;

CREATE OR REPLACE FUNCTION public.cron_key_valid(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_key IS NOT NULL AND length(p_key) >= 32 AND EXISTS (
    SELECT 1 FROM public.platform_settings s
    WHERE s.key = 'cron_key_sha256' AND s.value = encode(extensions.digest(p_key, 'sha256'), 'hex')
  )
$$;
REVOKE ALL ON FUNCTION public.cron_key_valid(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.billing_notices_due(p_cron_key TEXT)
RETURNS TABLE (
  organization_id UUID, organization_name TEXT, plan TEXT, current_period_end TIMESTAMPTZ,
  owner_email TEXT, owner_name TEXT, sent_kinds TEXT[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.cron_key_valid(p_cron_key) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT o.id, o.name, o.plan, o.current_period_end, own.email, own.full_name,
         COALESCE((SELECT array_agg(n.kind ORDER BY n.kind) FROM public.billing_notices n
                   WHERE n.organization_id = o.id AND n.period_end = o.current_period_end), ARRAY[]::text[])
  FROM public.organizations o
  LEFT JOIN LATERAL (
    SELECT p.email, p.full_name FROM public.profiles p
    WHERE p.organization_id = o.id AND p.role = 'owner'
    ORDER BY p.created_at LIMIT 1
  ) own ON true
  WHERE o.plan <> 'free'
    AND o.current_period_end IS NOT NULL
    AND o.current_period_end BETWEEN now() - interval '3 days' AND now() + interval '7 days'
  ORDER BY o.current_period_end
  LIMIT 500;
END;
$$;
REVOKE ALL ON FUNCTION public.billing_notices_due(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_notices_due(TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_billing_notice(p_cron_key TEXT, p_org UUID, p_period_end TIMESTAMPTZ, p_kind TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.cron_key_valid(p_cron_key) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.billing_notices (organization_id, period_end, kind)
  VALUES (p_org, p_period_end, p_kind)
  ON CONFLICT DO NOTHING;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_billing_notice(TEXT, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_billing_notice(TEXT, UUID, TIMESTAMPTZ, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.release_billing_notice(p_cron_key TEXT, p_org UUID, p_period_end TIMESTAMPTZ, p_kind TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.cron_key_valid(p_cron_key) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.billing_notices
  WHERE organization_id = p_org AND period_end = p_period_end AND kind = p_kind;
END;
$$;
REVOKE ALL ON FUNCTION public.release_billing_notice(TEXT, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_billing_notice(TEXT, UUID, TIMESTAMPTZ, TEXT) TO anon, authenticated, service_role;
```

- [ ] **Step 4: Volver a aplicar la migración completa (idempotente) en la base local**

Repetir exactamente el comando del Step 4 de la Task 1. Expected: `COMMIT` sin `ERROR` (el registro en `schema_migrations` ya existe y `ON CONFLICT` lo deja igual).

- [ ] **Step 5: Correr ambas pruebas SQL**

```bash
psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/billing_notices.sql
psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/billing_superadmin.sql
```

Expected: en las dos, todas las filas `PASS` y `failed = 0`.

- [ ] **Step 6: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/supabase/migrations/042_billing_superadmin.sql apps/web/supabase/tests/billing_notices.sql
git commit -m "feat: avisos de vencimiento con llave del cron en la migración 042"
```

---
### Task 3: Límites de plan programados (`planLimits`) con el flag apagado

**Files:**
- Modify: `apps/web/lib/plans/types.ts` (agregar tipos al final)
- Create: `apps/web/lib/plans/limits.ts`
- Test: `apps/web/lib/plans/limits.test.ts`

**Interfaces:**
- Consumes: `PLANS` y `PlanId` de `lib/plans/catalog.ts` y `lib/plans/types.ts`.
- Produces:
  - `type PlanFeature = 'templates' | 'analytics' | 'reminders' | 'team_roles' | 'job_photos' | 'kanban_board'`
  - `interface PlanLimits { planId: PlanId; includedUsers: number; allowsExtraUsers: boolean; monthlyQuotes: number | null; features: readonly PlanFeature[] }`
  - `type LimitCheck = { allowed: true } | { allowed: false; code: 'SEAT_LIMIT' | 'MONTHLY_QUOTES'; message: string; upgradeTo: PlanId }`
  - `FREE_MONTHLY_QUOTES = 5`
  - `planLimits(planId: PlanId): PlanLimits`
  - `planLimitsEnforced(value?: string): boolean` (lee `process.env.PLAN_LIMITS_ENFORCED`; solo `'true'` lo enciende)
  - `checkSeatLimit(planId: PlanId, members: number, pendingInvitations: number): LimitCheck`
  - `checkMonthlyQuotes(planId: PlanId, createdThisMonth: number): LimitCheck`
  - `monthStartIso(now: Date): string` (inicio del mes en Monterrey, ISO UTC)

- [ ] **Step 1: Escribir la prueba que falla**

Crear `apps/web/lib/plans/limits.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { PLANS, PLAN_ORDER } from './catalog'
import { FREE_MONTHLY_QUOTES, checkMonthlyQuotes, checkSeatLimit, monthStartIso, planLimits, planLimitsEnforced } from './limits'

describe('planLimits', () => {
  it('deriva usuarios incluidos y adicionales del catálogo', () => {
    for (const id of PLAN_ORDER) {
      expect(planLimits(id)).toMatchObject({ planId: id, includedUsers: PLANS[id].includedUsers, allowsExtraUsers: PLANS[id].allowsExtraUsers })
    }
  })

  it('coincide con org_plan_limits de la migración 042', () => {
    expect(PLAN_ORDER.map((id) => [planLimits(id).includedUsers, planLimits(id).allowsExtraUsers])).toEqual([
      [1, false], [1, false], [3, true], [10, true],
    ])
  })

  it('solo Gratis tiene tope de 5 cotizaciones al mes', () => {
    expect(FREE_MONTHLY_QUOTES).toBe(5)
    expect(planLimits('free').monthlyQuotes).toBe(5)
    expect((['starter', 'pro', 'enterprise'] as const).map((id) => planLimits(id).monthlyQuotes)).toEqual([null, null, null])
  })

  it('plantillas, analítica y recordatorios desde Solo; equipo, fotos y tablero desde Taller', () => {
    expect(planLimits('free').features).toEqual([])
    expect(planLimits('starter').features).toEqual(['templates', 'analytics', 'reminders'])
    expect(planLimits('pro').features).toEqual(expect.arrayContaining(['templates', 'team_roles', 'job_photos', 'kanban_board']))
    expect(planLimits('enterprise').features).toEqual(planLimits('pro').features)
  })
})

describe('planLimitsEnforced', () => {
  it('está apagado por omisión durante el piloto', () => {
    expect(planLimitsEnforced(undefined)).toBe(false)
    expect(planLimitsEnforced('false')).toBe(false)
    expect(planLimitsEnforced('1')).toBe(false)
    expect(planLimitsEnforced('true')).toBe(true)
  })
})

describe('checkSeatLimit', () => {
  it('Gratis y Solo no pueden sumar a nadie más', () => {
    expect(checkSeatLimit('free', 1, 0)).toMatchObject({ allowed: false, code: 'SEAT_LIMIT', upgradeTo: 'pro' })
    expect(checkSeatLimit('starter', 1, 0)).toMatchObject({ allowed: false, code: 'SEAT_LIMIT' })
  })

  it('cuenta las invitaciones pendientes como lugares ocupados', () => {
    expect(checkSeatLimit('starter', 0, 1).allowed).toBe(false)
    expect(checkSeatLimit('starter', 0, 0).allowed).toBe(true)
  })

  it('Taller y Empresa admiten usuarios adicionales con costo', () => {
    expect(checkSeatLimit('pro', 3, 2).allowed).toBe(true)
    expect(checkSeatLimit('enterprise', 40, 0).allowed).toBe(true)
  })

  it('el mensaje dice en qué plan está disponible', () => {
    const check = checkSeatLimit('free', 1, 0)
    expect(check.allowed ? '' : check.message).toContain('Disponible en Taller')
  })
})

describe('checkMonthlyQuotes', () => {
  it('permite la quinta y bloquea la sexta en Gratis', () => {
    expect(checkMonthlyQuotes('free', 4).allowed).toBe(true)
    const sixth = checkMonthlyQuotes('free', 5)
    expect(sixth).toMatchObject({ allowed: false, code: 'MONTHLY_QUOTES', upgradeTo: 'starter' })
    expect(sixth.allowed ? '' : sixth.message).toContain('Llegaste a 5 este mes')
  })

  it('los planes pagados no tienen tope', () => {
    expect(checkMonthlyQuotes('starter', 10_000).allowed).toBe(true)
  })
})

describe('monthStartIso', () => {
  it('usa el mes de Monterrey aunque en UTC ya sea el mes siguiente', () => {
    expect(monthStartIso(new Date('2026-11-01T03:00:00Z'))).toBe('2026-10-01T06:00:00.000Z')
  })

  it('regresa el primer día del mes a medianoche de Monterrey', () => {
    expect(monthStartIso(new Date('2026-10-13T18:00:00Z'))).toBe('2026-10-01T06:00:00.000Z')
  })
})
```

- [ ] **Step 2: Correr la prueba y confirmar que falla**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/plans/limits.test.ts`
Expected: FAIL con `Failed to resolve import "./limits"`.

- [ ] **Step 3: Agregar los tipos**

Agregar al final de `apps/web/lib/plans/types.ts`:

```ts
export type PlanFeature = 'templates' | 'analytics' | 'reminders' | 'team_roles' | 'job_photos' | 'kanban_board'

export interface PlanLimits {
  readonly planId: PlanId
  readonly includedUsers: number
  readonly allowsExtraUsers: boolean
  /** null: cotizaciones ilimitadas. */
  readonly monthlyQuotes: number | null
  readonly features: readonly PlanFeature[]
}

export type LimitCode = 'SEAT_LIMIT' | 'MONTHLY_QUOTES'

export type LimitCheck =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly code: LimitCode; readonly message: string; readonly upgradeTo: PlanId }
```

- [ ] **Step 4: Escribir la implementación**

Crear `apps/web/lib/plans/limits.ts`:

```ts
import { PLANS } from './catalog'
import type { LimitCheck, PlanFeature, PlanId, PlanLimits } from './types'

export const FREE_MONTHLY_QUOTES = 5
const LIMITS_TIME_ZONE = 'America/Monterrey'
/** México eliminó el horario de verano en 2022: Monterrey queda fijo en UTC−6. */
const LIMITS_UTC_OFFSET = '-06:00'

const SOLO_FEATURES: readonly PlanFeature[] = ['templates', 'analytics', 'reminders']
const TEAM_FEATURES: readonly PlanFeature[] = [...SOLO_FEATURES, 'team_roles', 'job_photos', 'kanban_board']

const FEATURES_BY_PLAN: Readonly<Record<PlanId, readonly PlanFeature[]>> = {
  free: [],
  starter: SOLO_FEATURES,
  pro: TEAM_FEATURES,
  enterprise: TEAM_FEATURES,
}

export function planLimits(planId: PlanId): PlanLimits {
  const plan = PLANS[planId]
  return {
    planId,
    includedUsers: plan.includedUsers,
    allowsExtraUsers: plan.allowsExtraUsers,
    monthlyQuotes: planId === 'free' ? FREE_MONTHLY_QUOTES : null,
    features: FEATURES_BY_PLAN[planId],
  }
}

/** Decisión 5 del spec: durante el piloto los límites están programados pero apagados. */
export function planLimitsEnforced(value: string | undefined = process.env.PLAN_LIMITS_ENFORCED): boolean {
  return value === 'true'
}

export function checkSeatLimit(planId: PlanId, members: number, pendingInvitations: number): LimitCheck {
  const limits = planLimits(planId)
  if (limits.allowsExtraUsers || members + pendingInvitations < limits.includedUsers) return { allowed: true }
  return {
    allowed: false,
    code: 'SEAT_LIMIT',
    message: 'Tu plan es para una sola persona. Invitar equipo: Disponible en Taller.',
    upgradeTo: 'pro',
  }
}

export function checkMonthlyQuotes(planId: PlanId, createdThisMonth: number): LimitCheck {
  const { monthlyQuotes } = planLimits(planId)
  if (monthlyQuotes === null || createdThisMonth < monthlyQuotes) return { allowed: true }
  return {
    allowed: false,
    code: 'MONTHLY_QUOTES',
    message: `Llegaste a ${monthlyQuotes} este mes. Cambia de plan en Facturación para cotizar sin límite.`,
    upgradeTo: 'starter',
  }
}

export function monthStartIso(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: LIMITS_TIME_ZONE, year: 'numeric', month: '2-digit' }).formatToParts(now)
  const year = parts.find((p) => p.type === 'year')?.value ?? String(now.getUTCFullYear())
  const month = parts.find((p) => p.type === 'month')?.value ?? String(now.getUTCMonth() + 1).padStart(2, '0')
  return new Date(`${year}-${month}-01T00:00:00${LIMITS_UTC_OFFSET}`).toISOString()
}
```

- [ ] **Step 5: Correr la prueba y confirmar que pasa**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/plans/limits.test.ts lib/plans/pricing.test.ts`
Expected: PASS (todas).

- [ ] **Step 6: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/lib/plans/types.ts apps/web/lib/plans/limits.ts apps/web/lib/plans/limits.test.ts
git commit -m "feat: límites por plan programados y apagados en el piloto"
```

---

### Task 4: Estado de facturación y textos de vencimiento

**Files:**
- Create: `apps/web/lib/billing/types.ts`
- Create: `apps/web/lib/billing/expiry.ts`
- Create: `apps/web/lib/billing/expiry-copy.ts`
- Test: `apps/web/lib/billing/expiry.test.ts`, `apps/web/lib/billing/expiry-copy.test.ts`

**Interfaces:**
- Consumes: `isPlanId`, `PLANS` (`lib/plans/catalog.ts`), `PlanId`.
- Produces (todos los tipos de facturación que usan las Tasks 5 a 13):
  - `OrganizationBillingRow { plan: string | null; current_period_end: string | null }`
  - `BillingSnapshot { planId: PlanId; currentPeriodEnd: string | null }`
  - `PaidPlanId = Exclude<PlanId, 'free'>`
  - `BillingState` = `{kind:'free'}` | `{kind:'open_ended'; planId}` | `{kind:'active'|'expiring'; planId; periodEnd; daysLeft}` | `{kind:'expired'; planId; periodEnd}`
  - `BillingNoticeKind = 'd7' | 'd3' | 'd1' | 'd0'`
  - `ExpiryBanner { tone: 'warning' | 'danger'; message; ctaLabel; ctaHref }`
  - `BillingBadge { label; tone: 'success' | 'info' | 'neutral' | 'danger' }`
  - `PlanCheckoutOption` (ver código) y `CheckoutEnv { MP_LINK_STARTER?, MP_LINK_PRO?, MP_LINK_ENTERPRISE?, SUPPORT_WHATSAPP_PHONE? }`
  - `DueNotice { organizationId; organizationName; planId: PaidPlanId; periodEnd; ownerEmail: string | null; ownerName: string | null; sentKinds: readonly BillingNoticeKind[] }`
  - `snapshotFromRow(row): BillingSnapshot`, `daysUntilExpiry(periodEnd: string, now: Date): number | null`, `billingState(snapshot, now): BillingState`, `noticeKindFor(daysLeft: number): BillingNoticeKind | null`, `formatExpiryDate(iso: string): string`, `EXPIRY_WARNING_DAYS = 7`, `BILLING_TIME_ZONE`
  - `daysLabel(days): string`, `expiryBanner(state): ExpiryBanner | null`, `planStatusLine(state): string`, `adminExpiryLabel(state): string`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `apps/web/lib/billing/expiry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { billingState, daysUntilExpiry, formatExpiryDate, noticeKindFor, snapshotFromRow } from './expiry'

const now = new Date('2026-10-13T15:00:00.000Z')
const DAY = 86_400_000
const inDays = (days: number, extraMs = 0): string => new Date(now.getTime() + days * DAY + extraMs).toISOString()

describe('snapshotFromRow', () => {
  it('trata planes desconocidos o filas vacías como Gratis', () => {
    expect(snapshotFromRow(null)).toEqual({ planId: 'free', currentPeriodEnd: null })
    expect(snapshotFromRow({ plan: 'gold', current_period_end: null }).planId).toBe('free')
  })

  it('conserva plan y fin de periodo', () => {
    expect(snapshotFromRow({ plan: 'pro', current_period_end: '2026-11-13T15:00:00+00:00' }))
      .toEqual({ planId: 'pro', currentPeriodEnd: '2026-11-13T15:00:00+00:00' })
  })
})

describe('daysUntilExpiry', () => {
  it('redondea hacia arriba', () => {
    expect(daysUntilExpiry(inDays(0, 3_600_000), now)).toBe(1)
    expect(daysUntilExpiry(inDays(3, -3_600_000), now)).toBe(3)
  })

  it('regresa null con fechas inválidas', () => {
    expect(daysUntilExpiry('no-es-fecha', now)).toBeNull()
  })
})

describe('billingState', () => {
  it('Gratis nunca vence, aunque tenga una fecha vieja', () => {
    expect(billingState({ planId: 'free', currentPeriodEnd: inDays(-30) }, now)).toEqual({ kind: 'free' })
  })

  it('un plan pagado sin periodo (demo o presentación) no vence', () => {
    expect(billingState({ planId: 'pro', currentPeriodEnd: null }, now)).toEqual({ kind: 'open_ended', planId: 'pro' })
    expect(billingState({ planId: 'pro', currentPeriodEnd: 'basura' }, now).kind).toBe('open_ended')
  })

  it('vigente con más de 7 días', () => {
    expect(billingState({ planId: 'pro', currentPeriodEnd: inDays(10) }, now)).toMatchObject({ kind: 'active', daysLeft: 10 })
    expect(billingState({ planId: 'pro', currentPeriodEnd: inDays(7, 1) }, now)).toMatchObject({ kind: 'active', daysLeft: 8 })
  })

  it('por vencer desde 7 días antes', () => {
    expect(billingState({ planId: 'pro', currentPeriodEnd: inDays(7) }, now)).toMatchObject({ kind: 'expiring', daysLeft: 7 })
    expect(billingState({ planId: 'starter', currentPeriodEnd: inDays(3, -3_600_000) }, now)).toMatchObject({ kind: 'expiring', daysLeft: 3 })
  })

  it('vencido desde el instante exacto del fin', () => {
    expect(billingState({ planId: 'pro', currentPeriodEnd: now.toISOString() }, now).kind).toBe('expired')
    expect(billingState({ planId: 'enterprise', currentPeriodEnd: inDays(-1) }, now).kind).toBe('expired')
  })
})

describe('noticeKindFor', () => {
  it.each([
    [10, null], [8, null], [7, 'd7'], [4, 'd7'], [3, 'd3'], [2, 'd3'], [1, 'd1'], [0, 'd0'], [-2, 'd0'],
  ] as const)('%i días → %s', (days, kind) => {
    expect(noticeKindFor(days)).toBe(kind)
  })
})

describe('formatExpiryDate', () => {
  it('usa la fecha de Monterrey', () => {
    expect(formatExpiryDate('2026-11-13T05:59:00Z')).toBe('12 de noviembre de 2026')
    expect(formatExpiryDate('2026-11-13T06:00:00Z')).toBe('13 de noviembre de 2026')
  })
})
```

Crear `apps/web/lib/billing/expiry-copy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { billingState } from './expiry'
import { adminExpiryLabel, expiryBanner, planStatusLine } from './expiry-copy'
import type { PlanId } from '@/lib/plans/types'

const now = new Date('2026-10-13T15:00:00.000Z')
const stateOf = (planId: PlanId, end: string | null) => billingState({ planId, currentPeriodEnd: end }, now)

describe('expiryBanner', () => {
  it('avisa en amarillo con los días que faltan', () => {
    expect(expiryBanner(stateOf('pro', '2026-10-16T14:00:00Z'))).toEqual({
      tone: 'warning',
      message: 'Tu plan Taller vence en 3 días. Al vencer, la cuenta queda en solo lectura hasta renovar.',
      ctaLabel: 'Renovar',
      ctaHref: '/dashboard/billing',
    })
  })

  it('usa singular con 1 día', () => {
    expect(expiryBanner(stateOf('starter', '2026-10-14T10:00:00Z'))?.message).toContain('vence en 1 día.')
  })

  it('en rojo y con la fecha cuando ya venció', () => {
    const banner = expiryBanner(stateOf('pro', '2026-10-12T18:00:00Z'))
    expect(banner?.tone).toBe('danger')
    expect(banner?.message).toContain('venció el 12 de octubre de 2026')
    expect(banner?.message).toContain('no crear, editar ni enviar')
  })

  it('no muestra nada si falta más de una semana, en Gratis ni sin vencimiento', () => {
    expect(expiryBanner(stateOf('pro', '2026-11-13T15:00:00Z'))).toBeNull()
    expect(expiryBanner(stateOf('free', null))).toBeNull()
    expect(expiryBanner(stateOf('pro', null))).toBeNull()
  })
})

describe('planStatusLine', () => {
  it('muestra el plan y la fecha de vencimiento', () => {
    expect(planStatusLine(stateOf('pro', '2026-11-13T15:00:00Z'))).toBe('Plan Taller · vence el 13 de noviembre de 2026')
  })

  it('describe Gratis, sin vencimiento y vencido', () => {
    expect(planStatusLine(stateOf('free', null))).toBe('Plan Gratis · sin vencimiento')
    expect(planStatusLine(stateOf('enterprise', null))).toBe('Plan Empresa · sin fecha de vencimiento')
    expect(planStatusLine(stateOf('pro', '2026-10-12T18:00:00Z'))).toBe('Plan Taller · venció el 12 de octubre de 2026 · solo lectura')
  })
})

describe('adminExpiryLabel', () => {
  it('resume el vencimiento para la tabla de /admin', () => {
    expect(adminExpiryLabel(stateOf('pro', '2026-11-13T15:00:00Z'))).toBe('Vence en 31 días')
    expect(adminExpiryLabel(stateOf('pro', '2026-10-12T18:00:00Z'))).toBe('Vencido')
    expect(adminExpiryLabel(stateOf('free', null))).toBe('Gratis · no vence')
    expect(adminExpiryLabel(stateOf('pro', null))).toBe('Sin vencimiento')
  })
})
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/billing/expiry.test.ts lib/billing/expiry-copy.test.ts`
Expected: FAIL con `Failed to resolve import "./expiry"`.

- [ ] **Step 3: Escribir los tipos**

Crear `apps/web/lib/billing/types.ts`:

```ts
import type { PlanId } from '@/lib/plans/types'

export interface OrganizationBillingRow {
  readonly plan: string | null
  readonly current_period_end: string | null
}

export interface BillingSnapshot {
  readonly planId: PlanId
  readonly currentPeriodEnd: string | null
}

export type PaidPlanId = Exclude<PlanId, 'free'>

export type BillingState =
  | { readonly kind: 'free' }
  | { readonly kind: 'open_ended'; readonly planId: PaidPlanId }
  | { readonly kind: 'active'; readonly planId: PaidPlanId; readonly periodEnd: string; readonly daysLeft: number }
  | { readonly kind: 'expiring'; readonly planId: PaidPlanId; readonly periodEnd: string; readonly daysLeft: number }
  | { readonly kind: 'expired'; readonly planId: PaidPlanId; readonly periodEnd: string }

export type BillingNoticeKind = 'd7' | 'd3' | 'd1' | 'd0'

export interface ExpiryBanner {
  readonly tone: 'warning' | 'danger'
  readonly message: string
  readonly ctaLabel: string
  readonly ctaHref: string
}

export interface BillingBadge {
  readonly label: string
  readonly tone: 'success' | 'info' | 'neutral' | 'danger'
}

export type PlanCheckoutOption =
  | { readonly kind: 'current' }
  | { readonly kind: 'included' }
  | { readonly kind: 'too_small' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'stripe' }
  | { readonly kind: 'mercadopago'; readonly url: string; readonly renewing: boolean }
  | { readonly kind: 'whatsapp'; readonly url: string | null; readonly total: number }

export interface CheckoutEnv {
  readonly MP_LINK_STARTER?: string
  readonly MP_LINK_PRO?: string
  readonly MP_LINK_ENTERPRISE?: string
  readonly SUPPORT_WHATSAPP_PHONE?: string
}

export interface DueNotice {
  readonly organizationId: string
  readonly organizationName: string
  readonly planId: PaidPlanId
  /** Texto tal como lo regresa PostgREST; se devuelve igual al reclamar para que la llave coincida al microsegundo. */
  readonly periodEnd: string
  readonly ownerEmail: string | null
  readonly ownerName: string | null
  readonly sentKinds: readonly BillingNoticeKind[]
}
```

- [ ] **Step 4: Escribir `expiry.ts`**

Crear `apps/web/lib/billing/expiry.ts`:

```ts
import { isPlanId } from '@/lib/plans/catalog'
import type { BillingNoticeKind, BillingSnapshot, BillingState, OrganizationBillingRow } from './types'

const DAY_MS = 86_400_000
export const EXPIRY_WARNING_DAYS = 7
export const BILLING_TIME_ZONE = 'America/Monterrey'

export function snapshotFromRow(row: OrganizationBillingRow | null | undefined): BillingSnapshot {
  const plan = row?.plan
  return { planId: plan && isPlanId(plan) ? plan : 'free', currentPeriodEnd: row?.current_period_end ?? null }
}

/** Días que faltan, redondeados hacia arriba: 2 días y 1 hora cuentan como 3. Null si la fecha no es válida. */
export function daysUntilExpiry(periodEnd: string, now: Date): number | null {
  const end = new Date(periodEnd).getTime()
  if (Number.isNaN(end)) return null
  return Math.ceil((end - now.getTime()) / DAY_MS)
}

/** Debe coincidir con org_is_writable() de la migración 042. */
export function billingState(snapshot: BillingSnapshot, now: Date): BillingState {
  const { planId, currentPeriodEnd } = snapshot
  if (planId === 'free') return { kind: 'free' }
  const daysLeft = currentPeriodEnd ? daysUntilExpiry(currentPeriodEnd, now) : null
  if (!currentPeriodEnd || daysLeft === null) return { kind: 'open_ended', planId }
  if (new Date(currentPeriodEnd).getTime() <= now.getTime()) return { kind: 'expired', planId, periodEnd: currentPeriodEnd }
  if (daysLeft <= EXPIRY_WARNING_DAYS) return { kind: 'expiring', planId, periodEnd: currentPeriodEnd, daysLeft }
  return { kind: 'active', planId, periodEnd: currentPeriodEnd, daysLeft }
}

export function noticeKindFor(daysLeft: number): BillingNoticeKind | null {
  if (daysLeft <= 0) return 'd0'
  if (daysLeft === 1) return 'd1'
  if (daysLeft <= 3) return 'd3'
  if (daysLeft <= EXPIRY_WARNING_DAYS) return 'd7'
  return null
}

export function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: BILLING_TIME_ZONE,
  })
}
```

- [ ] **Step 5: Escribir `expiry-copy.ts`**

Crear `apps/web/lib/billing/expiry-copy.ts`:

```ts
import { PLANS } from '@/lib/plans/catalog'
import { formatExpiryDate } from './expiry'
import type { BillingState, ExpiryBanner } from './types'

const RENEW_HREF = '/dashboard/billing'

export function daysLabel(days: number): string {
  return days === 1 ? '1 día' : `${days} días`
}

export function expiryBanner(state: BillingState): ExpiryBanner | null {
  if (state.kind === 'expiring') {
    return {
      tone: 'warning',
      message: `Tu plan ${PLANS[state.planId].name} vence en ${daysLabel(state.daysLeft)}. Al vencer, la cuenta queda en solo lectura hasta renovar.`,
      ctaLabel: 'Renovar',
      ctaHref: RENEW_HREF,
    }
  }
  if (state.kind === 'expired') {
    return {
      tone: 'danger',
      message: `Tu plan ${PLANS[state.planId].name} venció el ${formatExpiryDate(state.periodEnd)}. La cuenta está en solo lectura: puedes ver y descargar todo, pero no crear, editar ni enviar.`,
      ctaLabel: 'Renovar',
      ctaHref: RENEW_HREF,
    }
  }
  return null
}

export function planStatusLine(state: BillingState): string {
  switch (state.kind) {
    case 'free':
      return 'Plan Gratis · sin vencimiento'
    case 'open_ended':
      return `Plan ${PLANS[state.planId].name} · sin fecha de vencimiento`
    case 'expired':
      return `Plan ${PLANS[state.planId].name} · venció el ${formatExpiryDate(state.periodEnd)} · solo lectura`
    default:
      return `Plan ${PLANS[state.planId].name} · vence el ${formatExpiryDate(state.periodEnd)}`
  }
}

export function adminExpiryLabel(state: BillingState): string {
  switch (state.kind) {
    case 'free':
      return 'Gratis · no vence'
    case 'open_ended':
      return 'Sin vencimiento'
    case 'expired':
      return 'Vencido'
    default:
      return `Vence en ${daysLabel(state.daysLeft)}`
  }
}
```

- [ ] **Step 6: Correr las pruebas y confirmar que pasan**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/billing/expiry.test.ts lib/billing/expiry-copy.test.ts`
Expected: PASS (todas).

- [ ] **Step 7: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/lib/billing/types.ts apps/web/lib/billing/expiry.ts apps/web/lib/billing/expiry-copy.ts apps/web/lib/billing/expiry.test.ts apps/web/lib/billing/expiry-copy.test.ts
git commit -m "feat: estado de vencimiento del plan y textos de aviso"
```

---

### Task 5: `assertWritable` y bloqueo 402 en las rutas de cotizaciones

**Files:**
- Create: `apps/web/lib/billing/writable.ts`
- Create: `apps/web/lib/billing/require-writable-member.ts`
- Test: `apps/web/lib/billing/writable.test.ts`
- Modify: `apps/web/app/api/quotes/route.ts` (POST), `apps/web/app/api/quotes/[id]/route.ts` (PATCH, DELETE), `apps/web/app/api/quotes/[id]/send/route.ts` (POST), `apps/web/app/api/quotes/[id]/payments/route.ts` (POST), `apps/web/app/api/quotes/[id]/payments/[paymentId]/route.ts` (DELETE), `apps/web/app/api/quotes/[id]/review-request/route.ts` (POST)

**Interfaces:**
- Consumes: RPC `current_org_is_writable()` (Task 1); `requireMember(allowed?)` y `MemberResult` de `lib/auth/require-member.ts`.
- Produces:
  - `PLAN_EXPIRED_CODE = 'PLAN_EXPIRED'`, `PLAN_EXPIRED_MESSAGE: string`
  - `planExpiredResponse(): NextResponse` (402, `{ error, code }`)
  - `assertWritable(supabase: SupabaseClient): Promise<NextResponse | null>` — `null` si puede escribir; falla abierta ante error de la RPC.
  - `requireWritableMember(allowed?: readonly MemberRole[]): Promise<MemberResult>`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `apps/web/lib/billing/writable.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PLAN_EXPIRED_CODE, assertWritable } from './writable'

function fakeClient(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result)
  return { client: { rpc } as unknown as SupabaseClient, rpc }
}

describe('assertWritable', () => {
  it('deja pasar cuando la organización puede escribir', async () => {
    const { client, rpc } = fakeClient({ data: true, error: null })
    expect(await assertWritable(client)).toBeNull()
    expect(rpc).toHaveBeenCalledWith('current_org_is_writable')
  })

  it('responde 402 en español cuando el plan venció', async () => {
    const { client } = fakeClient({ data: false, error: null })
    const res = await assertWritable(client)
    if (!res) throw new Error('se esperaba una respuesta 402')
    expect(res.status).toBe(402)
    const body: { error: string; code: string } = await res.json()
    expect(body.code).toBe(PLAN_EXPIRED_CODE)
    expect(body.error).toContain('solo lectura')
  })

  it('falla abierta si la consulta del plan falla', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'boom' } })
    expect(await assertWritable(client)).toBeNull()
  })
})
```

- [ ] **Step 2: Correr la prueba y confirmar que falla**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/billing/writable.test.ts`
Expected: FAIL con `Failed to resolve import "./writable"`.

- [ ] **Step 3: Escribir la implementación**

Crear `apps/web/lib/billing/writable.ts`:

```ts
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const PLAN_EXPIRED_CODE = 'PLAN_EXPIRED'
export const PLAN_EXPIRED_MESSAGE =
  'Tu plan venció y la cuenta está en solo lectura. Renueva en Facturación para volver a crear, editar o enviar.'

export function planExpiredResponse(): NextResponse {
  return NextResponse.json({ error: PLAN_EXPIRED_MESSAGE, code: PLAN_EXPIRED_CODE }, { status: 402 })
}

/** null si la organización de quien llama puede escribir; si su plan venció, la respuesta 402 lista para regresar. */
export async function assertWritable(supabase: SupabaseClient): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc('current_org_is_writable')
  if (error) {
    // Falla abierta: el bloqueo es de cobro, no de seguridad; un error de lectura no debe frenar a un cliente al corriente.
    logger.error('current_org_is_writable failed', error)
    return null
  }
  return data === false ? planExpiredResponse() : null
}
```

Crear `apps/web/lib/billing/require-writable-member.ts`:

```ts
import { requireMember, type MemberResult, type MemberRole } from '@/lib/auth/require-member'
import { assertWritable } from './writable'

/** requireMember() más el bloqueo de solo lectura por plan vencido (402). */
export async function requireWritableMember(allowed?: readonly MemberRole[]): Promise<MemberResult> {
  const auth = await requireMember(allowed)
  if (!auth.ok) return auth
  const blocked = await assertWritable(auth.ctx.supabase)
  return blocked ? { ok: false, response: blocked } : auth
}
```

- [ ] **Step 4: Correr la prueba y confirmar que pasa**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/billing/writable.test.ts`
Expected: PASS (3 pruebas).

- [ ] **Step 5: Aplicar el bloqueo en las rutas de cotizaciones**

En cada handler de la tabla, agregar el import `import { assertWritable } from '@/lib/billing/writable'` y, **inmediatamente después del bloque que responde 401** (`if (authError || !user) { ... }`), insertar:

```ts
    const blocked = await assertWritable(supabase)
    if (blocked) return blocked
```

| Archivo | Handler | Bloque 401 (línea aprox.) |
|---|---|---|
| `apps/web/app/api/quotes/route.ts` | `POST` | 92–94 |
| `apps/web/app/api/quotes/[id]/route.ts` | `PATCH` | 103–105 |
| `apps/web/app/api/quotes/[id]/route.ts` | `DELETE` | 302–304 |
| `apps/web/app/api/quotes/[id]/send/route.ts` | `POST` | 31–33 |
| `apps/web/app/api/quotes/[id]/payments/route.ts` | `POST` | 122–124 |
| `apps/web/app/api/quotes/[id]/payments/[paymentId]/route.ts` | `DELETE` | 24–26 |

Los `GET` de esos archivos **no** se tocan (ver y descargar sigue permitido).

En `apps/web/app/api/quotes/[id]/review-request/route.ts` cambiar el import y la llamada de la línea 19:

```ts
import { requireWritableMember } from '@/lib/billing/require-writable-member'
```

```ts
  const auth = await requireWritableMember(['owner', 'admin', 'member'])
```

y quitar el import de `requireMember` si ya no se usa en el archivo.

- [ ] **Step 6: Verificar tipos y pruebas**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run lib/billing`
Expected: sin errores de tipos; PASS. (El 402 de punta a punta se prueba en la Task 13, escenario "plan vencido".)

- [ ] **Step 7: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/lib/billing/writable.ts apps/web/lib/billing/writable.test.ts apps/web/lib/billing/require-writable-member.ts apps/web/app/api/quotes
git commit -m "feat: solo lectura con 402 en cotizaciones cuando el plan vence"
```

---

### Task 6: Bloqueo 402 en el resto de las rutas que escriben

**Files:**
- Modify: las rutas de la tabla de abajo (solo los handlers que escriben).

**Interfaces:**
- Consumes: `assertWritable(supabase)` y `requireWritableMember(allowed?)` (Task 5).
- Produces: todas las rutas de escritura del negocio responden 402 `PLAN_EXPIRED` con el plan vencido.

- [ ] **Step 1: Listar las rutas que aún no tienen el bloqueo (prueba que falla)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web
for f in $(grep -rlE "export async function (POST|PATCH|PUT|DELETE)" app/api | sort); do
  grep -qE "assertWritable\(|requireWritableMember\(" "$f" || echo "SIN BLOQUEO: $f"
done
```

Expected ahora: la lista incluye, además de las 13 exentas del Step 4, los 28 archivos de las tablas de los Steps 2 y 3.

- [ ] **Step 2: Rutas con autenticación en línea**

En cada una: import `import { assertWritable } from '@/lib/billing/writable'` e insertar, inmediatamente después del bloque que responde 401 del handler indicado:

```ts
    const blocked = await assertWritable(supabase)
    if (blocked) return blocked
```

En `team/members/[id]` el bloque 401 es de una línea (`if (!user) return NextResponse.json(...)`); el snippet va en la línea siguiente, con la sangría del archivo (2 espacios).

| Archivo | Handlers | Bloque 401 (línea aprox.) |
|---|---|---|
| `apps/web/app/api/calendar/events/route.ts` | `POST` | 121 |
| `apps/web/app/api/calendar/events/[id]/route.ts` | `PATCH`, `DELETE` | 87, 167 |
| `apps/web/app/api/clients/route.ts` | `POST` | 123 |
| `apps/web/app/api/clients/[id]/route.ts` | `PATCH`, `DELETE` | 63, 129 |
| `apps/web/app/api/custom-fields/route.ts` | `POST` | 91 |
| `apps/web/app/api/custom-fields/[id]/route.ts` | `PATCH`, `DELETE` | 78, 145 |
| `apps/web/app/api/reminders/route.ts` | `POST` | 164 |
| `apps/web/app/api/reminders/[id]/route.ts` | `PATCH`, `DELETE` | 93, 179 |
| `apps/web/app/api/reminders/[id]/complete/route.ts` | `POST` | 22 |
| `apps/web/app/api/reminders/[id]/snooze/route.ts` | `POST` | 29 |
| `apps/web/app/api/services/route.ts` | `POST` | 82 |
| `apps/web/app/api/services/[id]/route.ts` | `PATCH`, `DELETE` | 59, 123 |
| `apps/web/app/api/settings/organization/route.ts` | `PATCH` | 26 |
| `apps/web/app/api/team/invitations/route.ts` | `POST` | 89 |
| `apps/web/app/api/team/invitations/[id]/route.ts` | `DELETE` | 25 |
| `apps/web/app/api/team/members/[id]/route.ts` | `PATCH`, `DELETE` | 30, 51 |
| `apps/web/app/api/templates/route.ts` | `POST` | 87 |
| `apps/web/app/api/templates/[id]/route.ts` | `PATCH`, `DELETE` | 26, 148 |
| `apps/web/app/api/webhooks/route.ts` | `POST` | 70 |

- [ ] **Step 3: Rutas con `requireMember`**

Cambiar el import a `import { requireWritableMember } from '@/lib/billing/require-writable-member'` y la llamada **solo en el handler que escribe** (`requireMember(` → `requireWritableMember(` con los mismos roles). Si el archivo también tiene un `GET` con `requireMember`, conservar ambos imports.

| Archivo | Línea | Handler |
|---|---|---|
| `apps/web/app/api/organization/setup/route.ts` | 12 | `POST` |
| `apps/web/app/api/price-lists/route.ts` | 32 | `POST` (la 13 es `GET`: no se toca) |
| `apps/web/app/api/price-lists/[id]/route.ts` | 28, 64 | `PATCH`, `DELETE` |
| `apps/web/app/api/job-photos/[id]/route.ts` | 17 | `guard()` compartido por `PATCH` y `DELETE` |
| `apps/web/app/api/quote-requests/[id]/route.ts` | 12 | `PATCH` |
| `apps/web/app/api/quote-requests/[id]/convert/route.ts` | 29 | `POST` |
| `apps/web/app/api/showcase/profile/route.ts` | 26 | `PUT` (la 14 es `GET`: no se toca) |
| `apps/web/app/api/upload/brand-logo/route.ts` | 12 | `POST` |
| `apps/web/app/api/upload/job-photos/route.ts` | 19 | `POST` |

- [ ] **Step 4: Volver a listar (la prueba pasa)**

Repetir el comando del Step 1. Expected: **exactamente** estas rutas exentas, y ninguna otra:

```
SIN BLOQUEO: app/api/auth/logout/route.ts
SIN BLOQUEO: app/api/billing/checkout/route.ts
SIN BLOQUEO: app/api/billing/portal/route.ts
SIN BLOQUEO: app/api/cron/reminders-check/route.ts
SIN BLOQUEO: app/api/notifications/[id]/route.ts
SIN BLOQUEO: app/api/onboarding/checklist/route.ts
SIN BLOQUEO: app/api/pricing/preview/route.ts
SIN BLOQUEO: app/api/public/quote-requests/route.ts
SIN BLOQUEO: app/api/public/reviews/route.ts
SIN BLOQUEO: app/api/settings/password/route.ts
SIN BLOQUEO: app/api/settings/profile/route.ts
SIN BLOQUEO: app/api/team/invitations/accept/route.ts
SIN BLOQUEO: app/api/webhooks/stripe/route.ts
```

Si D1 ya está integrado en la rama, su ruta autenticada que crea o revoca la liga de la cotización también debe aparecer con bloqueo (no en esta lista); sus rutas públicas `/api/public/quotes/*` quedan exentas.

- [ ] **Step 5: Verificar tipos**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec tsc --noEmit -p .`
Expected: sin errores.

- [ ] **Step 6: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/app/api
git commit -m "feat: solo lectura con 402 en todas las rutas que escriben"
```

---

### Task 7: Revisiones de límites detrás de `PLAN_LIMITS_ENFORCED`

**Files:**
- Create: `apps/web/lib/plans/enforce-limits.ts`
- Test: `apps/web/lib/plans/enforce-limits.test.ts`
- Modify: `apps/web/app/api/quotes/route.ts` (POST), `apps/web/app/api/team/invitations/route.ts` (POST)

**Interfaces:**
- Consumes: `planLimitsEnforced`, `checkMonthlyQuotes`, `checkSeatLimit`, `monthStartIso` (Task 3); `isPlanId`.
- Produces:
  - `limitExceededResponse(check: Extract<LimitCheck, { allowed: false }>): NextResponse` (402, `{ error, code, upgrade_to }`)
  - `enforceMonthlyQuoteLimit(supabase: SupabaseClient, organizationId: string, now?: Date): Promise<NextResponse | null>`
  - `enforceSeatLimit(supabase: SupabaseClient, organizationId: string): Promise<NextResponse | null>`
  - Con el flag apagado ambas regresan `null` sin consultar la base.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `apps/web/lib/plans/enforce-limits.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enforceMonthlyQuoteLimit, enforceSeatLimit, limitExceededResponse } from './enforce-limits'
import { checkMonthlyQuotes } from './limits'

interface FakeQuery {
  readonly select: () => FakeQuery
  readonly eq: () => FakeQuery
  readonly single?: () => Promise<{ data: { plan: string }; error: null }>
  readonly gte?: () => Promise<{ count: number; error: null }>
}

function fakeClient(plan: string, quotesThisMonth: number): SupabaseClient {
  const orgQuery: FakeQuery = { select: () => orgQuery, eq: () => orgQuery, single: async () => ({ data: { plan }, error: null }) }
  const quotesQuery: FakeQuery = { select: () => quotesQuery, eq: () => quotesQuery, gte: async () => ({ count: quotesThisMonth, error: null }) }
  return { from: (table: string) => (table === 'organizations' ? orgQuery : quotesQuery) } as unknown as SupabaseClient
}

const untouchable = {
  from: () => {
    throw new Error('no debe consultar la base')
  },
} as unknown as SupabaseClient

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('con PLAN_LIMITS_ENFORCED apagado (piloto)', () => {
  it('no consulta la base ni bloquea', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'false')
    expect(await enforceMonthlyQuoteLimit(untouchable, 'org-1')).toBeNull()
    expect(await enforceSeatLimit(untouchable, 'org-1')).toBeNull()
  })
})

describe('con PLAN_LIMITS_ENFORCED=true', () => {
  it('bloquea la sexta cotización del mes en Gratis', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'true')
    const res = await enforceMonthlyQuoteLimit(fakeClient('free', 5), 'org-1', new Date('2026-10-13T18:00:00Z'))
    expect(res?.status).toBe(402)
  })

  it('no bloquea a un plan pagado', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'true')
    expect(await enforceMonthlyQuoteLimit(fakeClient('starter', 500), 'org-1')).toBeNull()
  })
})

describe('limitExceededResponse', () => {
  it('responde 402 con código, mensaje y plan sugerido', async () => {
    const check = checkMonthlyQuotes('free', 5)
    if (check.allowed) throw new Error('debió bloquear')
    const res = limitExceededResponse(check)
    expect(res.status).toBe(402)
    expect(await res.json()).toEqual({ error: check.message, code: 'MONTHLY_QUOTES', upgrade_to: 'starter' })
  })
})
```

- [ ] **Step 2: Correr la prueba y confirmar que falla**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/plans/enforce-limits.test.ts`
Expected: FAIL con `Failed to resolve import "./enforce-limits"`.

- [ ] **Step 3: Escribir la implementación**

Crear `apps/web/lib/plans/enforce-limits.ts`:

```ts
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { isPlanId } from './catalog'
import { checkMonthlyQuotes, checkSeatLimit, monthStartIso, planLimitsEnforced } from './limits'
import type { LimitCheck, PlanId } from './types'

export function limitExceededResponse(check: Extract<LimitCheck, { allowed: false }>): NextResponse {
  return NextResponse.json({ error: check.message, code: check.code, upgrade_to: check.upgradeTo }, { status: 402 })
}

async function organizationPlan(supabase: SupabaseClient, organizationId: string): Promise<PlanId | null> {
  const { data, error } = await supabase.from('organizations').select('plan').eq('id', organizationId).single()
  if (error || !data) return null
  const plan = (data as { plan: string | null }).plan
  return plan && isPlanId(plan) ? plan : 'free'
}

export async function enforceMonthlyQuoteLimit(
  supabase: SupabaseClient,
  organizationId: string,
  now: Date = new Date(),
): Promise<NextResponse | null> {
  if (!planLimitsEnforced()) return null
  const plan = await organizationPlan(supabase, organizationId)
  if (!plan) return null
  const { count, error } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', monthStartIso(now))
  if (error) {
    logger.error('Monthly quote count failed', error, { organizationId })
    return null
  }
  const check = checkMonthlyQuotes(plan, count ?? 0)
  return check.allowed ? null : limitExceededResponse(check)
}

export async function enforceSeatLimit(supabase: SupabaseClient, organizationId: string): Promise<NextResponse | null> {
  if (!planLimitsEnforced()) return null
  const plan = await organizationPlan(supabase, organizationId)
  if (!plan) return null
  const [members, pending] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()),
  ])
  const check = checkSeatLimit(plan, members.count ?? 0, pending.count ?? 0)
  return check.allowed ? null : limitExceededResponse(check)
}
```

- [ ] **Step 4: Correr la prueba y confirmar que pasa**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/plans`
Expected: PASS.

- [ ] **Step 5: Conectar las revisiones (inertes con el flag apagado)**

En `apps/web/app/api/quotes/route.ts`, `POST`: import `import { enforceMonthlyQuoteLimit } from '@/lib/plans/enforce-limits'` y, justo después del bloque `if (!profile) { ... 404 ... }`:

```ts
    const overLimit = await enforceMonthlyQuoteLimit(supabase, profile.organization_id)
    if (overLimit) return overLimit
```

En `apps/web/app/api/team/invitations/route.ts`, `POST`: import `import { enforceSeatLimit } from '@/lib/plans/enforce-limits'` y, justo después del bloque que responde `Permisos insuficientes` (403):

```ts
    const noSeat = await enforceSeatLimit(supabase, profile.organization_id)
    if (noSeat) return noSeat
```

- [ ] **Step 6: Verificar tipos**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec tsc --noEmit -p .`
Expected: sin errores.

- [ ] **Step 7: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/lib/plans/enforce-limits.ts apps/web/lib/plans/enforce-limits.test.ts apps/web/app/api/quotes/route.ts apps/web/app/api/team/invitations/route.ts
git commit -m "feat: revisión de límites por plan detrás de PLAN_LIMITS_ENFORCED"
```

---
### Task 8: Banner de vencimiento en el panel

**Files:**
- Create: `apps/web/components/dashboard/plan-expiry-banner.tsx`
- Modify: `apps/web/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `snapshotFromRow`, `billingState` (Task 4), `expiryBanner` (Task 4), `ExpiryBanner`, `OrganizationBillingRow`.
- Produces: `<PlanExpiryBanner banner={ExpiryBanner} />` con `data-testid="plan-banner-warning"` o `"plan-banner-danger"` (los usa la Task 13). Fijo arriba del contenido: queda fuera del `<main>` que hace scroll.

- [ ] **Step 1: Escribir el componente**

Crear `apps/web/components/dashboard/plan-expiry-banner.tsx` (Server Component, sin `'use client'`):

```tsx
import Link from 'next/link'
import { AlertTriangle, Lock } from 'lucide-react'
import type { ExpiryBanner } from '@/lib/billing/types'

const TONE_CLASS: Readonly<Record<ExpiryBanner['tone'], string>> = {
  warning: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-100',
  danger: 'bg-red-600 border-red-700 text-white',
}

const CTA_CLASS: Readonly<Record<ExpiryBanner['tone'], string>> = {
  warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  danger: 'bg-white hover:bg-red-50 text-red-700',
}

export function PlanExpiryBanner({ banner }: { readonly banner: ExpiryBanner }) {
  const Icon = banner.tone === 'danger' ? Lock : AlertTriangle
  return (
    <div
      role={banner.tone === 'danger' ? 'alert' : 'status'}
      data-testid={`plan-banner-${banner.tone}`}
      className={`flex flex-wrap items-center gap-3 border-b px-4 py-2 text-sm ${TONE_CLASS[banner.tone]}`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">{banner.message}</p>
      <Link href={banner.ctaHref} className={`rounded-md px-3 py-1 text-xs font-semibold ${CTA_CLASS[banner.tone]}`}>
        {banner.ctaLabel}
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Leer el periodo en el layout y mostrar el banner**

Reemplazar el contenido de `apps/web/app/(dashboard)/layout.tsx` por:

```tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { ClientLayout } from '@/components/dashboard/client-layout'
import { FAB } from '@/components/dashboard/fab'
import { PlanExpiryBanner } from '@/components/dashboard/plan-expiry-banner'
import type { CSSProperties } from 'react'
import { brandCssVars } from '@/lib/branding/color'
import { orgBranding } from '@/lib/branding/org-branding'
import { billingState, snapshotFromRow } from '@/lib/billing/expiry'
import { expiryBanner } from '@/lib/billing/expiry-copy'
import type { OrganizationBillingRow } from '@/lib/billing/types'

type LayoutOrganization = OrganizationBillingRow & { readonly name: string | null; readonly settings: unknown }

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(name, settings, plan, current_period_end)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  const organization = profile.organizations as unknown as LayoutOrganization | null
  const branding = orgBranding(organization?.name, organization?.settings)
  const banner = expiryBanner(billingState(snapshotFromRow(organization), new Date()))

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-gray-950" style={brandCssVars(branding.palette) as CSSProperties}>
      <DashboardSidebar
        user={user}
        profile={profile}
        branding={branding}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader user={user} profile={profile} />

        {banner && <PlanExpiryBanner banner={banner} />}

        {/* ClientLayout adds: ToastProvider, keyboard shortcuts, page transitions */}
        <ClientLayout>
          {children}
        </ClientLayout>

        <FAB />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos, pruebas y build**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run lib/billing`
Expected: sin errores; PASS. (La visibilidad del banner amarillo y rojo se prueba en la Task 13.)

- [ ] **Step 4: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/components/dashboard/plan-expiry-banner.tsx "apps/web/app/(dashboard)/layout.tsx"
git commit -m "feat: banner de plan por vencer y vencido en el panel"
```

---

### Task 9: Facturación con ligas de Mercado Pago, estado del plan y tabla de límites

**Files:**
- Create: `apps/web/lib/billing/checkout-option.ts`, `apps/web/lib/billing/badge.ts`
- Test: `apps/web/lib/billing/checkout-option.test.ts`, `apps/web/lib/billing/badge.test.ts`
- Create: `apps/web/components/billing/plan-cta.tsx`, `apps/web/components/billing/billing-summary-cards.tsx`, `apps/web/components/billing/plan-limits-table.tsx`
- Modify: `apps/web/components/billing/PlanSelector.tsx` (reemplazo), `apps/web/app/(dashboard)/dashboard/billing/BillingClient.tsx`, `apps/web/app/(dashboard)/dashboard/billing/page.tsx` (reemplazo)

**Interfaces:**
- Consumes: `PlanCheckoutOption`, `CheckoutEnv`, `BillingState`, `BillingBadge`, `PaidPlanId` (Task 4); `monthlyCost`, `formatMxn` (`lib/plans/pricing.ts`); `whatsappLink` (`lib/whatsapp/link.ts`); `planLimits`, `planLimitsEnforced` (Task 3); `getSubscriptionStatusLabel` (`lib/stripe/helpers.ts`).
- Produces:
  - `interface CheckoutContext { currentPlan: PlanId; state: BillingState; activeUsers: number; stripeEnabled: boolean; businessName: string; env: CheckoutEnv }`
  - `checkoutEnvFrom(env: Readonly<Record<string, string | undefined>>): CheckoutEnv`
  - `mercadoPagoLink(planId: PlanId, env: CheckoutEnv): string | null`
  - `hasMercadoPagoLinks(env: CheckoutEnv): boolean`
  - `checkoutOptionFor(planId: PlanId, ctx: CheckoutContext): PlanCheckoutOption`
  - `checkoutOptionsFor(ctx: CheckoutContext): Readonly<Record<PlanId, PlanCheckoutOption>>`
  - `plansIntro(mercadoPagoEnabled: boolean, options: Readonly<Record<PlanId, PlanCheckoutOption>>): string`
  - `billingBadge(state: BillingState, subscriptionStatus: string | null): BillingBadge`
  - `data-testid="plan-status-line"` en la tarjeta "Plan actual" y `data-testid="plan-limits-table"` (Task 13).

- [ ] **Step 1: Línea base de la E2E de Facturación**

Con el servidor local corriendo en 3100:

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && PLAYWRIGHT_TEST_BASE_URL=http://localhost:3100 pnpm exec playwright test e2e/specs/13-billing.spec.ts --reporter=line`
Expected: anotar qué pruebas pasan y cuáles fallan **antes** del cambio (la prueba "shows upgrade/manage button" busca textos en inglés y puede fallar ya hoy). El Step 9 compara contra esta línea base.

- [ ] **Step 2: Escribir las pruebas que fallan**

Crear `apps/web/lib/billing/checkout-option.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { billingState } from './expiry'
import {
  checkoutOptionFor,
  checkoutOptionsFor,
  hasMercadoPagoLinks,
  mercadoPagoLink,
  plansIntro,
  type CheckoutContext,
} from './checkout-option'

const now = new Date('2026-10-13T15:00:00Z')
const env = {
  MP_LINK_STARTER: 'https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=solo',
  MP_LINK_PRO: 'https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=taller',
  MP_LINK_ENTERPRISE: ' https://mpago.la/empresa ',
  SUPPORT_WHATSAPP_PHONE: '8112345678',
}
const base: CheckoutContext = {
  currentPlan: 'free',
  state: billingState({ planId: 'free', currentPeriodEnd: null }, now),
  activeUsers: 1,
  stripeEnabled: false,
  businessName: 'Plomería Don Beto',
  env,
}

describe('mercadoPagoLink', () => {
  it('lee la liga de cada plan y recorta espacios', () => {
    expect(mercadoPagoLink('starter', env)).toBe(env.MP_LINK_STARTER)
    expect(mercadoPagoLink('enterprise', env)).toBe('https://mpago.la/empresa')
  })

  it('ignora valores que no son ligas https', () => {
    expect(mercadoPagoLink('pro', { MP_LINK_PRO: 'http://mpago.la/x' })).toBeNull()
    expect(mercadoPagoLink('pro', { MP_LINK_PRO: 'javascript:alert(1)' })).toBeNull()
    expect(mercadoPagoLink('pro', { MP_LINK_PRO: 'no es liga' })).toBeNull()
  })

  it('Gratis no tiene liga', () => {
    expect(mercadoPagoLink('free', env)).toBeNull()
  })
})

describe('checkoutOptionFor', () => {
  it('sin variables, los planes pagados quedan en Próximamente', () => {
    expect(checkoutOptionFor('pro', { ...base, env: {} })).toEqual({ kind: 'unavailable' })
  })

  it('si Stripe está configurado y no hay liga, conserva el flujo de Stripe', () => {
    expect(checkoutOptionFor('pro', { ...base, env: {}, stripeEnabled: true })).toEqual({ kind: 'stripe' })
  })

  it('muestra la liga de Mercado Pago del plan', () => {
    expect(checkoutOptionFor('starter', base)).toEqual({ kind: 'mercadopago', url: env.MP_LINK_STARTER, renewing: false })
  })

  it('con más usuarios que los incluidos manda a WhatsApp con el total exacto', () => {
    const option = checkoutOptionFor('pro', { ...base, activeUsers: 5 })
    expect(option).toMatchObject({ kind: 'whatsapp', total: 999 + 2 * 99 })
    if (option.kind !== 'whatsapp') throw new Error('se esperaba WhatsApp')
    expect(option.url).toContain('https://wa.me/528112345678')
    expect(decodeURIComponent(option.url ?? '')).toContain('1,197')
    expect(decodeURIComponent(option.url ?? '')).toContain('Plomería Don Beto')
  })

  it('sin teléfono de soporte no hay botón, pero sí el total', () => {
    expect(checkoutOptionFor('pro', { ...base, activeUsers: 5, env: { ...env, SUPPORT_WHATSAPP_PHONE: undefined } }))
      .toEqual({ kind: 'whatsapp', total: 1197, url: null })
  })

  it('Solo no alcanza para un equipo de 2', () => {
    expect(checkoutOptionFor('starter', { ...base, activeUsers: 2 })).toEqual({ kind: 'too_small' })
  })

  it('el plan actual vigente no se vuelve a contratar', () => {
    const ctx: CheckoutContext = { ...base, currentPlan: 'pro', state: billingState({ planId: 'pro', currentPeriodEnd: '2026-12-01T00:00:00Z' }, now) }
    expect(checkoutOptionFor('pro', ctx)).toEqual({ kind: 'current' })
  })

  it('el plan actual vencido o por vencer ofrece renovar con la misma liga', () => {
    const ctx: CheckoutContext = { ...base, currentPlan: 'pro', state: billingState({ planId: 'pro', currentPeriodEnd: '2026-10-12T00:00:00Z' }, now) }
    expect(checkoutOptionFor('pro', ctx)).toEqual({ kind: 'mercadopago', url: env.MP_LINK_PRO, renewing: true })
  })

  it('Gratis es "Incluido" salvo que sea el plan actual', () => {
    expect(checkoutOptionFor('free', base)).toEqual({ kind: 'current' })
    expect(checkoutOptionFor('free', { ...base, currentPlan: 'pro' })).toEqual({ kind: 'included' })
  })

  it('arma las cuatro tarjetas', () => {
    expect(Object.keys(checkoutOptionsFor(base))).toEqual(['free', 'starter', 'pro', 'enterprise'])
  })
})

describe('hasMercadoPagoLinks y plansIntro', () => {
  it('detecta si hay al menos una liga válida', () => {
    expect(hasMercadoPagoLinks(env)).toBe(true)
    expect(hasMercadoPagoLinks({ MP_LINK_PRO: 'http://inseguro' })).toBe(false)
  })

  it('explica cómo se contrata', () => {
    expect(plansIntro(true, checkoutOptionsFor(base))).toContain('Mercado Pago')
    expect(plansIntro(false, checkoutOptionsFor({ ...base, env: {} }))).toContain('próximamente')
  })
})
```

Crear `apps/web/lib/billing/badge.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { billingBadge } from './badge'
import { billingState } from './expiry'

const now = new Date('2026-10-13T15:00:00Z')

describe('billingBadge', () => {
  it('Gratis no muestra periodo de prueba', () => {
    expect(billingBadge(billingState({ planId: 'free', currentPeriodEnd: null }, now), 'trialing')).toEqual({ label: 'Gratis', tone: 'neutral' })
  })

  it('vencido en rojo y por vencer en azul', () => {
    expect(billingBadge(billingState({ planId: 'pro', currentPeriodEnd: '2026-10-12T00:00:00Z' }, now), 'active')).toEqual({ label: 'Vencido', tone: 'danger' })
    expect(billingBadge(billingState({ planId: 'pro', currentPeriodEnd: '2026-10-15T00:00:00Z' }, now), 'active')).toEqual({ label: 'Por vencer', tone: 'info' })
  })

  it('vigente usa la etiqueta del estado de la suscripción', () => {
    expect(billingBadge(billingState({ planId: 'pro', currentPeriodEnd: '2026-12-01T00:00:00Z' }, now), 'active')).toEqual({ label: 'Activa', tone: 'success' })
    expect(billingBadge(billingState({ planId: 'pro', currentPeriodEnd: null }, now), 'trialing')).toEqual({ label: 'Periodo de prueba', tone: 'info' })
  })
})
```

- [ ] **Step 3: Correr las pruebas y confirmar que fallan**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/billing/checkout-option.test.ts lib/billing/badge.test.ts`
Expected: FAIL con `Failed to resolve import "./checkout-option"` y `"./badge"`.

- [ ] **Step 4: Escribir `checkout-option.ts` y `badge.ts`**

Crear `apps/web/lib/billing/checkout-option.ts`:

```ts
import { PLANS } from '@/lib/plans/catalog'
import { formatMxn, monthlyCost } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'
import { whatsappLink } from '@/lib/whatsapp/link'
import type { BillingState, CheckoutEnv, PaidPlanId, PlanCheckoutOption } from './types'

const LINK_ENV: Readonly<Record<PaidPlanId, 'MP_LINK_STARTER' | 'MP_LINK_PRO' | 'MP_LINK_ENTERPRISE'>> = {
  starter: 'MP_LINK_STARTER',
  pro: 'MP_LINK_PRO',
  enterprise: 'MP_LINK_ENTERPRISE',
}

export interface CheckoutContext {
  readonly currentPlan: PlanId
  readonly state: BillingState
  readonly activeUsers: number
  readonly stripeEnabled: boolean
  readonly businessName: string
  readonly env: CheckoutEnv
}

export function checkoutEnvFrom(env: Readonly<Record<string, string | undefined>>): CheckoutEnv {
  return {
    MP_LINK_STARTER: env.MP_LINK_STARTER,
    MP_LINK_PRO: env.MP_LINK_PRO,
    MP_LINK_ENTERPRISE: env.MP_LINK_ENTERPRISE,
    SUPPORT_WHATSAPP_PHONE: env.SUPPORT_WHATSAPP_PHONE,
  }
}

/** Solo ligas https; cualquier otro valor cuenta como no configurado. */
export function mercadoPagoLink(planId: PlanId, env: CheckoutEnv): string | null {
  if (planId === 'free') return null
  const raw = env[LINK_ENV[planId]]?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function hasMercadoPagoLinks(env: CheckoutEnv): boolean {
  return (['starter', 'pro', 'enterprise'] as const).some((planId) => mercadoPagoLink(planId, env) !== null)
}

function supportMessage(planId: PaidPlanId, ctx: CheckoutContext, total: number): string {
  return `Hola, quiero contratar el plan ${PLANS[planId].name} para ${ctx.businessName} con ${ctx.activeUsers} usuarios (${formatMxn(total)} al mes). ¿Me mandan la liga de pago?`
}

export function checkoutOptionFor(planId: PlanId, ctx: CheckoutContext): PlanCheckoutOption {
  const renewing = ctx.state.kind === 'expired' || ctx.state.kind === 'expiring'
  if (planId === ctx.currentPlan && (planId === 'free' || !renewing)) return { kind: 'current' }
  if (planId === 'free') return { kind: 'included' }
  const cost = monthlyCost(planId, ctx.activeUsers)
  if (cost.overLimit > 0) return { kind: 'too_small' }
  const link = mercadoPagoLink(planId, ctx.env)
  if (!link) return ctx.stripeEnabled ? { kind: 'stripe' } : { kind: 'unavailable' }
  if (cost.extraUsers > 0) {
    return { kind: 'whatsapp', total: cost.total, url: whatsappLink(ctx.env.SUPPORT_WHATSAPP_PHONE, supportMessage(planId, ctx, cost.total)) }
  }
  return { kind: 'mercadopago', url: link, renewing: planId === ctx.currentPlan }
}

export function checkoutOptionsFor(ctx: CheckoutContext): Readonly<Record<PlanId, PlanCheckoutOption>> {
  return {
    free: checkoutOptionFor('free', ctx),
    starter: checkoutOptionFor('starter', ctx),
    pro: checkoutOptionFor('pro', ctx),
    enterprise: checkoutOptionFor('enterprise', ctx),
  }
}

export function plansIntro(mercadoPagoEnabled: boolean, options: Readonly<Record<PlanId, PlanCheckoutOption>>): string {
  if (mercadoPagoEnabled) return 'Contrata con Mercado Pago. Activamos tu plan en cuanto confirmamos el pago.'
  if (Object.values(options).some((option) => option.kind === 'stripe')) return 'El costo se calcula con los usuarios activos de tu cuenta.'
  return 'La contratación en línea estará disponible próximamente. Mientras tanto tu cuenta conserva su plan actual.'
}
```

Crear `apps/web/lib/billing/badge.ts`:

```ts
import { getSubscriptionStatusLabel } from '@/lib/stripe/helpers'
import type { BillingBadge, BillingState } from './types'

export function billingBadge(state: BillingState, subscriptionStatus: string | null): BillingBadge {
  if (state.kind === 'free') return { label: 'Gratis', tone: 'neutral' }
  if (state.kind === 'expired') return { label: 'Vencido', tone: 'danger' }
  if (state.kind === 'expiring') return { label: 'Por vencer', tone: 'info' }
  const status = subscriptionStatus ?? 'active'
  return { label: getSubscriptionStatusLabel(status), tone: status === 'active' ? 'success' : 'info' }
}
```

- [ ] **Step 5: Correr las pruebas y confirmar que pasan**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/billing`
Expected: PASS.

- [ ] **Step 6: Escribir los componentes nuevos**

Crear `apps/web/components/billing/plan-cta.tsx`:

```tsx
'use client'

import { ExternalLink, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMxn } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'
import type { PlanCheckoutOption } from '@/lib/billing/types'

interface PlanCtaProps {
  readonly planId: PlanId
  readonly option: PlanCheckoutOption
  readonly canManage: boolean
  readonly loading: boolean
  readonly onSelectPlan: (planId: PlanId) => Promise<void>
}

const LINK_CLASS =
  'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600'

const STATIC_LABELS: Readonly<Partial<Record<PlanCheckoutOption['kind'], string>>> = {
  current: 'Plan actual',
  included: 'Incluido',
  too_small: 'No alcanza para tu equipo',
  unavailable: 'Próximamente',
}

function WhatsappCta({ url, total }: { readonly url: string | null; readonly total: number }) {
  return (
    <div className="mt-4 space-y-2 text-center">
      <p className="text-xs text-gray-600 dark:text-gray-300">Te mandamos tu liga con el total exacto: {formatMxn(total)}/mes</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Pedir mi liga por WhatsApp
        </a>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">Escríbenos a soporte para recibir tu liga.</p>
      )}
    </div>
  )
}

export function PlanCta({ planId, option, canManage, loading, onSelectPlan }: PlanCtaProps) {
  const staticLabel = STATIC_LABELS[option.kind]
  if (staticLabel) {
    return (
      <Button variant={option.kind === 'current' ? 'outline' : 'default'} disabled className="w-full mt-4">
        {staticLabel}
      </Button>
    )
  }
  if (!canManage) {
    return <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">Pide al propietario que contrate el plan</p>
  }
  if (option.kind === 'stripe') {
    return (
      <Button onClick={() => onSelectPlan(planId)} disabled={loading} className="w-full mt-4">
        Elegir plan
      </Button>
    )
  }
  if (option.kind === 'mercadopago') {
    return (
      <a href={option.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS} data-testid={`mp-link-${planId}`}>
        {option.renewing ? 'Renovar con Mercado Pago' : 'Contratar con Mercado Pago'}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    )
  }
  if (option.kind === 'whatsapp') return <WhatsappCta url={option.url} total={option.total} />
  return null
}
```

Crear `apps/web/components/billing/billing-summary-cards.tsx`:

```tsx
import { EXTRA_USER_MONTHLY_PRICE } from '@/lib/plans/catalog'
import { formatMxn } from '@/lib/plans/pricing'
import type { MonthlyCost } from '@/lib/plans/types'
import type { BillingBadge } from '@/lib/billing/types'

const BADGE_CLASS: Readonly<Record<BillingBadge['tone'], string>> = {
  success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

const CARD_CLASS = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4'
const LABEL_CLASS = 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1'

interface BillingSummaryCardsProps {
  readonly planName: string
  readonly statusLine: string
  readonly badge: BillingBadge
  readonly cost: MonthlyCost
}

export function BillingSummaryCards({ planName, statusLine, badge, cost }: BillingSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className={CARD_CLASS}>
        <p className={LABEL_CLASS}>Plan actual</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{planName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${BADGE_CLASS[badge.tone]}`}>{badge.label}</span>
          <span data-testid="plan-status-line" className="text-xs text-gray-500 dark:text-gray-400">{statusLine}</span>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <p className={LABEL_CLASS}>Usuarios</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          {cost.activeUsers} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">de {cost.includedUsers} incluidos</span>
        </p>
        {cost.extraUsers > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cost.extraUsers} adicionales × {formatMxn(EXTRA_USER_MONTHLY_PRICE)}</p>
        )}
        {cost.overLimit > 0 && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">El plan {planName} es para 1 persona: cambia a Taller para sumar equipo</p>
        )}
      </div>

      <div className={CARD_CLASS}>
        <p className={LABEL_CLASS}>Total mensual estimado</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatMxn(cost.total)}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Plan {formatMxn(cost.basePrice)}{cost.extraUsers > 0 ? ` + usuarios ${formatMxn(cost.extraUsersCost)}` : ''}
        </p>
      </div>
    </div>
  )
}
```

Crear `apps/web/components/billing/plan-limits-table.tsx`:

```tsx
import { EXTRA_USER_MONTHLY_PRICE, PLANS, PLAN_ORDER } from '@/lib/plans/catalog'
import { planLimits } from '@/lib/plans/limits'
import { formatMxn } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'

function usersCell(planId: PlanId): string {
  const limits = planLimits(planId)
  return limits.allowsExtraUsers ? `${limits.includedUsers} + ${formatMxn(EXTRA_USER_MONTHLY_PRICE)} c/u` : String(limits.includedUsers)
}

function quotesCell(planId: PlanId): string {
  const monthly = planLimits(planId).monthlyQuotes
  return monthly === null ? 'Ilimitadas' : String(monthly)
}

const CELL = 'px-3 py-2 text-center text-gray-700 dark:text-gray-300'
const ROW_HEADER = 'px-3 py-2 text-left font-medium text-gray-900 dark:text-white'

export function PlanLimitsTable({ enforced }: { readonly enforced: boolean }) {
  return (
    <div data-testid="plan-limits-table" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Qué incluye cada plan</h2>
      {!enforced && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Durante el piloto todas las funciones están abiertas en todos los planes.</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th scope="col" className={ROW_HEADER}>Límite</th>
              {PLAN_ORDER.map((planId) => (
                <th key={planId} scope="col" className={CELL}>{PLANS[planId].name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th scope="row" className={ROW_HEADER}>Usuarios</th>
              {PLAN_ORDER.map((planId) => <td key={planId} className={CELL}>{usersCell(planId)}</td>)}
            </tr>
            <tr>
              <th scope="row" className={ROW_HEADER}>Cotizaciones por mes</th>
              {PLAN_ORDER.map((planId) => <td key={planId} className={CELL}>{quotesCell(planId)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Reemplazar `PlanSelector` y ajustar `BillingClient`**

Reemplazar el contenido de `apps/web/components/billing/PlanSelector.tsx` por:

```tsx
'use client'

import { Check, Clock } from 'lucide-react'
import { PLANS, PLAN_ORDER } from '@/lib/plans/catalog'
import { formatMxn, monthlyCost, usersLabel } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'
import type { PlanCheckoutOption } from '@/lib/billing/types'
import { PlanCta } from './plan-cta'

interface PlanSelectorProps {
  readonly currentPlan: PlanId
  readonly activeUsers: number
  readonly options: Readonly<Record<PlanId, PlanCheckoutOption>>
  readonly canManage: boolean
  readonly loading?: boolean
  readonly onSelectPlan: (planId: PlanId) => Promise<void>
}

interface PlanCardProps extends Omit<PlanSelectorProps, 'currentPlan' | 'options'> {
  readonly planId: PlanId
  readonly isCurrent: boolean
  readonly option: PlanCheckoutOption
}

function PlanCard({ planId, isCurrent, option, activeUsers, canManage, loading = false, onSelectPlan }: PlanCardProps) {
  const plan = PLANS[planId]
  const estimate = monthlyCost(planId, activeUsers)
  return (
    <div
      data-testid={`plan-card-${planId}`}
      className={`relative flex flex-col rounded-xl border-2 p-5 bg-white dark:bg-gray-900 ${isCurrent ? 'border-orange-500' : 'border-gray-200 dark:border-gray-700'}`}
    >
      {isCurrent && (
        <span className="absolute -top-3 left-4 bg-orange-500 px-3 py-0.5 rounded-full text-white text-xs font-semibold">Plan actual</span>
      )}
      <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">{plan.name}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">{plan.tagline}</p>
      <div className="my-3">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatMxn(plan.monthlyPrice)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">/mes</span>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{usersLabel(planId)}</p>
        {estimate.extraUsers > 0 && (
          <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mt-1">Con tus {estimate.activeUsers} usuarios: {formatMxn(estimate.total)}/mes</p>
        )}
        {estimate.overLimit > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No alcanza para tus {estimate.activeUsers} usuarios</p>
        )}
      </div>
      <ul className="space-y-1.5 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            {feature}
          </li>
        ))}
        {plan.upcoming.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-400 dark:text-gray-500">
            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{feature} <span className="text-[10px] font-semibold uppercase text-orange-600 dark:text-orange-400">Próximamente</span></span>
          </li>
        ))}
      </ul>
      <PlanCta planId={planId} option={option} canManage={canManage} loading={loading} onSelectPlan={onSelectPlan} />
    </div>
  )
}

export function PlanSelector({ currentPlan, options, ...rest }: PlanSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {PLAN_ORDER.map((planId) => (
        <PlanCard key={planId} planId={planId} isCurrent={planId === currentPlan} option={options[planId]} {...rest} />
      ))}
    </div>
  )
}
```

En `apps/web/app/(dashboard)/dashboard/billing/BillingClient.tsx`:

1. Agregar imports:

```ts
import type { PlanCheckoutOption } from '@/lib/billing/types'
import { plansIntro } from '@/lib/billing/checkout-option'
```

2. Reemplazar la interfaz `BillingClientProps` por:

```ts
interface BillingClientProps {
  readonly currentPlan: PlanId
  readonly activeUsers: number
  readonly options: Readonly<Record<PlanId, PlanCheckoutOption>>
  readonly mercadoPagoEnabled: boolean
  readonly canManage: boolean
  readonly hasBillingAccount: boolean
}
```

3. Reemplazar la firma del componente por:

```ts
export function BillingClient({ currentPlan, activeUsers, options, mercadoPagoEnabled, canManage, hasBillingAccount }: BillingClientProps) {
```

4. Reemplazar el párrafo con el ternario `checkoutEnabled ? ... : ...` y el `<PlanSelector ... />` por:

```tsx
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{plansIntro(mercadoPagoEnabled, options)}</p>
        <PlanSelector
          currentPlan={currentPlan}
          activeUsers={activeUsers}
          options={options}
          canManage={canManage}
          onSelectPlan={handleSelectPlan}
          loading={loading}
        />
```

- [ ] **Step 8: Reemplazar la página de Facturación**

Reemplazar el contenido de `apps/web/app/(dashboard)/dashboard/billing/page.tsx` por:

```tsx
import { redirect } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/plans/catalog'
import { monthlyCost } from '@/lib/plans/pricing'
import { planLimitsEnforced } from '@/lib/plans/limits'
import { isCheckoutConfigured } from '@/lib/stripe/index'
import { countOrganizationMembers } from '@/lib/billing/member-count'
import { billingState, snapshotFromRow } from '@/lib/billing/expiry'
import { planStatusLine } from '@/lib/billing/expiry-copy'
import { billingBadge } from '@/lib/billing/badge'
import { checkoutEnvFrom, checkoutOptionsFor, hasMercadoPagoLinks } from '@/lib/billing/checkout-option'
import { BillingSummaryCards } from '@/components/billing/billing-summary-cards'
import { PlanLimitsTable } from '@/components/billing/plan-limits-table'
import { BillingClient } from './BillingClient'

export const metadata = {
  title: 'Facturación - CotizaPro',
  description: 'Tu plan, usuarios y pagos',
}

export default async function BillingPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (profileError || !profile) redirect('/login')

  const [{ data: organization, error: orgError }, activeUsers] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, plan, subscription_status, stripe_customer_id, current_period_end')
      .eq('id', profile.organization_id)
      .single(),
    countOrganizationMembers(supabase),
  ])
  if (orgError || !organization) redirect('/dashboard')

  const snapshot = snapshotFromRow(organization)
  const state = billingState(snapshot, new Date())
  const cost = monthlyCost(snapshot.planId, activeUsers ?? 1)
  const env = checkoutEnvFrom(process.env)
  const options = checkoutOptionsFor({
    currentPlan: snapshot.planId,
    state,
    activeUsers: cost.activeUsers,
    stripeEnabled: isCheckoutConfigured(),
    businessName: String(organization.name ?? ''),
    env,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
          <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Facturación</h2>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Tu plan, usuarios y pagos</p>
        </div>
      </div>

      <BillingSummaryCards
        planName={PLANS[snapshot.planId].name}
        statusLine={planStatusLine(state)}
        badge={billingBadge(state, organization.subscription_status)}
        cost={cost}
      />

      <BillingClient
        currentPlan={snapshot.planId}
        activeUsers={cost.activeUsers}
        options={options}
        mercadoPagoEnabled={hasMercadoPagoLinks(env)}
        canManage={profile.role === 'owner' || profile.role === 'admin'}
        hasBillingAccount={Boolean(organization.stripe_customer_id)}
      />

      <PlanLimitsTable enforced={planLimitsEnforced()} />
    </div>
  )
}
```

- [ ] **Step 9: Verificar tipos, pruebas y regresión de Facturación**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run lib/billing lib/plans`
Expected: sin errores; PASS.

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && PLAYWRIGHT_TEST_BASE_URL=http://localhost:3100 pnpm exec playwright test e2e/specs/13-billing.spec.ts --reporter=line`
Expected: el mismo resultado que la línea base del Step 1 (ninguna prueba que pasaba ahora falla).

- [ ] **Step 10: Revisión visual con ligas configuradas**

Levantar un servidor aparte con ligas de prueba (no reales):

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web
MP_LINK_STARTER="https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=prueba-solo" \
MP_LINK_PRO="https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=prueba-taller" \
SUPPORT_WHATSAPP_PHONE="8100000000" pnpm exec next dev -p 3101
```

Si Next se niega a abrir un segundo `next dev` en el mismo proyecto, detener el servidor de 3100, usar 3100 con estas variables y, al terminar, levantarlo de nuevo como siempre.

Con el navegador, entrar como `beto@plomeria.demo.cotizapro.mx` (contraseña demo de `apps/web/scripts/seed/README.md`) a `http://localhost:3101/dashboard/billing` y confirmar:
- "Plan actual: Taller", la línea `Plan Taller · sin fecha de vencimiento` y la tabla "Qué incluye cada plan" con la nota del piloto;
- tarjeta Solo con "Contratar con Mercado Pago" que abre la liga en otra pestaña; Empresa en "Próximamente".

Luego entrar como `direccion@megaglass.demo.cotizapro.mx` (3 usuarios) y confirmar que Solo dice "No alcanza para tu equipo". Detener el servidor de 3101 al terminar.

- [ ] **Step 11: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/lib/billing apps/web/components/billing "apps/web/app/(dashboard)/dashboard/billing"
git commit -m "feat: contratar planes con Mercado Pago desde Facturación"
```

---

### Task 10: API de superadmin (activar, suspender, historial)

**Files:**
- Create: `apps/web/lib/billing/activation.ts`, `apps/web/lib/admin/types.ts`, `apps/web/lib/admin/schemas.ts`, `apps/web/lib/admin/rpc-errors.ts`, `apps/web/lib/admin/require-platform-admin.ts`, `apps/web/lib/admin/organizations.ts`
- Test: `apps/web/lib/billing/activation.test.ts`, `apps/web/lib/admin/schemas.test.ts`, `apps/web/lib/admin/rpc-errors.test.ts`
- Create: `apps/web/app/api/admin/organizations/[id]/activate/route.ts`, `apps/web/app/api/admin/organizations/[id]/suspend/route.ts`, `apps/web/app/api/admin/organizations/[id]/activations/route.ts`

**Interfaces:**
- Consumes: RPCs `is_platform_admin`, `admin_list_organizations`, `admin_activate_plan`, `admin_suspend_plan`, `admin_list_plan_activations` (Task 1); `monthlyCost`; `PLANS`.
- Produces:
  - `activationAmount(planId: PlanId, users: number, months: number): number`
  - Tipos `AdminOrganizationRow`, `AdminOrganizationSummary { id; name; planId: PlanId; memberCount: number }`, `PlanActivationRow`, `ActivatePlanInput { plan; users; months; reference }`, `ActivationResult`, `AdminFailure`, `AdminListResult`, `ActivationsResult`, `AdminActionResult`
  - `ADMIN_PAGE_SIZE = 25`, `organizationIdSchema` (`z.guid()`), `listOrganizationsQuerySchema` (`{ q: string; page: number }`), `activatePlanSchema`, `suspendPlanSchema`
  - `adminRpcError(message: string | undefined): { status: number; error: string }`
  - `isPlatformAdmin(supabase): Promise<boolean>`, `requirePlatformAdmin(): Promise<PlatformAdminResult>`, `notFoundResponse(): NextResponse`
  - `listAdminOrganizations(supabase, { q, page }): Promise<AdminListResult>`, `listPlanActivations(supabase, orgId): Promise<ActivationsResult>`, `activatePlan(supabase, orgId, input): Promise<AdminActionResult>`, `suspendPlan(supabase, orgId, reason): Promise<AdminActionResult>`
  - HTTP: `POST /api/admin/organizations/:id/activate` `{ plan, users, months, reference }` → 200 `{ data: ActivationResult }`; `POST /api/admin/organizations/:id/suspend` `{ reason }` → 200; `GET /api/admin/organizations/:id/activations` → 200 `{ data: PlanActivationRow[] }`; cualquier no superadmin → 404 `{ error: 'No encontrado' }`; validación → 400 con `fieldErrors`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `apps/web/lib/billing/activation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { activationAmount } from './activation'

describe('activationAmount', () => {
  it('multiplica el costo mensual con usuarios adicionales por los meses', () => {
    expect(activationAmount('pro', 6, 2)).toBe((999 + 3 * 99) * 2)
    expect(activationAmount('enterprise', 10, 1)).toBe(1590)
    expect(activationAmount('starter', 1, 3)).toBe(1197)
  })

  it('Gratis siempre es 0', () => {
    expect(activationAmount('free', 1, 12)).toBe(0)
  })

  it('no acepta meses fraccionarios ni negativos', () => {
    expect(activationAmount('pro', 1, 1.9)).toBe(999)
    expect(activationAmount('pro', 1, -2)).toBe(0)
  })
})
```

Crear `apps/web/lib/admin/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { activatePlanSchema, listOrganizationsQuerySchema, organizationIdSchema, suspendPlanSchema } from './schemas'

describe('organizationIdSchema', () => {
  it('acepta los ids demo que no son UUID RFC 4122', () => {
    expect(organizationIdSchema.safeParse('00000000-0000-0000-00c0-000000000003').success).toBe(true)
  })

  it('acepta UUID v4 y rechaza texto', () => {
    expect(organizationIdSchema.safeParse('1a04b7b9-4265-4997-aee6-cc033ca4ccaa').success).toBe(true)
    expect(organizationIdSchema.safeParse('plomeria-don-beto').success).toBe(false)
  })
})

describe('activatePlanSchema', () => {
  it('convierte números y recorta la referencia', () => {
    expect(activatePlanSchema.parse({ plan: 'pro', users: '4', months: '2', reference: '  MP-123 ' }))
      .toEqual({ plan: 'pro', users: 4, months: 2, reference: 'MP-123' })
  })

  it('exige la referencia de Mercado Pago en planes pagados', () => {
    const result = activatePlanSchema.safeParse({ plan: 'pro', users: 1, months: 1, reference: '' })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.reference?.[0]).toContain('referencia')
  })

  it('Gratis no pide referencia', () => {
    expect(activatePlanSchema.safeParse({ plan: 'free', users: 1, months: 1 }).success).toBe(true)
  })

  it('Solo no admite más de 1 usuario', () => {
    const result = activatePlanSchema.safeParse({ plan: 'starter', users: 2, months: 1, reference: 'MP-1' })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.users?.[0]).toContain('Solo')
  })

  it('meses entre 1 y 12', () => {
    expect(activatePlanSchema.safeParse({ plan: 'pro', users: 1, months: 13, reference: 'MP-1' }).success).toBe(false)
    expect(activatePlanSchema.safeParse({ plan: 'pro', users: 1, months: 0, reference: 'MP-1' }).success).toBe(false)
  })
})

describe('suspendPlanSchema y listOrganizationsQuerySchema', () => {
  it('exige un motivo de al menos 3 caracteres', () => {
    expect(suspendPlanSchema.safeParse({ reason: 'x' }).success).toBe(false)
    expect(suspendPlanSchema.parse({ reason: '  Pago rechazado ' })).toEqual({ reason: 'Pago rechazado' })
  })

  it('usa valores por omisión en la búsqueda', () => {
    expect(listOrganizationsQuerySchema.parse({})).toEqual({ q: '', page: 1 })
    expect(listOrganizationsQuerySchema.parse({ q: ' plomer ', page: '2' })).toEqual({ q: 'plomer', page: 2 })
  })
})
```

Crear `apps/web/lib/admin/rpc-errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { adminRpcError } from './rpc-errors'

describe('adminRpcError', () => {
  it('oculta la ruta a quien no es superadmin', () => {
    expect(adminRpcError('forbidden')).toEqual({ status: 404, error: 'No encontrado' })
  })

  it('traduce validaciones y conflictos', () => {
    expect(adminRpcError('invalid_months').status).toBe(400)
    expect(adminRpcError('org_not_found').status).toBe(404)
    expect(adminRpcError('free_plan_not_suspendable')).toEqual({ status: 409, error: 'El plan Gratis no vence; no se puede suspender' })
  })

  it('responde 500 genérico con errores desconocidos', () => {
    expect(adminRpcError('connection reset')).toEqual({ status: 500, error: 'No se pudo completar la acción' })
    expect(adminRpcError(undefined).status).toBe(500)
  })
})
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/billing/activation.test.ts lib/admin`
Expected: FAIL con `Failed to resolve import` de `./activation`, `./schemas` y `./rpc-errors`.

- [ ] **Step 3: Escribir `activation.ts`, tipos, esquemas y errores**

Crear `apps/web/lib/billing/activation.ts`:

```ts
import { monthlyCost } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'

/** Monto que se registra en plan_activations: costo mensual con usuarios adicionales por meses. Gratis es 0. */
export function activationAmount(planId: PlanId, users: number, months: number): number {
  if (planId === 'free') return 0
  const wholeMonths = Math.max(0, Math.floor(months))
  return monthlyCost(planId, users).total * wholeMonths
}
```

Crear `apps/web/lib/admin/types.ts`:

```ts
import type { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanId } from '@/lib/plans/types'

export interface AdminOrganizationRow {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly plan: string
  readonly subscription_status: string | null
  readonly current_period_end: string | null
  readonly member_count: number
  readonly created_at: string
}

export interface AdminOrganizationSummary {
  readonly id: string
  readonly name: string
  readonly planId: PlanId
  readonly memberCount: number
}

export interface PlanActivationRow {
  readonly id: string
  readonly action: 'activate' | 'suspend'
  readonly previous_plan: string
  readonly new_plan: string
  readonly users_billed: number | null
  readonly months: number | null
  /** numeric(10,2): PostgREST lo puede regresar como texto. */
  readonly amount: number | string
  readonly reference: string | null
  readonly reason: string | null
  readonly period_start: string | null
  readonly period_end: string | null
  readonly activated_by_email: string | null
  readonly created_at: string
}

export interface ActivatePlanInput {
  readonly plan: PlanId
  readonly users: number
  readonly months: number
  readonly reference: string
}

export interface ActivationResult {
  readonly organization_id: string
  readonly plan: PlanId
  readonly current_period_end: string | null
}

export interface AdminFailure {
  readonly ok: false
  readonly status: number
  readonly error: string
}

export type AdminListResult = { readonly ok: true; readonly rows: readonly AdminOrganizationRow[]; readonly total: number } | AdminFailure
export type ActivationsResult = { readonly ok: true; readonly rows: readonly PlanActivationRow[] } | AdminFailure
export type AdminActionResult = { readonly ok: true; readonly data: ActivationResult } | AdminFailure

export type PlatformAdminResult =
  | { readonly ok: true; readonly supabase: SupabaseClient; readonly userId: string }
  | { readonly ok: false; readonly response: NextResponse }
```

Crear `apps/web/lib/admin/schemas.ts`:

```ts
import { z } from 'zod'
import { PLANS } from '@/lib/plans/catalog'

export const ADMIN_PAGE_SIZE = 25

/** z.guid(): los ids demo (00000000-0000-0000-00c0-…) no cumplen la versión RFC que exige z.uuid(). */
export const organizationIdSchema = z.guid()

export const listOrganizationsQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).max(1000).default(1),
})

export const activatePlanSchema = z
  .object({
    plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
    users: z.coerce.number().int().min(1, 'Mínimo 1 usuario').max(500, 'Máximo 500 usuarios'),
    months: z.coerce.number().int().min(1, 'Mínimo 1 mes').max(12, 'Máximo 12 meses'),
    reference: z.string().trim().max(120, 'Máximo 120 caracteres').default(''),
  })
  .superRefine((value, ctx) => {
    const plan = PLANS[value.plan]
    if (value.plan !== 'free' && value.reference.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['reference'], message: 'Escribe la referencia del pago de Mercado Pago' })
    }
    if (!plan.allowsExtraUsers && value.users > plan.includedUsers) {
      ctx.addIssue({ code: 'custom', path: ['users'], message: `El plan ${plan.name} es para ${plan.includedUsers} usuario` })
    }
  })

export const suspendPlanSchema = z.object({
  reason: z.string().trim().min(3, 'Escribe el motivo').max(300, 'Máximo 300 caracteres'),
})
```

Crear `apps/web/lib/admin/rpc-errors.ts`:

```ts
export interface AdminRpcError {
  readonly status: number
  readonly error: string
}

const ADMIN_RPC_ERRORS: Readonly<Record<string, AdminRpcError>> = {
  forbidden: { status: 404, error: 'No encontrado' },
  org_not_found: { status: 404, error: 'La empresa no existe' },
  invalid_plan: { status: 400, error: 'Plan inválido' },
  invalid_users: { status: 400, error: 'Usuarios: de 1 a 500' },
  invalid_months: { status: 400, error: 'Meses: de 1 a 12' },
  invalid_amount: { status: 400, error: 'Monto inválido' },
  invalid_reference: { status: 400, error: 'Escribe la referencia del pago de Mercado Pago (máximo 120 caracteres)' },
  invalid_reason: { status: 400, error: 'Escribe el motivo (de 3 a 300 caracteres)' },
  free_plan_not_suspendable: { status: 409, error: 'El plan Gratis no vence; no se puede suspender' },
}

/** Traduce las excepciones de las RPC admin_* (migración 042). */
export function adminRpcError(message: string | undefined): AdminRpcError {
  return ADMIN_RPC_ERRORS[message ?? ''] ?? { status: 500, error: 'No se pudo completar la acción' }
}
```

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/billing/activation.test.ts lib/admin`
Expected: PASS.

- [ ] **Step 5: Escribir el acceso de superadmin y las envolturas de RPC**

Crear `apps/web/lib/admin/require-platform-admin.ts`:

```ts
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import type { PlatformAdminResult } from './types'

export function notFoundResponse(): NextResponse {
  return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
}

export async function isPlatformAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_platform_admin')
  return !error && data === true
}

/** Exige sesión de superadmin; a cualquier otro le responde 404 para no revelar que la ruta existe. */
export async function requirePlatformAdmin(): Promise<PlatformAdminResult> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user || !(await isPlatformAdmin(supabase))) return { ok: false, response: notFoundResponse() }
  return { ok: true, supabase, userId: user.id }
}
```

Crear `apps/web/lib/admin/organizations.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { activationAmount } from '@/lib/billing/activation'
import { adminRpcError } from './rpc-errors'
import { ADMIN_PAGE_SIZE } from './schemas'
import type {
  ActivatePlanInput,
  ActivationResult,
  ActivationsResult,
  AdminActionResult,
  AdminListResult,
  AdminOrganizationRow,
  PlanActivationRow,
} from './types'

type OrganizationListRow = AdminOrganizationRow & { readonly total_count: number | string }

function toOrganizationRow(row: OrganizationListRow): AdminOrganizationRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    subscription_status: row.subscription_status,
    current_period_end: row.current_period_end,
    member_count: Number(row.member_count),
    created_at: row.created_at,
  }
}

export async function listAdminOrganizations(
  supabase: SupabaseClient,
  params: { readonly q: string; readonly page: number },
): Promise<AdminListResult> {
  const { data, error } = await supabase.rpc('admin_list_organizations', {
    p_search: params.q,
    p_limit: ADMIN_PAGE_SIZE,
    p_offset: (params.page - 1) * ADMIN_PAGE_SIZE,
  })
  if (error) return { ok: false, ...adminRpcError(error.message) }
  const rows = (data ?? []) as OrganizationListRow[]
  return { ok: true, rows: rows.map(toOrganizationRow), total: Number(rows[0]?.total_count ?? 0) }
}

export async function listPlanActivations(supabase: SupabaseClient, organizationId: string): Promise<ActivationsResult> {
  const { data, error } = await supabase.rpc('admin_list_plan_activations', { p_org: organizationId, p_limit: 20 })
  if (error) return { ok: false, ...adminRpcError(error.message) }
  return { ok: true, rows: (data ?? []) as PlanActivationRow[] }
}

export async function activatePlan(
  supabase: SupabaseClient,
  organizationId: string,
  input: ActivatePlanInput,
): Promise<AdminActionResult> {
  const { data, error } = await supabase.rpc('admin_activate_plan', {
    p_org: organizationId,
    p_plan: input.plan,
    p_users: input.users,
    p_months: input.months,
    p_amount: activationAmount(input.plan, input.users, input.months),
    p_reference: input.reference,
  })
  if (error) return { ok: false, ...adminRpcError(error.message) }
  return { ok: true, data: data as ActivationResult }
}

export async function suspendPlan(supabase: SupabaseClient, organizationId: string, reason: string): Promise<AdminActionResult> {
  const { data, error } = await supabase.rpc('admin_suspend_plan', { p_org: organizationId, p_reason: reason })
  if (error) return { ok: false, ...adminRpcError(error.message) }
  return { ok: true, data: data as ActivationResult }
}
```

- [ ] **Step 6: Escribir las rutas HTTP**

Crear `apps/web/app/api/admin/organizations/[id]/activate/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { notFoundResponse, requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { activatePlanSchema, organizationIdSchema } from '@/lib/admin/schemas'
import { activatePlan } from '@/lib/admin/organizations'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return auth.response
  const id = organizationIdSchema.safeParse((await params).id)
  if (!id.success) return notFoundResponse()
  const body = activatePlanSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return validationErrorResponse(body.error)

  const result = await activatePlan(auth.supabase, id.data, body.data)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  logger.info('Plan activated by platform admin', {
    organizationId: id.data,
    plan: body.data.plan,
    months: body.data.months,
    adminId: auth.userId,
  })
  return NextResponse.json({ data: result.data })
}
```

Crear `apps/web/app/api/admin/organizations/[id]/suspend/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { notFoundResponse, requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { organizationIdSchema, suspendPlanSchema } from '@/lib/admin/schemas'
import { suspendPlan } from '@/lib/admin/organizations'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return auth.response
  const id = organizationIdSchema.safeParse((await params).id)
  if (!id.success) return notFoundResponse()
  const body = suspendPlanSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return validationErrorResponse(body.error)

  const result = await suspendPlan(auth.supabase, id.data, body.data.reason)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  logger.info('Plan suspended by platform admin', { organizationId: id.data, adminId: auth.userId })
  return NextResponse.json({ data: result.data })
}
```

Crear `apps/web/app/api/admin/organizations/[id]/activations/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { notFoundResponse, requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { organizationIdSchema } from '@/lib/admin/schemas'
import { listPlanActivations } from '@/lib/admin/organizations'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return auth.response
  const id = organizationIdSchema.safeParse((await params).id)
  if (!id.success) return notFoundResponse()

  const result = await listPlanActivations(auth.supabase, id.data)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ data: result.rows })
}
```

- [ ] **Step 7: Verificar tipos y pruebas**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run lib/admin lib/billing`
Expected: sin errores; PASS. (El 404 para no superadmin y la activación vía API se prueban en la Task 13.)

- [ ] **Step 8: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/lib/admin apps/web/lib/billing/activation.ts apps/web/lib/billing/activation.test.ts apps/web/app/api/admin
git commit -m "feat: API de superadmin para activar, suspender y auditar planes"
```

---
### Task 11: Pantalla de superadmin `/admin`

**Files:**
- Create: `apps/web/lib/admin/admin-api.ts`, `apps/web/lib/admin/history-copy.ts`
- Test: `apps/web/lib/admin/admin-api.test.ts`, `apps/web/lib/admin/history-copy.test.ts`
- Create: `apps/web/app/admin/layout.tsx`, `apps/web/app/admin/page.tsx`
- Create: `apps/web/components/admin/organizations-table.tsx`, `apps/web/components/admin/organization-actions.tsx`, `apps/web/components/admin/activate-plan-dialog.tsx`, `apps/web/components/admin/suspend-plan-dialog.tsx`, `apps/web/components/admin/activation-history.tsx`
- Modify: `apps/web/lib/auth/public-routes.test.ts` (asegurar que `/admin` exige sesión)

**Interfaces:**
- Consumes: `isPlatformAdmin`, `listAdminOrganizations`, `ADMIN_PAGE_SIZE`, `listOrganizationsQuerySchema`, tipos de `lib/admin/types.ts` (Task 10); `billingState`, `formatExpiryDate`, `adminExpiryLabel` (Task 4); `activationAmount` (Task 10); `Combobox`, `Input`, `Textarea`, `Button`.
- Produces:
  - `postAdminAction(url: string, body: Readonly<Record<string, unknown>>): Promise<AdminActionResponse>` con `AdminActionResponse { ok: boolean; error: string | null; fieldErrors: Readonly<Record<string, string>> }`
  - `fetchActivations(organizationId: string): Promise<readonly PlanActivationRow[] | null>`
  - `describeActivation(row: PlanActivationRow): string`
  - Selectores para la Task 13: `data-testid="org-row-<id>"`, botón "Activar o renovar", input `#activate-reference`, Combobox `name="plan"`, `data-testid="activation-total"`, botón "Activar" (exacto).

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `apps/web/lib/admin/admin-api.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchActivations, postAdminAction } from './admin-api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('postAdminAction', () => {
  it('manda JSON por POST y reporta éxito', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await postAdminAction('/api/admin/organizations/x/activate', { plan: 'pro' })).toEqual({ ok: true, error: null, fieldErrors: {} })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/organizations/x/activate',
      expect.objectContaining({ method: 'POST', body: '{"plan":"pro"}' }),
    )
  })

  it('regresa el mensaje y los errores por campo del servidor', async () => {
    const body = { error: 'Por favor verifica los datos ingresados.', fieldErrors: { reference: 'Escribe la referencia' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 400 })))
    expect(await postAdminAction('/x', {})).toEqual({ ok: false, ...body })
  })

  it('tolera respuestas sin JSON y errores de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 502 })))
    expect((await postAdminAction('/x', {})).error).toBe('No se pudo completar la acción')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))
    expect((await postAdminAction('/x', {})).error).toBe('Error de conexión. Intenta de nuevo.')
  })
})

describe('fetchActivations', () => {
  it('regresa las filas o null si falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'a' }] }), { status: 200 })))
    expect(await fetchActivations('org-1')).toEqual([{ id: 'a' }])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })))
    expect(await fetchActivations('org-1')).toBeNull()
  })
})
```

Crear `apps/web/lib/admin/history-copy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { describeActivation } from './history-copy'
import type { PlanActivationRow } from './types'

const base: PlanActivationRow = {
  id: 'a1',
  action: 'activate',
  previous_plan: 'pro',
  new_plan: 'pro',
  users_billed: 1,
  months: 1,
  amount: '999.00',
  reference: 'MP-1',
  reason: null,
  period_start: '2026-10-13T15:00:00Z',
  period_end: '2026-11-13T15:00:00Z',
  activated_by_email: 'operador@example.test',
  created_at: '2026-10-13T15:00:00Z',
}

describe('describeActivation', () => {
  it('describe una activación con meses, monto y vencimiento', () => {
    const text = describeActivation(base)
    expect(text).toContain('Taller → Taller')
    expect(text).toContain('1 mes')
    expect(text).toContain('$999')
    expect(text).toContain('hasta el 13 de noviembre de 2026')
  })

  it('usa plural y marca Gratis sin vencimiento', () => {
    expect(describeActivation({ ...base, months: 3 })).toContain('3 meses')
    expect(describeActivation({ ...base, new_plan: 'free', months: null, amount: 0, period_end: null })).toBe('Taller → Gratis · sin vencimiento')
  })

  it('describe una suspensión con su motivo', () => {
    expect(describeActivation({ ...base, action: 'suspend', reason: 'Pago rechazado' })).toBe('Suspensión: Pago rechazado')
  })
})
```

En `apps/web/lib/auth/public-routes.test.ts`, agregar `'/admin'` a la lista de `it.each([...])('exige sesión en %s', ...)`:

```ts
  it.each(['/dashboard', '/dashboard/quotes/new', '/invitex', '/pagos', '/forgot-passwordx', '/admin'])('exige sesión en %s', (path) => {
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/admin lib/auth/public-routes.test.ts`
Expected: FAIL con `Failed to resolve import "./admin-api"` y `"./history-copy"` (la de rutas públicas pasa: `/admin` ya no es pública).

- [ ] **Step 3: Escribir `admin-api.ts` y `history-copy.ts`**

Crear `apps/web/lib/admin/admin-api.ts`:

```ts
import type { PlanActivationRow } from './types'

export interface AdminActionResponse {
  readonly ok: boolean
  readonly error: string | null
  readonly fieldErrors: Readonly<Record<string, string>>
}

interface ErrorBody {
  readonly error?: string
  readonly fieldErrors?: Readonly<Record<string, string>>
}

export async function postAdminAction(url: string, body: Readonly<Record<string, unknown>>): Promise<AdminActionResponse> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) return { ok: true, error: null, fieldErrors: {} }
    const data: ErrorBody = await res.json().catch(() => ({}))
    return { ok: false, error: data.error ?? 'No se pudo completar la acción', fieldErrors: data.fieldErrors ?? {} }
  } catch {
    return { ok: false, error: 'Error de conexión. Intenta de nuevo.', fieldErrors: {} }
  }
}

export async function fetchActivations(organizationId: string): Promise<readonly PlanActivationRow[] | null> {
  try {
    const res = await fetch(`/api/admin/organizations/${organizationId}/activations`)
    if (!res.ok) return null
    const body: { data?: PlanActivationRow[] } = await res.json()
    return body.data ?? []
  } catch {
    return null
  }
}
```

Crear `apps/web/lib/admin/history-copy.ts`:

```ts
import { PLANS, isPlanId } from '@/lib/plans/catalog'
import { formatMxn } from '@/lib/plans/pricing'
import { formatExpiryDate } from '@/lib/billing/expiry'
import type { PlanActivationRow } from './types'

function planName(plan: string): string {
  return isPlanId(plan) ? PLANS[plan].name : plan
}

function monthsPart(months: number | null): string {
  if (months === null) return ''
  return months === 1 ? ' · 1 mes' : ` · ${months} meses`
}

export function describeActivation(row: PlanActivationRow): string {
  if (row.action === 'suspend') return `Suspensión: ${row.reason ?? ''}`
  const amount = Number(row.amount)
  const amountPart = amount > 0 ? ` · ${formatMxn(amount)}` : ''
  const periodPart = row.period_end ? ` · hasta el ${formatExpiryDate(row.period_end)}` : ' · sin vencimiento'
  return `${planName(row.previous_plan)} → ${planName(row.new_plan)}${monthsPart(row.months)}${amountPart}${periodPart}`
}
```

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/admin lib/auth/public-routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Escribir los diálogos y el historial**

Crear `apps/web/components/admin/activate-plan-dialog.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { PLANS, PLAN_ORDER, isPlanId } from '@/lib/plans/catalog'
import { formatMxn } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'
import { activationAmount } from '@/lib/billing/activation'
import { postAdminAction } from '@/lib/admin/admin-api'
import type { AdminOrganizationSummary } from '@/lib/admin/types'

const PLAN_OPTIONS = PLAN_ORDER.map((id) => ({ value: id, label: PLANS[id].name }))
const LABEL = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const FIELD_ERROR = 'mt-1 text-xs text-red-600'

interface NumberFieldProps {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly error?: string
  readonly onChange: (value: number) => void
}

function NumberField({ id, label, value, min, max, error, onChange }: NumberFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>{label}</label>
      <Input id={id} type="number" inputMode="numeric" min={min} max={max} value={value} required hasError={Boolean(error)}
        onChange={(event) => onChange(Number(event.target.value))} />
      {error && <p className={FIELD_ERROR}>{error}</p>}
    </div>
  )
}

interface ActivatePlanDialogProps {
  readonly organization: AdminOrganizationSummary
  readonly onCancel: () => void
  readonly onDone: () => void
}

export function ActivatePlanDialog({ organization, onCancel, onDone }: ActivatePlanDialogProps) {
  const [plan, setPlan] = useState<PlanId>(organization.planId === 'free' ? 'starter' : organization.planId)
  const [users, setUsers] = useState(Math.max(1, organization.memberCount))
  const [months, setMonths] = useState(1)
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const result = await postAdminAction(`/api/admin/organizations/${organization.id}/activate`, { plan, users, months, reference })
    setBusy(false)
    if (result.ok) {
      onDone()
      return
    }
    setMessage(result.error)
    setErrors(result.fieldErrors)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 text-left" role="dialog" aria-modal="true" aria-labelledby="activate-title">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 id="activate-title" className="text-sm font-semibold text-gray-900 dark:text-white">Activar o renovar · {organization.name}</h3>
        <div>
          <label htmlFor="activate-plan" className={LABEL}>Plan *</label>
          <Combobox id="activate-plan" name="plan" options={PLAN_OPTIONS} defaultValue={plan} required fieldError={errors.plan}
            onChange={(value) => { if (isPlanId(value)) setPlan(value) }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="activate-users" label="Usuarios *" value={users} min={1} max={500} error={errors.users} onChange={setUsers} />
          <NumberField id="activate-months" label="Meses *" value={months} min={1} max={12} error={errors.months} onChange={setMonths} />
        </div>
        {plan !== 'free' && (
          <div>
            <label htmlFor="activate-reference" className={LABEL}>Referencia de Mercado Pago *</label>
            <Input id="activate-reference" value={reference} maxLength={120} required hasError={Boolean(errors.reference)}
              onChange={(event) => setReference(event.target.value)} />
            {errors.reference && <p className={FIELD_ERROR}>{errors.reference}</p>}
          </div>
        )}
        <p data-testid="activation-total" className="text-sm text-gray-700 dark:text-gray-300">
          Total a registrar: <strong>{formatMxn(activationAmount(plan, users, months))}</strong>
        </p>
        {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={busy}>{busy ? 'Activando...' : 'Activar'}</Button>
        </div>
      </form>
    </div>
  )
}
```

Crear `apps/web/components/admin/suspend-plan-dialog.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { postAdminAction } from '@/lib/admin/admin-api'
import type { AdminOrganizationSummary } from '@/lib/admin/types'

interface SuspendPlanDialogProps {
  readonly organization: AdminOrganizationSummary
  readonly onCancel: () => void
  readonly onDone: () => void
}

export function SuspendPlanDialog({ organization, onCancel, onDone }: SuspendPlanDialogProps) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const result = await postAdminAction(`/api/admin/organizations/${organization.id}/suspend`, { reason })
    setBusy(false)
    if (result.ok) {
      onDone()
      return
    }
    setMessage(result.fieldErrors.reason ?? result.error)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 text-left" role="dialog" aria-modal="true" aria-labelledby="suspend-title">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 id="suspend-title" className="text-sm font-semibold text-gray-900 dark:text-white">Suspender · {organization.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          La cuenta queda en solo lectura de inmediato. Sus datos no se borran y se reactiva al renovar.
        </p>
        <div>
          <label htmlFor="suspend-reason" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo *</label>
          <Textarea id="suspend-reason" value={reason} maxLength={300} required onChange={(event) => setReason(event.target.value)} />
        </div>
        {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="destructive" className="flex-1" disabled={busy}>{busy ? 'Suspendiendo...' : 'Suspender'}</Button>
        </div>
      </form>
    </div>
  )
}
```

Crear `apps/web/components/admin/activation-history.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatExpiryDate } from '@/lib/billing/expiry'
import { fetchActivations } from '@/lib/admin/admin-api'
import { describeActivation } from '@/lib/admin/history-copy'
import type { PlanActivationRow } from '@/lib/admin/types'

interface ActivationHistoryProps {
  readonly organizationId: string
  readonly organizationName: string
  readonly onClose: () => void
}

type HistoryState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly rows: readonly PlanActivationRow[] }

function HistoryList({ rows }: { readonly rows: readonly PlanActivationRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400">Sin activaciones registradas.</p>
  return (
    <ul className="max-h-80 space-y-2 overflow-y-auto">
      {rows.map((row) => (
        <li key={row.id} className="rounded-md border border-gray-100 p-2 text-sm dark:border-gray-800">
          <p className="text-gray-900 dark:text-white">{describeActivation(row)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatExpiryDate(row.created_at)} · {row.activated_by_email ?? 'Sin registro'}{row.reference ? ` · Ref. ${row.reference}` : ''}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function ActivationHistory({ organizationId, organizationName, onClose }: ActivationHistoryProps) {
  const [state, setState] = useState<HistoryState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    fetchActivations(organizationId).then((rows) => {
      if (active) setState(rows ? { status: 'ready', rows } : { status: 'error' })
    })
    return () => {
      active = false
    }
  }, [organizationId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 text-left" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <div className="w-full max-w-lg space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 id="history-title" className="text-sm font-semibold text-gray-900 dark:text-white">Historial · {organizationName}</h3>
        {state.status === 'loading' && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>}
        {state.status === 'error' && <p role="alert" className="text-sm text-red-600">No se pudo cargar el historial.</p>}
        {state.status === 'ready' && <HistoryList rows={state.rows} />}
        <Button type="button" variant="outline" className="w-full" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Escribir la tabla, las acciones, el layout y la página**

Crear `apps/web/components/admin/organization-actions.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { AdminOrganizationSummary } from '@/lib/admin/types'
import { ActivatePlanDialog } from './activate-plan-dialog'
import { SuspendPlanDialog } from './suspend-plan-dialog'
import { ActivationHistory } from './activation-history'

type Panel = 'activate' | 'suspend' | 'history' | null

export function OrganizationActions({ organization }: { readonly organization: AdminOrganizationSummary }) {
  const router = useRouter()
  const [panel, setPanel] = useState<Panel>(null)
  const close = () => setPanel(null)
  const done = () => {
    setPanel(null)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" onClick={() => setPanel('activate')}>Activar o renovar</Button>
      <Button size="sm" variant="outline" onClick={() => setPanel('history')}>Historial</Button>
      {organization.planId !== 'free' && (
        <Button size="sm" variant="outline" className="text-red-600" onClick={() => setPanel('suspend')}>Suspender</Button>
      )}
      {panel === 'activate' && <ActivatePlanDialog organization={organization} onCancel={close} onDone={done} />}
      {panel === 'suspend' && <SuspendPlanDialog organization={organization} onCancel={close} onDone={done} />}
      {panel === 'history' && (
        <ActivationHistory organizationId={organization.id} organizationName={organization.name} onClose={close} />
      )}
    </div>
  )
}
```

Crear `apps/web/components/admin/organizations-table.tsx` (Server Component):

```tsx
import { PLANS, isPlanId } from '@/lib/plans/catalog'
import { billingState, formatExpiryDate } from '@/lib/billing/expiry'
import { adminExpiryLabel } from '@/lib/billing/expiry-copy'
import type { AdminOrganizationRow } from '@/lib/admin/types'
import { OrganizationActions } from './organization-actions'

const TH = 'px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400'
const TD = 'px-3 py-2 align-top text-gray-700 dark:text-gray-300'

function OrganizationRow({ row, now }: { readonly row: AdminOrganizationRow; readonly now: Date }) {
  const planId = isPlanId(row.plan) ? row.plan : 'free'
  const state = billingState({ planId, currentPeriodEnd: row.current_period_end }, now)
  const expiryClass = state.kind === 'expired' ? 'font-semibold text-red-600 dark:text-red-400' : ''
  return (
    <tr data-testid={`org-row-${row.id}`} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
      <td className={TD}>
        <p className="font-medium text-gray-900 dark:text-white">{row.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{row.slug}</p>
      </td>
      <td className={TD}>{PLANS[planId].name}</td>
      <td className={`${TD} ${expiryClass}`}>{adminExpiryLabel(state)}</td>
      <td className={TD}>{row.member_count}</td>
      <td className={TD}>{formatExpiryDate(row.created_at)}</td>
      <td className={`${TD} text-right`}>
        <OrganizationActions organization={{ id: row.id, name: row.name, planId, memberCount: row.member_count }} />
      </td>
    </tr>
  )
}

export function OrganizationsTable({ rows, now }: { readonly rows: readonly AdminOrganizationRow[]; readonly now: Date }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No hay empresas que coincidan con la búsqueda.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 dark:border-gray-800">
          <tr>
            <th scope="col" className={TH}>Empresa</th>
            <th scope="col" className={TH}>Plan</th>
            <th scope="col" className={TH}>Vencimiento</th>
            <th scope="col" className={TH}>Usuarios</th>
            <th scope="col" className={TH}>Alta</th>
            <th scope="col" className={TH}><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => <OrganizationRow key={row.id} row={row} now={now} />)}
        </tbody>
      </table>
    </div>
  )
}
```

Crear `apps/web/app/admin/layout.tsx`:

```tsx
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export default function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <ShieldCheck className="h-4 w-4 text-orange-600" aria-hidden="true" />
            CotizaPro · Plataforma
          </p>
          <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Ir a mi panel</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
    </div>
  )
}
```

Crear `apps/web/app/admin/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/admin/require-platform-admin'
import { listAdminOrganizations } from '@/lib/admin/organizations'
import { ADMIN_PAGE_SIZE, listOrganizationsQuerySchema } from '@/lib/admin/schemas'
import { OrganizationsTable } from '@/components/admin/organizations-table'

export const metadata: Metadata = {
  title: 'Plataforma - CotizaPro',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

interface AdminPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

function pageHref(q: string, page: number): string {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `/admin?${query}` : '/admin'
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isPlatformAdmin(supabase))) notFound()

  const parsed = listOrganizationsQuerySchema.safeParse(await searchParams)
  const { q, page } = parsed.success ? parsed.data : { q: '', page: 1 }
  const result = await listAdminOrganizations(supabase, { q, page })
  const lastPage = result.ok ? Math.max(1, Math.ceil(result.total / ADMIN_PAGE_SIZE)) : 1

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Empresas</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Activa, renueva o suspende planes pagados con Mercado Pago.</p>
      </div>
      <form action="/admin" method="get" role="search" className="flex gap-2">
        <label htmlFor="admin-search" className="sr-only">Buscar empresa</label>
        <input id="admin-search" name="q" defaultValue={q} placeholder="Buscar por nombre o slug"
          className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
        <button type="submit" className="h-10 rounded-md bg-orange-500 px-4 text-sm font-medium text-white hover:bg-orange-600">Buscar</button>
      </form>
      {result.ok
        ? <OrganizationsTable rows={result.rows} now={new Date()} />
        : <p role="alert" className="text-sm text-red-600">No se pudo cargar la lista de empresas.</p>}
      <nav aria-label="Paginación" className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        {page > 1 ? <Link href={pageHref(q, page - 1)}>Anterior</Link> : <span />}
        <span>Página {page} de {lastPage}</span>
        {page < lastPage ? <Link href={pageHref(q, page + 1)}>Siguiente</Link> : <span />}
      </nav>
    </div>
  )
}
```

- [ ] **Step 7: Verificar tipos, pruebas y build**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run lib/admin && pnpm build`
Expected: sin errores de tipos; PASS; el build termina y lista la ruta `/admin` como dinámica (ƒ). (El flujo completo de `/admin` se prueba en la Task 13.)

- [ ] **Step 8: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/lib/admin apps/web/lib/auth/public-routes.test.ts apps/web/app/admin apps/web/components/admin
git commit -m "feat: pantalla /admin para activar, renovar y suspender planes"
```

---

### Task 12: Cron diario de avisos de vencimiento por correo

**Files:**
- Create: `apps/web/lib/cron/verify-cron.ts`, `apps/web/lib/supabase/anon.ts`, `apps/web/lib/email/plan-expiry-email.ts`, `apps/web/lib/billing/notices.ts`, `apps/web/lib/billing/notice-rpc.ts`
- Test: `apps/web/lib/cron/verify-cron.test.ts`, `apps/web/lib/email/plan-expiry-email.test.ts`, `apps/web/lib/billing/notices.test.ts`
- Create: `apps/web/app/api/cron/billing-notices/route.ts`

**Interfaces:**
- Consumes: RPCs `billing_notices_due`, `claim_billing_notice`, `release_billing_notice` (Task 2); `daysUntilExpiry`, `noticeKindFor`, `formatExpiryDate`, `daysLabel`, `DueNotice`, `BillingNoticeKind` (Task 4); `sendEmail` (`lib/integrations/email.ts`); `EmailContent` (`lib/email/quote-email.ts`).
- Produces:
  - `verifyCronAuthorization(header: string | null, secret: string | undefined): CronAuthResult` (`{ ok: true; secret } | { ok: false; status: 401 | 500; reason: 'not_configured' | 'missing' | 'invalid' }`)
  - `createAnonClient(): SupabaseClient`
  - `buildPlanExpiryEmail(input: PlanExpiryEmailInput): EmailContent`
  - `parseDueNotices(data: unknown): DueNotice[]`
  - `runBillingNotices(notices: readonly DueNotice[], deps: NoticeDeps): Promise<NoticeRunSummary>` con `NoticeRunSummary { considered; sent; skipped; failed }`
  - `fetchDueNotices(supabase, cronKey): Promise<readonly DueNotice[] | null>`, `rpcNoticeDeps(supabase, cronKey, now, renewUrl): NoticeDeps`
  - HTTP: `POST|GET /api/cron/billing-notices` con `Authorization: Bearer <CRON_SECRET>` → 200 `{ success, considered, sent, skipped, failed, timestamp }`; sin o con secreto incorrecto → 401; sin `CRON_SECRET` de 32+ caracteres → 500.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `apps/web/lib/cron/verify-cron.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { verifyCronAuthorization } from './verify-cron'

const secret = 'x'.repeat(40)

describe('verifyCronAuthorization', () => {
  it('acepta el Bearer exacto', () => {
    expect(verifyCronAuthorization(`Bearer ${secret}`, secret)).toEqual({ ok: true, secret })
  })

  it('rechaza encabezado ausente o distinto', () => {
    expect(verifyCronAuthorization(null, secret)).toEqual({ ok: false, status: 401, reason: 'missing' })
    expect(verifyCronAuthorization(`Bearer ${'y'.repeat(40)}`, secret)).toEqual({ ok: false, status: 401, reason: 'invalid' })
    expect(verifyCronAuthorization('Bearer corto', secret)).toEqual({ ok: false, status: 401, reason: 'invalid' })
  })

  it('falla cerrado si CRON_SECRET no está configurado o es corto', () => {
    expect(verifyCronAuthorization(`Bearer ${secret}`, undefined)).toEqual({ ok: false, status: 500, reason: 'not_configured' })
    expect(verifyCronAuthorization('Bearer corto', 'corto')).toEqual({ ok: false, status: 500, reason: 'not_configured' })
  })
})
```

Crear `apps/web/lib/email/plan-expiry-email.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildPlanExpiryEmail, type PlanExpiryEmailInput } from './plan-expiry-email'

const base: PlanExpiryEmailInput = {
  businessName: 'Plomería <b>Don Beto</b>',
  ownerName: 'Beto Ramírez',
  planName: 'Taller',
  kind: 'd3',
  daysLeft: 3,
  periodEnd: '2026-10-16T14:00:00Z',
  renewUrl: 'https://cotizapro.mariobustos.io/dashboard/billing',
}

describe('buildPlanExpiryEmail', () => {
  it('avisa cuántos días faltan y qué se limitará', () => {
    const email = buildPlanExpiryEmail(base)
    expect(email.subject).toBe('Tu plan Taller de CotizaPro vence en 3 días')
    expect(email.text).toContain('Hola Beto,')
    expect(email.text).toContain('vence el 16 de octubre de 2026')
    expect(email.text).toContain('solo lectura')
    expect(email.text).toContain('Renovar plan: https://cotizapro.mariobustos.io/dashboard/billing')
  })

  it('usa singular con 1 día', () => {
    expect(buildPlanExpiryEmail({ ...base, kind: 'd1', daysLeft: 1 }).subject).toBe('Tu plan Taller de CotizaPro vence en 1 día')
  })

  it('el día del vencimiento dice que la cuenta ya quedó en solo lectura', () => {
    const email = buildPlanExpiryEmail({ ...base, kind: 'd0', daysLeft: 0 })
    expect(email.subject).toBe('Tu plan Taller de CotizaPro venció')
    expect(email.text).toContain('quedó en solo lectura')
  })

  it('escapa el HTML y enlaza a Facturación', () => {
    const { html } = buildPlanExpiryEmail(base)
    expect(html).toContain('Plomería &lt;b&gt;Don Beto&lt;/b&gt;')
    expect(html).not.toContain('<b>Don Beto</b>')
    expect(html).toContain('href="https://cotizapro.mariobustos.io/dashboard/billing"')
  })

  it('saluda sin nombre si el propietario no lo tiene', () => {
    expect(buildPlanExpiryEmail({ ...base, ownerName: null }).text.startsWith('Hola,')).toBe(true)
  })
})
```

Crear `apps/web/lib/billing/notices.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { parseDueNotices, runBillingNotices, type NoticeDeps } from './notices'
import type { DueNotice } from './types'

const now = new Date('2026-10-13T15:00:00.000Z')
const notice: DueNotice = {
  organizationId: '00000000-0000-0000-00c0-000000000003',
  organizationName: 'Plomería Don Beto',
  planId: 'pro',
  periodEnd: '2026-10-16T14:00:00.123456+00:00',
  ownerEmail: 'beto@example.test',
  ownerName: 'Beto Ramírez',
  sentKinds: [],
}

function deps(overrides: Partial<NoticeDeps> = {}): NoticeDeps {
  return {
    now,
    renewUrl: 'https://cotizapro.example/dashboard/billing',
    claim: vi.fn().mockResolvedValue(true),
    release: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

describe('runBillingNotices', () => {
  it('manda el aviso de 3 días una vez y lo reclama con su cubo', async () => {
    const d = deps()
    expect(await runBillingNotices([notice], d)).toEqual({ considered: 1, sent: 1, skipped: 0, failed: 0 })
    expect(d.claim).toHaveBeenCalledWith(notice, 'd3')
    expect(d.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'beto@example.test', subject: 'Tu plan Taller de CotizaPro vence en 3 días' }))
  })

  it('no reclama un aviso que ya se envió en este periodo', async () => {
    const d = deps()
    expect(await runBillingNotices([{ ...notice, sentKinds: ['d3'] }], d)).toMatchObject({ sent: 0, skipped: 1 })
    expect(d.claim).not.toHaveBeenCalled()
  })

  it('si otra corrida ya lo reclamó, no lo manda', async () => {
    const d = deps({ claim: vi.fn().mockResolvedValue(false) })
    expect(await runBillingNotices([notice], d)).toMatchObject({ sent: 0, skipped: 1 })
    expect(d.send).not.toHaveBeenCalled()
  })

  it('libera el reclamo cuando el correo falla, para reintentar en la siguiente corrida', async () => {
    const d = deps({ send: vi.fn().mockResolvedValue(false) })
    expect(await runBillingNotices([notice], d)).toMatchObject({ sent: 0, failed: 1 })
    expect(d.release).toHaveBeenCalledWith(notice, 'd3')
  })

  it('omite cuentas sin correo del propietario o con más de 7 días', async () => {
    const summary = await runBillingNotices([{ ...notice, ownerEmail: null }, { ...notice, periodEnd: '2026-10-25T15:00:00Z' }], deps())
    expect(summary).toEqual({ considered: 2, sent: 0, skipped: 2, failed: 0 })
  })

  it('manda el aviso del día del vencimiento a una cuenta ya vencida', async () => {
    const d = deps()
    await runBillingNotices([{ ...notice, periodEnd: '2026-10-13T10:00:00Z' }], d)
    expect(d.claim).toHaveBeenCalledWith(expect.objectContaining({ organizationId: notice.organizationId }), 'd0')
  })
})

describe('parseDueNotices', () => {
  it('convierte filas de la RPC y descarta las inválidas', () => {
    const rows = parseDueNotices([
      { organization_id: 'a', organization_name: 'A', plan: 'pro', current_period_end: '2026-10-16T14:00:00+00:00', owner_email: 'a@x.test', owner_name: null, sent_kinds: ['d7'] },
      { organization_id: 'b', organization_name: 'B', plan: 'free', current_period_end: '2026-10-16T14:00:00+00:00', owner_email: null, owner_name: null, sent_kinds: [] },
    ])
    expect(rows).toEqual([
      { organizationId: 'a', organizationName: 'A', planId: 'pro', periodEnd: '2026-10-16T14:00:00+00:00', ownerEmail: 'a@x.test', ownerName: null, sentKinds: ['d7'] },
    ])
    expect(parseDueNotices(null)).toEqual([])
  })
})
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/cron lib/email/plan-expiry-email.test.ts lib/billing/notices.test.ts`
Expected: FAIL con `Failed to resolve import` de `./verify-cron`, `./plan-expiry-email` y `./notices`.

- [ ] **Step 3: Escribir la validación del cron y el cliente anónimo**

Crear `apps/web/lib/cron/verify-cron.ts`:

```ts
import { timingSafeEqual } from 'crypto'

export const MIN_CRON_SECRET_LENGTH = 32

export type CronAuthResult =
  | { readonly ok: true; readonly secret: string }
  | { readonly ok: false; readonly status: 401 | 500; readonly reason: 'not_configured' | 'missing' | 'invalid' }

export function verifyCronAuthorization(header: string | null, secret: string | undefined): CronAuthResult {
  if (!secret || secret.length < MIN_CRON_SECRET_LENGTH) return { ok: false, status: 500, reason: 'not_configured' }
  if (!header) return { ok: false, status: 401, reason: 'missing' }
  const expected = Buffer.from(`Bearer ${secret}`, 'utf-8')
  const received = Buffer.from(header, 'utf-8')
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return { ok: false, status: 401, reason: 'invalid' }
  }
  return { ok: true, secret }
}
```

Crear `apps/web/lib/supabase/anon.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente anónimo sin sesión ni cabeceras del request. Para rutas de servidor que se autentican
 * ante la base con su propia credencial (cron); createServerClient() reenviaría el Bearer del cron como JWT.
 */
export function createAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase anon client is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
```

- [ ] **Step 4: Escribir la plantilla del correo**

Crear `apps/web/lib/email/plan-expiry-email.ts`:

```ts
import { encode as escapeHtml } from 'html-entities'
import { formatExpiryDate } from '@/lib/billing/expiry'
import { daysLabel } from '@/lib/billing/expiry-copy'
import type { BillingNoticeKind } from '@/lib/billing/types'
import type { EmailContent } from './quote-email'

export interface PlanExpiryEmailInput {
  readonly businessName: string
  readonly ownerName: string | null
  readonly planName: string
  readonly kind: BillingNoticeKind
  readonly daysLeft: number
  readonly periodEnd: string
  readonly renewUrl: string
}

const BRAND_COLOR = '#EA580C'

function subjectFor(input: PlanExpiryEmailInput): string {
  return input.kind === 'd0'
    ? `Tu plan ${input.planName} de CotizaPro venció`
    : `Tu plan ${input.planName} de CotizaPro vence en ${daysLabel(input.daysLeft)}`
}

function bodyLines(input: PlanExpiryEmailInput): readonly string[] {
  const date = formatExpiryDate(input.periodEnd)
  const status = input.kind === 'd0'
    ? `El plan ${input.planName} de ${input.businessName} venció el ${date}. La cuenta quedó en solo lectura: pueden ver y descargar todo, pero no crear, editar ni enviar cotizaciones hasta renovar.`
    : `El plan ${input.planName} de ${input.businessName} vence el ${date} (en ${daysLabel(input.daysLeft)}). Al vencer, la cuenta queda en solo lectura: podrán ver y descargar todo, pero no crear, editar ni enviar cotizaciones hasta renovar.`
  return [
    status,
    'Si tu suscripción de Mercado Pago sigue activa, el cobro se hace solo y renovamos tu plan en cuanto lo confirmamos.',
    'Tus datos no se borran.',
  ]
}

function htmlFor(greeting: string, lines: readonly string[], renewUrl: string): string {
  const paragraphs = lines.map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${escapeHtml(line)}</p>`).join('\n')
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:${BRAND_COLOR};color:#ffffff;padding:20px 24px;font-size:18px;font-weight:bold">CotizaPro</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 12px;font-size:16px">${escapeHtml(greeting)}</p>
${paragraphs}
<p style="margin:20px 0 0"><a href="${escapeHtml(renewUrl)}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Renovar plan</a></p>
</td></tr></table></td></tr></table></body></html>`
}

export function buildPlanExpiryEmail(input: PlanExpiryEmailInput): EmailContent {
  const firstName = input.ownerName?.trim().split(/\s+/)[0]
  const greeting = firstName ? `Hola ${firstName},` : 'Hola,'
  const lines = bodyLines(input)
  const text = [greeting, '', ...lines, '', `Renovar plan: ${input.renewUrl}`].join('\n')
  return { subject: subjectFor(input), html: htmlFor(greeting, lines, input.renewUrl), text }
}
```

- [ ] **Step 5: Escribir el procesador de avisos y su conexión a las RPC**

Crear `apps/web/lib/billing/notices.ts`:

```ts
import { z } from 'zod'
import { PLANS } from '@/lib/plans/catalog'
import { buildPlanExpiryEmail } from '@/lib/email/plan-expiry-email'
import type { EmailContent } from '@/lib/email/quote-email'
import { daysUntilExpiry, noticeKindFor } from './expiry'
import type { BillingNoticeKind, DueNotice } from './types'

const dueRowSchema = z.object({
  organization_id: z.string(),
  organization_name: z.string(),
  plan: z.enum(['starter', 'pro', 'enterprise']),
  current_period_end: z.string(),
  owner_email: z.string().nullable(),
  owner_name: z.string().nullable(),
  sent_kinds: z.array(z.enum(['d7', 'd3', 'd1', 'd0'])).nullable(),
})

export function parseDueNotices(data: unknown): DueNotice[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((raw): DueNotice[] => {
    const row = dueRowSchema.safeParse(raw)
    if (!row.success) return []
    return [{
      organizationId: row.data.organization_id,
      organizationName: row.data.organization_name,
      planId: row.data.plan,
      periodEnd: row.data.current_period_end,
      ownerEmail: row.data.owner_email,
      ownerName: row.data.owner_name,
      sentKinds: row.data.sent_kinds ?? [],
    }]
  })
}

export interface OutgoingEmail extends EmailContent {
  readonly to: string
}

export interface NoticeDeps {
  readonly now: Date
  readonly renewUrl: string
  readonly claim: (notice: DueNotice, kind: BillingNoticeKind) => Promise<boolean>
  readonly release: (notice: DueNotice, kind: BillingNoticeKind) => Promise<void>
  readonly send: (email: OutgoingEmail) => Promise<boolean>
}

export interface NoticeRunSummary {
  readonly considered: number
  readonly sent: number
  readonly skipped: number
  readonly failed: number
}

type NoticeOutcome = 'sent' | 'skipped' | 'failed'

async function processNotice(notice: DueNotice, deps: NoticeDeps): Promise<NoticeOutcome> {
  const daysLeft = daysUntilExpiry(notice.periodEnd, deps.now)
  const kind = daysLeft === null ? null : noticeKindFor(daysLeft)
  if (daysLeft === null || !kind || !notice.ownerEmail || notice.sentKinds.includes(kind)) return 'skipped'
  if (!(await deps.claim(notice, kind))) return 'skipped'
  const email = buildPlanExpiryEmail({
    businessName: notice.organizationName,
    ownerName: notice.ownerName,
    planName: PLANS[notice.planId].name,
    kind,
    daysLeft,
    periodEnd: notice.periodEnd,
    renewUrl: deps.renewUrl,
  })
  if (await deps.send({ ...email, to: notice.ownerEmail })) return 'sent'
  await deps.release(notice, kind)
  return 'failed'
}

/** Secuencial a propósito: pocas cuentas por día y sin ráfagas contra Resend. */
export async function runBillingNotices(notices: readonly DueNotice[], deps: NoticeDeps): Promise<NoticeRunSummary> {
  const outcomes = await notices.reduce<Promise<readonly NoticeOutcome[]>>(
    async (previous, notice) => [...(await previous), await processNotice(notice, deps)],
    Promise.resolve([]),
  )
  const count = (outcome: NoticeOutcome): number => outcomes.filter((o) => o === outcome).length
  return { considered: notices.length, sent: count('sent'), skipped: count('skipped'), failed: count('failed') }
}
```

Crear `apps/web/lib/billing/notice-rpc.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/integrations/email'
import { logger } from '@/lib/logger'
import { parseDueNotices, type NoticeDeps } from './notices'
import type { BillingNoticeKind, DueNotice } from './types'

interface NoticeArgs {
  readonly p_cron_key: string
  readonly p_org: string
  readonly p_period_end: string
  readonly p_kind: BillingNoticeKind
}

function noticeArgs(cronKey: string, notice: DueNotice, kind: BillingNoticeKind): NoticeArgs {
  return { p_cron_key: cronKey, p_org: notice.organizationId, p_period_end: notice.periodEnd, p_kind: kind }
}

export async function fetchDueNotices(supabase: SupabaseClient, cronKey: string): Promise<readonly DueNotice[] | null> {
  const { data, error } = await supabase.rpc('billing_notices_due', { p_cron_key: cronKey })
  if (error) {
    logger.error('billing_notices_due failed', error)
    return null
  }
  return parseDueNotices(data)
}

export function rpcNoticeDeps(supabase: SupabaseClient, cronKey: string, now: Date, renewUrl: string): NoticeDeps {
  return {
    now,
    renewUrl,
    claim: async (notice, kind) => {
      const { data, error } = await supabase.rpc('claim_billing_notice', noticeArgs(cronKey, notice, kind))
      if (error) logger.error('claim_billing_notice failed', error, { organizationId: notice.organizationId, kind })
      return !error && data === true
    },
    release: async (notice, kind) => {
      const { error } = await supabase.rpc('release_billing_notice', noticeArgs(cronKey, notice, kind))
      if (error) logger.error('release_billing_notice failed', error, { organizationId: notice.organizationId, kind })
    },
    send: async (email) => {
      const result = await sendEmail({ to: email.to, subject: email.subject, html: email.html, text: email.text, fromName: 'CotizaPro' })
      return result.success
    },
  }
}
```

- [ ] **Step 6: Correr las pruebas y confirmar que pasan**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/cron lib/email lib/billing`
Expected: PASS.

- [ ] **Step 7: Escribir la ruta del cron**

Crear `apps/web/app/api/cron/billing-notices/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { verifyCronAuthorization } from '@/lib/cron/verify-cron'
import { createAnonClient } from '@/lib/supabase/anon'
import { fetchDueNotices, rpcNoticeDeps } from '@/lib/billing/notice-rpc'
import { runBillingNotices } from '@/lib/billing/notices'

export const dynamic = 'force-dynamic'

function renewUrl(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard/billing`
}

/** Cron diario (VPS: /etc/cron.d/cotizapro): avisos 7, 3 y 1 días antes y el día del vencimiento. */
export async function POST(request: NextRequest) {
  const auth = verifyCronAuthorization(request.headers.get('authorization'), process.env.CRON_SECRET)
  if (!auth.ok) {
    logger.security('Billing notices cron rejected', { reason: auth.reason })
    return NextResponse.json({ error: auth.status === 500 ? 'Cron no configurado' : 'No autorizado' }, { status: auth.status })
  }
  try {
    const supabase = createAnonClient()
    const due = await fetchDueNotices(supabase, auth.secret)
    if (!due) return NextResponse.json({ error: 'No se pudieron leer los vencimientos' }, { status: 500 })
    const summary = await runBillingNotices(due, rpcNoticeDeps(supabase, auth.secret, new Date(), renewUrl()))
    logger.info('Billing notices cron completed', { ...summary })
    return NextResponse.json({ success: true, ...summary, timestamp: new Date().toISOString() })
  } catch (error) {
    logger.error('Billing notices cron failed', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export const GET = POST
```

- [ ] **Step 8: Verificar la ruta en local sin mandar correos reales**

1. Registrar el hash del `CRON_SECRET` local (no se imprime el secreto):

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web
DB="postgresql://postgres:postgres@127.0.0.1:54332/postgres"
CRON_KEY="$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)"
psql "$DB" -v ON_ERROR_STOP=1 -v key="$CRON_KEY" <<'SQL'
INSERT INTO public.platform_settings (key, value)
VALUES ('cron_key_sha256', encode(extensions.digest(:'key', 'sha256'), 'hex'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
UPDATE public.organizations SET current_period_end = now() + interval '3 days'
WHERE id = '00000000-0000-0000-00c0-000000000003';
SQL
```

2. Levantar el servidor con una llave de Resend inválida a propósito, para que ningún correo salga a los dominios demo:

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web
RESEND_API_KEY=re_invalid_local_check pnpm exec next dev -p 3101
```

(Si Next no permite un segundo `next dev`, detener el de 3100, usar 3100 con esa variable y al final levantarlo normal.)

3. Llamar al cron:

```bash
curl -s -X POST -H "Authorization: Bearer $CRON_KEY" http://localhost:3101/api/cron/billing-notices
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer incorrecto" http://localhost:3101/api/cron/billing-notices
psql "$DB" -Atc "select count(*) from billing_notices where organization_id = '00000000-0000-0000-00c0-000000000003'"
```

Expected: el primer `curl` regresa `{"success":true,"considered":N,...,"failed":1,...}` con `N ≥ 1` (Resend rechaza la llave falsa, el reclamo se libera); el segundo imprime `401`; la consulta imprime `0`.

4. Restaurar Don Beto y detener el servidor de 3101:

```bash
psql "$DB" -c "UPDATE organizations SET current_period_end = NULL WHERE id = '00000000-0000-0000-00c0-000000000003'"
```

- [ ] **Step 9: Verificar tipos**

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec tsc --noEmit -p .`
Expected: sin errores.

- [ ] **Step 10: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/lib/cron apps/web/lib/supabase/anon.ts apps/web/lib/email/plan-expiry-email.ts apps/web/lib/email/plan-expiry-email.test.ts apps/web/lib/billing/notices.ts apps/web/lib/billing/notices.test.ts apps/web/lib/billing/notice-rpc.ts apps/web/app/api/cron/billing-notices
git commit -m "feat: cron diario de avisos de vencimiento por correo"
```

---

### Task 12b: Cron de recordatorios con la llave del cron (sin service role)

Hoy `app/api/cron/reminders-check/route.ts` usa `createAdminClient()`, pero el contenedor web de producción no recibe `SUPABASE_SERVICE_ROLE_KEY`, así que en producción la ruta fallaría. Esta tarea la pasa al mismo mecanismo de la Task 12: la ruta valida el Bearer y la base valida el hash con `cron_key_valid()`. `lib/supabase/admin.ts` se queda porque lo siguen usando el webhook de Stripe y el checkout.

**Files:**
- Modify: `apps/web/supabase/migrations/042_billing_superadmin.sql` (parte C al final)
- Create: `apps/web/supabase/tests/client_reminders_cron.sql`
- Modify: `apps/web/lib/reminders/due-notifications.ts`, `apps/web/lib/reminders/due-notifications.test.ts`
- Modify: `apps/web/app/api/cron/reminders-check/route.ts`

**Interfaces:**
- Consumes: `cron_key_valid(TEXT)` (Task 2); `verifyCronAuthorization`, `createAnonClient` (Task 12); `buildReminderEmail`, `orgBranding`, `safeReplyTo`, `sendEmail`, `sendWhatsAppMessage` (ya existen).
- Produces:
  - SQL `client_reminders_due(p_cron_key TEXT, p_until DATE)` → filas planas `{ id, reminder_type, scheduled_date, notification_channels, client_name, client_email, client_phone, client_whatsapp_phone, organization_name, organization_settings }`, máximo 500.
  - SQL `mark_client_reminder_sent(p_cron_key TEXT, p_id UUID, p_sent_at TIMESTAMPTZ) → BOOLEAN` (solo marca si sigue `pending` y sin `notification_sent_at`).
  - TS `parseDueReminders(data: unknown): DueReminderRow[]` y `sendDueClientReminders(supabase: SupabaseClient, cronKey: string, now: Date): Promise<DueNotificationSummary>`.
  - HTTP `GET|POST /api/cron/reminders-check`: 200 `{ success, processed, sent, failed }`; 401 sin o con secreto incorrecto; 500 sin `CRON_SECRET` de 32+ caracteres.

- [ ] **Step 1: Escribir la prueba SQL que falla**

Crear `apps/web/supabase/tests/client_reminders_cron.sql`:

```sql
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.platform_settings (key, value)
VALUES ('cron_key_sha256', encode(extensions.digest(repeat('k', 40), 'sha256'), 'hex'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE TEMP TABLE results (name TEXT, ok BOOLEAN) ON COMMIT DROP;
GRANT ALL ON results TO anon;

WITH org AS (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1),
cli AS (SELECT c.id, c.organization_id FROM public.clients c JOIN org ON org.id = c.organization_id LIMIT 1)
INSERT INTO public.follow_up_reminders (id, organization_id, client_id, title, reminder_type, scheduled_date, status, auto_send_notification, notification_channels)
SELECT v.id, cli.organization_id, cli.id, 'Prueba cron', v.kind, current_date, 'pending', v.auto, ARRAY['email']
FROM cli, (VALUES
  ('00000000-0000-0000-0000-00000000c001'::uuid, 'maintenance', true),
  ('00000000-0000-0000-0000-00000000c002'::uuid, 'follow_up', true),
  ('00000000-0000-0000-0000-00000000c003'::uuid, 'renewal', false)
) AS v(id, kind, auto);

SET LOCAL ROLE anon;
DO $
BEGIN
  PERFORM public.client_reminders_due(repeat('x', 40), current_date + 1);
  INSERT INTO results VALUES ('llave incorrecta rechazada', false);
EXCEPTION WHEN insufficient_privilege THEN
  INSERT INTO results VALUES ('llave incorrecta rechazada', true);
END $;

INSERT INTO results
SELECT 'solo mantenimiento con aviso activo',
       array_agg(id ORDER BY id) FILTER (WHERE id::text LIKE '00000000-0000-0000-0000-00000000c00%')
         = ARRAY['00000000-0000-0000-0000-00000000c001'::uuid]
FROM public.client_reminders_due(repeat('k', 40), current_date + 1);

INSERT INTO results VALUES ('primer marcado regresa true',
  public.mark_client_reminder_sent(repeat('k', 40), '00000000-0000-0000-0000-00000000c001', now()));
INSERT INTO results VALUES ('segundo marcado regresa false',
  NOT public.mark_client_reminder_sent(repeat('k', 40), '00000000-0000-0000-0000-00000000c001', now()));
RESET ROLE;

SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name FROM results;
SELECT count(*) FILTER (WHERE NOT ok) AS failed FROM results;
ROLLBACK;
```

- [ ] **Step 2: Correr la prueba y confirmar que falla**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web
DB="postgresql://postgres:postgres@127.0.0.1:54332/postgres"
psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/client_reminders_cron.sql
```

Expected: ERROR `function public.client_reminders_due(text, date) does not exist`.

- [ ] **Step 3: Agregar la parte C a la migración 042**

Agregar al final de `apps/web/supabase/migrations/042_billing_superadmin.sql`:

```sql
-- ---------------- Parte C: cron de recordatorios al cliente ----------------
-- Mismo criterio que la parte B: sin service role en el contenedor web; la llave del cron se valida por hash.

CREATE OR REPLACE FUNCTION public.client_reminders_due(p_cron_key TEXT, p_until DATE)
RETURNS TABLE (
  id UUID, reminder_type TEXT, scheduled_date DATE, notification_channels TEXT[],
  client_name TEXT, client_email TEXT, client_phone TEXT, client_whatsapp_phone TEXT,
  organization_name TEXT, organization_settings JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $
#variable_conflict use_column
BEGIN
  IF NOT public.cron_key_valid(p_cron_key) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT r.id, r.reminder_type, r.scheduled_date, r.notification_channels,
         c.name, c.email, c.phone, c.whatsapp_phone, o.name, o.settings
  FROM public.follow_up_reminders r
  JOIN public.clients c ON c.id = r.client_id
  JOIN public.organizations o ON o.id = r.organization_id
  WHERE r.auto_send_notification
    AND r.status = 'pending'
    AND r.notification_sent_at IS NULL
    AND r.reminder_type IN ('maintenance', 'renewal')
    AND r.scheduled_date <= p_until
  ORDER BY r.scheduled_date
  LIMIT 500;
END;
$;
REVOKE ALL ON FUNCTION public.client_reminders_due(TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_reminders_due(TEXT, DATE) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_client_reminder_sent(p_cron_key TEXT, p_id UUID, p_sent_at TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $
BEGIN
  IF NOT public.cron_key_valid(p_cron_key) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  UPDATE public.follow_up_reminders
  SET status = 'sent', notification_sent_at = p_sent_at
  WHERE id = p_id AND status = 'pending' AND notification_sent_at IS NULL;
  RETURN FOUND;
END;
$;
REVOKE ALL ON FUNCTION public.mark_client_reminder_sent(TEXT, UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_client_reminder_sent(TEXT, UUID, TIMESTAMPTZ) TO anon, authenticated, service_role;
```

La lista `('maintenance', 'renewal')` debe coincidir con `CLIENT_NOTIFIABLE_TYPES` de `lib/reminders/client-notice.ts`; la prueba del Step 5 lo fija.

- [ ] **Step 4: Aplicar la migración y correr la prueba SQL**

Repetir el comando del Step 4 de la Task 1 y luego:

```bash
psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/client_reminders_cron.sql
```

Expected: las 4 filas `PASS` y `failed = 0`.

- [ ] **Step 5: Escribir la prueba unitaria que falla**

Agregar a `apps/web/lib/reminders/due-notifications.test.ts`:

```ts
import { CLIENT_NOTIFIABLE_TYPES } from './client-notice'
import { parseDueReminders } from './due-notifications'

describe('parseDueReminders', () => {
  const row = {
    id: 'r1', reminder_type: 'maintenance', scheduled_date: '2026-10-14', notification_channels: ['email'],
    client_name: 'Ana', client_email: 'ana@example.com', client_phone: null, client_whatsapp_phone: null,
    organization_name: 'Vidrios Ana', organization_settings: { company_email: 'hola@vidrios.mx' },
  }

  it('convierte la fila plana de la RPC al formato interno', () => {
    expect(parseDueReminders([row])).toEqual([{
      id: 'r1', reminder_type: 'maintenance', scheduled_date: '2026-10-14', notification_channels: ['email'],
      client: { name: 'Ana', email: 'ana@example.com', phone: null, whatsapp_phone: null },
      organization: { name: 'Vidrios Ana', settings: { company_email: 'hola@vidrios.mx' } },
    }])
  })

  it('descarta filas sin id o sin nombre de cliente y respuestas que no son arreglo', () => {
    expect(parseDueReminders([{ ...row, id: null }, { ...row, client_name: null }])).toEqual([])
    expect(parseDueReminders(null)).toEqual([])
  })

  it('los tipos de la RPC coinciden con los avisables', () => {
    expect([...CLIENT_NOTIFIABLE_TYPES].sort()).toEqual(['maintenance', 'renewal'])
  })
})
```

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && pnpm exec vitest run lib/reminders`
Expected: FAIL con `parseDueReminders is not exported`.

- [ ] **Step 6: Cambiar `due-notifications.ts` a las RPC**

En `apps/web/lib/reminders/due-notifications.ts`:
1. Quitar el import de `CLIENT_NOTIFIABLE_TYPES` (el filtro vive en la RPC) y conservar `isClientNotifiable`.
2. Agregar el parser y reemplazar `sendDueClientReminders`:

```ts
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

/** Convierte las filas planas de `client_reminders_due` al formato que usa `notifyOne`. */
export function parseDueReminders(data: unknown): DueReminderRow[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((raw: Record<string, unknown>) => {
    const id = text(raw.id)
    const clientName = text(raw.client_name)
    if (!id || !clientName) return []
    return [{
      id,
      reminder_type: String(raw.reminder_type ?? ''),
      scheduled_date: String(raw.scheduled_date ?? ''),
      notification_channels: Array.isArray(raw.notification_channels) ? raw.notification_channels.filter((c): c is string => typeof c === 'string') : null,
      client: { name: clientName, email: text(raw.client_email), phone: text(raw.client_phone), whatsapp_phone: text(raw.client_whatsapp_phone) },
      organization: { name: String(raw.organization_name ?? ''), settings: raw.organization_settings ?? {} },
    }]
  })
}

/** Envía los avisos al cliente de recordatorios vencidos. La base valida `cronKey` contra el hash guardado. */
export async function sendDueClientReminders(supabase: SupabaseClient, cronKey: string, now: Date): Promise<DueNotificationSummary> {
  const { data, error } = await supabase.rpc('client_reminders_due', { p_cron_key: cronKey, p_until: dueDateLimit(now) })
  if (error) throw new Error(`due reminders query failed: ${error.message}`)

  const rows = parseDueReminders(data)
  let sent = 0
  for (const row of rows) {
    const ok = await notifyOne(row).catch((err: unknown) => {
      logger.error('Reminder notification failed', err, { reminderId: row.id })
      return false
    })
    if (!ok) continue
    sent += 1
    const { error: markError } = await supabase.rpc('mark_client_reminder_sent', { p_cron_key: cronKey, p_id: row.id, p_sent_at: now.toISOString() })
    if (markError) logger.error('Reminder mark-sent failed', markError, { reminderId: row.id })
  }
  return { processed: rows.length, sent, failed: rows.length - sent }
}
```

`BATCH_LIMIT` deja de usarse (el límite de 500 vive en la RPC); quitarlo.

- [ ] **Step 7: Cambiar la ruta del cron**

Reemplazar `apps/web/app/api/cron/reminders-check/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuthorization } from '@/lib/cron/verify-cron'
import { createAnonClient } from '@/lib/supabase/anon'
import { sendDueClientReminders } from '@/lib/reminders/due-notifications'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/** Cron diario: avisa al cliente de mantenimientos y renovaciones próximos. Sin service role: la base valida el hash del secreto. */
export async function GET(request: NextRequest) {
  const auth = verifyCronAuthorization(request.headers.get('authorization'), process.env.CRON_SECRET)
  if (!auth.ok) {
    logger.security('Reminders cron rejected', { reason: auth.reason })
    return NextResponse.json({ error: auth.status === 500 ? 'Cron no configurado' : 'No autorizado' }, { status: auth.status })
  }
  try {
    const summary = await sendDueClientReminders(createAnonClient(), auth.secret, new Date())
    logger.info('Cron reminders completed', { ...summary })
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    logger.error('Cron reminders failed', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export const POST = GET
```

- [ ] **Step 8: Correr pruebas, tipos y la ruta en local**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web
pnpm exec vitest run lib/reminders lib/cron
pnpm exec tsc --noEmit -p .
CRON_KEY="$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)"
curl -s -H "Authorization: Bearer $CRON_KEY" http://localhost:3100/api/cron/reminders-check
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer incorrecto" http://localhost:3100/api/cron/reminders-check
```

Expected: pruebas PASS; tipos sin errores; el primer `curl` regresa `{"success":true,"processed":N,...}` (el hash local ya quedó registrado en la Task 12, Step 8); el segundo imprime `401`. Si hay recordatorios demo vencidos con aviso activo, sus correos van a `delivered@resend.dev` o se usa la llave inválida de la Task 12 para no enviar.

- [ ] **Step 9: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/supabase/migrations/042_billing_superadmin.sql apps/web/supabase/tests/client_reminders_cron.sql apps/web/lib/reminders apps/web/app/api/cron/reminders-check/route.ts
git commit -m "fix: cron de recordatorios con la llave del cron, sin service role"
```

---

### Task 13: E2E de D2 y verificación completa

**Files:**
- Create: `apps/web/e2e/helpers/billing-admin.ts`
- Create: `apps/web/e2e/specs/25-plan-billing.spec.ts`

**Interfaces:**
- Consumes: todo lo anterior; `demoAccessToken`, `DEMO_PASSWORD` (`e2e/helpers/demo-auth.ts`); `AuthPage`; `chooseComboboxOption`; selectores `org-row-<id>`, `#activate-reference`, `activation-total`, `plan-status-line`, `plan-banner-warning`, `plan-banner-danger`.
- Produces: `grantPlatformAdmin(email)`, `revokePlatformAdmin(email)`, `setBillingPeriod(orgId, plan, periodEnd | null)`, `restoreDonBeto()`; constantes `DON_BETO_ORG`, `DON_BETO_OWNER`, `SUPERADMIN_EMAIL`, `NON_ADMIN_EMAIL`, `E2E_REFERENCE_PREFIX`.

- [ ] **Step 1: Escribir el helper de datos de prueba**

Crear `apps/web/e2e/helpers/billing-admin.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

export const DON_BETO_ORG = '00000000-0000-0000-00c0-000000000003'
export const DON_BETO_OWNER = 'beto@plomeria.demo.cotizapro.mx'
export const SUPERADMIN_EMAIL = 'direccion@megaglass.demo.cotizapro.mx'
export const NON_ADMIN_EMAIL = 'hector@voltaje.demo.cotizapro.mx'
export const E2E_REFERENCE_PREFIX = 'MP-E2E-'

type E2ePlan = 'free' | 'starter' | 'pro' | 'enterprise'

/** Service role solo para preparar datos de prueba en la base local; la app nunca la usa en rutas de usuario. */
function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function userIdByEmail(db: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await db.from('profiles').select('id').eq('email', email).single()
  if (error || !data) throw new Error(`No existe el perfil demo ${email}: ${error?.message ?? 'sin fila'}`)
  return (data as { id: string }).id
}

export async function grantPlatformAdmin(email: string): Promise<void> {
  const db = serviceClient()
  const { error } = await db.from('platform_admins').upsert({ user_id: await userIdByEmail(db, email) })
  if (error) throw new Error(`No se pudo dar superadmin: ${error.message}`)
}

export async function revokePlatformAdmin(email: string): Promise<void> {
  const db = serviceClient()
  await db.from('platform_admins').delete().eq('user_id', await userIdByEmail(db, email))
}

export async function setBillingPeriod(orgId: string, plan: E2ePlan, periodEnd: Date | null): Promise<void> {
  const { error } = await serviceClient()
    .from('organizations')
    .update({ plan, subscription_status: 'active', current_period_end: periodEnd ? periodEnd.toISOString() : null })
    .eq('id', orgId)
  if (error) throw new Error(`No se pudo ajustar el periodo: ${error.message}`)
}

export async function restoreDonBeto(): Promise<void> {
  const db = serviceClient()
  await db
    .from('organizations')
    .update({ plan: 'pro', subscription_status: 'active', current_period_end: null, billing_provider: null, billing_reference: null })
    .eq('id', DON_BETO_ORG)
  await db.from('plan_activations').delete().eq('organization_id', DON_BETO_ORG).like('reference', `${E2E_REFERENCE_PREFIX}%`)
}
```

- [ ] **Step 2: Escribir la E2E**

Crear `apps/web/e2e/specs/25-plan-billing.spec.ts`:

```ts
import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { DEMO_PASSWORD, demoAccessToken } from '../helpers/demo-auth'
import { AuthPage } from '../pages/auth.page'
import { chooseComboboxOption } from '../helpers/combobox'
import {
  DON_BETO_ORG,
  DON_BETO_OWNER,
  E2E_REFERENCE_PREFIX,
  NON_ADMIN_EMAIL,
  SUPERADMIN_EMAIL,
  grantPlatformAdmin,
  restoreDonBeto,
  revokePlatformAdmin,
  setBillingPeriod,
} from '../helpers/billing-admin'

// Requiere el seed demo y la migración 042. Usa Plomería Don Beto y la deja como estaba al terminar.
const DAY = 86_400_000
test.describe.configure({ mode: 'serial' })

async function login(page: Page, email: string): Promise<void> {
  const auth = new AuthPage(page)
  await auth.goToLogin()
  await auth.login(email, DEMO_PASSWORD)
}

interface QuoteAttempt {
  readonly status: number
  readonly code: string | null
  readonly id: string | null
}

async function tryCreateQuote(api: APIRequestContext, token: string): Promise<QuoteAttempt> {
  const headers = { Authorization: `Bearer ${token}` }
  const clients: { clients: { id: string }[] } = await (await api.get('/api/clients', { headers })).json()
  const res = await api.post('/api/quotes', {
    headers,
    data: {
      client_id: clients.clients[0]!.id,
      valid_until: new Date(Date.now() + 15 * DAY).toISOString(),
      items: [{ description: 'Revisión de fuga E2E', quantity: 1, unit_price: 500, unit_type: 'fixed' }],
    },
  })
  const body: { code?: string; data?: { id: string } } = await res.json()
  return { status: res.status(), code: body.code ?? null, id: body.data?.id ?? null }
}

test.describe('Cobro semi-manual y vencimiento (D2)', () => {
  test.beforeAll(async () => {
    await restoreDonBeto()
    await grantPlatformAdmin(SUPERADMIN_EMAIL)
  })

  test.afterAll(async () => {
    await restoreDonBeto()
    await revokePlatformAdmin(SUPERADMIN_EMAIL)
  })

  test('quien no es superadmin ve 404 en /admin', async ({ page }) => {
    await login(page, NON_ADMIN_EMAIL)
    const res = await page.goto('/admin')
    expect(res?.status()).toBe(404)
  })

  test('las rutas de superadmin responden 404 a quien no lo es', async ({ playwright, baseURL }) => {
    const api = await playwright.request.newContext({ baseURL })
    const res = await api.post(`/api/admin/organizations/${DON_BETO_ORG}/activate`, {
      headers: { Authorization: `Bearer ${await demoAccessToken(DON_BETO_OWNER)}` },
      data: { plan: 'enterprise', users: 1, months: 12, reference: 'intento' },
    })
    expect(res.status()).toBe(404)
  })

  test('el superadmin activa Taller por 1 mes y la empresa ve el vencimiento', async ({ page, browser }) => {
    await login(page, SUPERADMIN_EMAIL)
    await page.goto('/admin?q=plomeria-don-beto')
    const row = page.getByTestId(`org-row-${DON_BETO_ORG}`)
    await row.getByRole('button', { name: 'Activar o renovar' }).click()
    await chooseComboboxOption(page, 'plan', 'Taller')
    await page.locator('#activate-reference').fill(`${E2E_REFERENCE_PREFIX}001`)
    await expect(page.getByTestId('activation-total')).toContainText('999')
    await page.getByRole('button', { name: 'Activar', exact: true }).click()
    await expect(row).toContainText(/Vence en (2[89]|3[01]) días/)

    const owner = await browser.newPage()
    await login(owner, DON_BETO_OWNER)
    await owner.goto('/dashboard/billing')
    await expect(owner.getByTestId('plan-status-line')).toContainText('Plan Taller · vence el')
    await expect(owner.getByTestId('plan-limits-table')).toBeVisible()
    await owner.close()
  })

  test('vencido: crear cotización da 402 y sale el banner rojo; al renovar se quita', async ({ page, playwright, baseURL }) => {
    await setBillingPeriod(DON_BETO_ORG, 'pro', new Date(Date.now() - 3_600_000))
    const api = await playwright.request.newContext({ baseURL })
    const ownerToken = await demoAccessToken(DON_BETO_OWNER)

    expect(await tryCreateQuote(api, ownerToken)).toMatchObject({ status: 402, code: 'PLAN_EXPIRED' })

    await login(page, DON_BETO_OWNER)
    await expect(page.getByTestId('plan-banner-danger')).toContainText('solo lectura')

    const renew = await api.post(`/api/admin/organizations/${DON_BETO_ORG}/activate`, {
      headers: { Authorization: `Bearer ${await demoAccessToken(SUPERADMIN_EMAIL)}` },
      data: { plan: 'pro', users: 1, months: 1, reference: `${E2E_REFERENCE_PREFIX}renew` },
    })
    expect(renew.status(), await renew.text()).toBe(200)

    const allowed = await tryCreateQuote(api, ownerToken)
    expect(allowed.status).toBe(201)
    if (allowed.id) await api.delete(`/api/quotes/${allowed.id}`, { headers: { Authorization: `Bearer ${ownerToken}` } })

    await page.reload()
    await expect(page.getByTestId('plan-banner-danger')).toHaveCount(0)
  })

  test('a 3 días de vencer sale el banner amarillo', async ({ page }) => {
    await setBillingPeriod(DON_BETO_ORG, 'pro', new Date(Date.now() + 3 * DAY - 3_600_000))
    await login(page, DON_BETO_OWNER)
    await expect(page.getByTestId('plan-banner-warning')).toContainText('vence en 3 días')
  })
})
```

- [ ] **Step 3: Correr la E2E nueva**

Con el servidor local en 3100 corriendo el código de esta rama:

Run: `cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web && PLAYWRIGHT_TEST_BASE_URL=http://localhost:3100 pnpm exec playwright test e2e/specs/25-plan-billing.spec.ts --reporter=line`
Expected: 5 passed. Después, confirmar que Don Beto quedó restaurado:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" -Atc "select plan, subscription_status, current_period_end is null from organizations where id = '00000000-0000-0000-00c0-000000000003'"
```

Expected: `pro|active|t`.

- [ ] **Step 4: Verificación completa**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app/apps/web
DB="postgresql://postgres:postgres@127.0.0.1:54332/postgres"
pnpm exec vitest run
pnpm exec tsc --noEmit -p .
pnpm exec eslint lib/billing lib/plans lib/admin lib/cron lib/email lib/supabase/anon.ts app/admin app/api/admin app/api/cron/billing-notices components/admin components/billing components/dashboard/plan-expiry-banner.tsx
pnpm build
psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/billing_superadmin.sql
psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/billing_notices.sql
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3100 pnpm exec playwright test e2e/specs/13-billing.spec.ts e2e/specs/04-quotes.spec.ts e2e/specs/05-team.spec.ts e2e/specs/23-review-flow.spec.ts e2e/specs/24-quote-request.spec.ts --reporter=line
```

Expected: vitest todo PASS; sin errores de tipos ni de lint; build completo; las dos pruebas SQL con `failed = 0`; las E2E de regresión con el mismo resultado que tenían antes de D2 (13-billing contra la línea base de la Task 9).

- [ ] **Step 5: Confirmar la lista final de rutas sin bloqueo**

Repetir el comando del Step 1 de la Task 6. Expected: las 13 exentas de la Task 6 más estas tres, y ninguna otra:

```
SIN BLOQUEO: app/api/admin/organizations/[id]/activate/route.ts
SIN BLOQUEO: app/api/admin/organizations/[id]/suspend/route.ts
SIN BLOQUEO: app/api/cron/billing-notices/route.ts
```

- [ ] **Step 6: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add apps/web/e2e/helpers/billing-admin.ts apps/web/e2e/specs/25-plan-billing.spec.ts
git commit -m "test: E2E de superadmin, vencimiento y renovación"
```

---

### Task 14: Variables, documentación y guía de puesta en producción (sin ejecutar)

**Files:**
- Modify: `.env.example`, `.env.production.example`
- Modify: `docs/CRON_SETUP.md`, `docs/DECISIONS.md`

**Interfaces:**
- Consumes: variables `MP_LINK_STARTER`, `MP_LINK_PRO`, `MP_LINK_ENTERPRISE`, `SUPPORT_WHATSAPP_PHONE`, `PLAN_LIMITS_ENFORCED`, `CRON_SECRET`; ruta `/api/cron/billing-notices`; tabla `platform_settings`; tabla `platform_admins`.
- Produces: documentación y una lista de pasos de operación que **solo se ejecutan con aprobación explícita del usuario, paso por paso**.

- [ ] **Step 1: Documentar las variables**

Agregar al final de `.env.example` y de `.env.production.example`:

```bash
# Cobro con Mercado Pago (D2): ligas de suscripción creadas a mano en el panel de Mercado Pago.
# Solo https. Sin la variable, el plan se muestra como "Próximamente".
MP_LINK_STARTER=
MP_LINK_PRO=
MP_LINK_ENTERPRISE=
# WhatsApp de soporte para cuentas con más usuarios que los incluidos (10 dígitos o con 52)
SUPPORT_WHATSAPP_PHONE=
# Límites por plan programados pero apagados durante el piloto
PLAN_LIMITS_ENFORCED=false
```

- [ ] **Step 2: Documentar el cron**

Agregar al final de `docs/CRON_SETUP.md`:

````markdown
## Cron: avisos de vencimiento del plan (D2)

**Endpoint:** `POST /api/cron/billing-notices` (también acepta `GET`)
**Horario:** diario a las 14:00 UTC (08:00 en Monterrey)
**Qué hace:** busca planes pagados que vencen en los próximos 7 días o vencieron en los últimos 3, y manda al propietario el aviso que toca (7, 3 o 1 días antes, o el día del vencimiento). Cada aviso sale una sola vez por periodo; si Resend falla, se reintenta en la siguiente corrida.

**Autenticación:** `Authorization: Bearer $CRON_SECRET` (32 caracteres o más). La base valida el mismo secreto contra `platform_settings.cron_key_sha256`, porque el contenedor web no recibe la service role. Alta del hash (una vez por entorno, sin imprimir el secreto):

```bash
psql "$DB" -v key="$CRON_SECRET" <<'SQL'
INSERT INTO public.platform_settings (key, value)
VALUES ('cron_key_sha256', encode(extensions.digest(:'key', 'sha256'), 'hex'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
SQL
```

Si se rota `CRON_SECRET`, repetir este paso.

**VPS (`/etc/cron.d/cotizapro`):**

```
0 14 * * * root /opt/bin/cotizapro-billing-notices.sh >> /var/log/cotizapro-billing-notices.log 2>&1
```
````

- [ ] **Step 3: Registrar la decisión**

Agregar al final de `docs/DECISIONS.md`:

```markdown

---

## ADR-008: Cobro semi-manual con Mercado Pago y solo lectura al vencer

**Decisión:** Ligas de suscripción de Mercado Pago por plan (variables `MP_LINK_*`); el operador activa y renueva desde `/admin` con RPCs `admin_*` que validan `is_platform_admin()` y auditan en `plan_activations`. Al vencer `current_period_end`, la cuenta queda en solo lectura de inmediato (402 en las rutas que escriben). Gratis y los planes pagados sin periodo no vencen. Los límites por plan están programados pero apagados (`PLAN_LIMITS_ENFORCED=false`) durante el piloto.

**Rationale:**
- Se arranca sin webhook ni credenciales de Mercado Pago en la app; las mismas RPC sirven después para un webhook.
- El navegador nunca decide el monto ni el plan: lo calcula el servidor y lo escribe una RPC; el trigger `guard_org_billing_columns` bloquea los cambios directos.
- El cron se autentica con el hash de `CRON_SECRET` porque el contenedor de producción no tiene service role.
```

- [ ] **Step 4: Commit (solo con aprobación del usuario)**

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
git add .env.example .env.production.example docs/CRON_SETUP.md docs/DECISIONS.md
git commit -m "docs: variables, cron y decisión del cobro con Mercado Pago"
```

- [ ] **Step 5: Guía de puesta en producción (NO ejecutar; pedir aprobación del usuario para cada punto)**

Seguir la skill `hostinger-vps` §0 (coexistencia) y el inventario `~/.claude/docs/infra/hostinger-vps-inventario.md`. El contenedor de base de datos real es `cotizapro-deploy-cotizapro-db-1`.

1. **Antes de tocar nada:** smoke de **todos** los dominios de todos los proyectos del VPS y anotar el resultado.
2. **Respaldos con fecha:** `pg_dump` de esquema y datos de `cotizapro-db` (`/opt/backups/cotizapro-schema-<fecha>-pre042.sql.gz`, `cotizapro-data-<fecha>-pre042.sql.gz`), respaldo del código y etiqueta de imagen de reversa `cotizapro-web-rollback:<fecha>`.
3. **Revisión previa (solo lectura), que pide el spec:**

```sql
SELECT o.plan, count(*) AS orgs,
       count(*) FILTER (WHERE m.users > CASE o.plan WHEN 'pro' THEN 3 WHEN 'enterprise' THEN 10 ELSE 1 END) AS exceden_usuarios,
       count(*) FILTER (WHERE o.plan = 'free' AND q.this_month > 5) AS exceden_cotizaciones
FROM organizations o
CROSS JOIN LATERAL (SELECT count(*) AS users FROM profiles p WHERE p.organization_id = o.id) m
CROSS JOIN LATERAL (SELECT count(*) AS this_month FROM quotes x WHERE x.organization_id = o.id
                    AND x.created_at >= date_trunc('month', now() AT TIME ZONE 'America/Monterrey') AT TIME ZONE 'America/Monterrey') q
GROUP BY o.plan ORDER BY o.plan;
```

   Reportar el resultado al usuario (no cambia nada: los límites siguen apagados). Confirmar también que las cuentas pagadas tienen `current_period_end` vacío (siguen escribiendo).
4. **Migración 042:** aplicarla dentro del contenedor en `BEGIN/COMMIT`, registrar `('042', '042_billing_superadmin')` en `supabase_migrations.schema_migrations` y ejecutar `NOTIFY pgrst, 'reload schema'`. Si D1 (041) está listo, aplicar 041 antes.
5. **Pruebas SQL en producción:** correr `billing_superadmin.sql` y `billing_notices.sql` (terminan en `ROLLBACK`; usan las cuentas demo `00c0`). Esperado: `failed = 0`.
6. **Alta del superadmin:** preguntar al usuario el correo del operador y ejecutar `INSERT INTO platform_admins (user_id) SELECT id FROM auth.users WHERE email = '<correo del operador>';`. Anotarlo en el inventario.
7. **Hash del cron:** leer `CRON_SECRET` de `/opt/cotizapro-deploy/.env` sin imprimirlo y registrar `cron_key_sha256` con el bloque de `docs/CRON_SETUP.md`.
8. **Variables de `cotizapro-web`:** agregar `MP_LINK_STARTER`, `MP_LINK_PRO`, `MP_LINK_ENTERPRISE` (las ligas reales las da el usuario), `SUPPORT_WHATSAPP_PHONE` y `PLAN_LIMITS_ENFORCED=false` a `/opt/cotizapro-deploy/.env` y al bloque `environment` de `cotizapro-web` en el compose, con respaldo `.bak-<fecha>-d2` y conservando el inode. Nunca subir una copia del repo encima de esos archivos.
9. **Deploy de la app:** `git archive HEAD` → `rsync --delete` a `/opt/cotizapro` → `docker compose build cotizapro-web && docker compose up -d --no-deps cotizapro-web` (con `setsid nohup`), como indica el inventario.
10. **Script y línea de cron:** leer primero `/opt/bin/cotizapro-reminders.sh` y seguir su forma. Crear `/opt/bin/cotizapro-billing-notices.sh` (permisos 700):

```sh
#!/bin/sh
set -eu
CRON_SECRET=$(grep '^CRON_SECRET=' /opt/cotizapro-deploy/.env | cut -d= -f2-)
curl -fsS -m 120 -X POST -H "Authorization: Bearer ${CRON_SECRET}" https://cotizapro.mariobustos.io/api/cron/billing-notices
echo
```

   Respaldar `/etc/cron.d/cotizapro` con fecha, agregar esta línea y descomentar la de recordatorios (`0 15 * * * root /opt/bin/cotizapro-reminders.sh`), que desde la Task 12b ya no necesita service role. Activar los recordatorios requiere su propia aprobación del usuario:

```
0 14 * * * root /opt/bin/cotizapro-billing-notices.sh >> /var/log/cotizapro-billing-notices.log 2>&1
```

11. **Después:** smoke de todos los dominios (debe ser idéntico al del punto 1); `curl` al cron con secreto incorrecto (401); una corrida manual del script (JSON con `success: true`); con la cuenta del operador, abrir `/admin` y confirmar la lista. Si cualquier dominio de otro proyecto cambia, revertir de inmediato y avisar.
12. **Inventario:** agregar la entrada fechada al inventario del VPS (migración, respaldos, imagen de reversa, cron nuevo, superadmin dado de alta).

---

## Self-review

**1. Cobertura del spec (D2):**
- D2.3 trigger con `current_period_end` y columnas nuevas → Task 1 (`guard_org_billing_columns`). `platform_admins` sin políticas, `is_platform_admin()` SECURITY DEFINER con `search_path` fijo, solo `authenticated` → Task 1. Columnas `current_period_end`, `billing_provider`, `billing_reference` → Task 1. `plan_activations` sin acceso desde la app → Task 1. RPCs `admin_list_organizations`, `admin_activate_plan` (extiende desde el mayor de hoy y el fin actual, misma transacción), `admin_suspend_plan` → Task 1; historial por empresa (`admin_list_plan_activations`) → Task 1 y Task 11.
- D2.4 punto 1 (ligas por plan, WhatsApp con total de `monthlyCost()`, "Próximamente" sin variables) → Task 9. Punto 3 (`/admin` fuera del panel, 404, tabla con búsqueda, plan, estado y "vence en N días", formulario con plan, usuarios, meses y referencia, total calculado, historial, "Suspender" con confirmación) → Tasks 10 y 11. Punto 4 (banner desde 7 días, correo 7/3/1 y día del vencimiento con cron diario y Resend, bloqueo inmediato, `assertWritable` con 402, banner rojo fijo, `org_is_writable(org_id)` para RLS posterior, datos nunca se borran, Gratis no vence) → Tasks 2, 4, 5, 6, 8 y 12.
- D2.5 (`planLimits()` en `lib/plans/limits.ts`, `org_plan_limits(org_id)` en SQL, tabla visible en Facturación, `PLAN_LIMITS_ENFORCED=false`, revisión previa de cuentas que excederían) → Tasks 1, 3, 7, 9 y 14 (punto 3).
- D2.6 unit (`planLimits`, textos de bloqueo, monto, `daysUntilExpiry`, texto del banner por rango, `assertWritable`) → Tasks 3, 4, 5, 7 y 10. SQL (propietario no cambia `plan`, `forbidden` en `admin_*`, activación auditada, renovación desde el fin vigente) → Task 1. E2E (404, activar Taller y ver "Plan Taller · vence el …", 402 y banner rojo, renovar quita el bloqueo, banner amarillo a 3 días) → Task 13.
- Coherencia con producción: el contenedor web no recibe `SUPABASE_SERVICE_ROLE_KEY`; el cron de recordatorios (hoy con `createAdminClient()`) pasa al hash de `CRON_SECRET` en la Task 12b.
- Fuera de alcance confirmado: créditos de IA (043), webhook o API de Mercado Pago, CFDI y pago anual, D1 (041).

**2. Placeholders:** sin "TBD" ni "TODO". Las únicas referencias a datos que da el usuario son las ligas reales de Mercado Pago y el correo del operador en la Task 14, que son pasos de operación con aprobación.

**3. Consistencia de tipos:** `BillingState`, `PlanCheckoutOption`, `DueNotice`, `CheckoutEnv` y `BillingNoticeKind` se definen una sola vez en `lib/billing/types.ts` (Task 4) y se usan con los mismos nombres en las Tasks 8, 9, 11 y 12. `assertWritable(supabase)` y `requireWritableMember(allowed?)` (Task 5) se usan igual en las Tasks 6 y 13. `activationAmount(planId, users, months)` (Task 10) es la misma en la API y en el diálogo (Task 11). Los mensajes de error de las RPC (Task 1) coinciden con las llaves de `adminRpcError` (Task 10). Los `data-testid` de las Tasks 8, 9 y 11 son los que busca la E2E de la Task 13.

**4. Review Focus:** cada una de las cinco líneas tiene su prueba en la tarea dueña: (1) Task 1 y Task 4; (2) Task 1; (3) Task 2 y Task 12; (4) Task 10 y Task 13; (5) Task 12, Step 8.
