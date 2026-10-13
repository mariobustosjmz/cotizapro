# D1 · Cotización pública con "Aceptar" y anticipo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El cliente abre desde WhatsApp o correo una liga `/c/<token>` con la marca del negocio, ve la cotización y el anticipo, y la acepta o la rechaza; la cotización cambia de estado sola y el negocio lo ve en su tablero y en la campana.

**Architecture:** Una tabla `quote_shares` guarda solo el sha256 de un token aleatorio de 32 bytes por cotización (patrón de reseñas de la migración 034). El acceso anónimo pasa únicamente por funciones `SECURITY DEFINER` con `search_path` fijo: `get_public_quote` (solo lectura), `mark_public_quote_viewed` (la llama el navegador) y `respond_public_quote` (con límite por IP). La app Next.js agrega la página de servidor `/c/[token]`, tres rutas públicas (`pdf`, `view`, `respond`), la API privada de la liga, el cambio del envío por WhatsApp/correo, la sección "Anticipo" en Configuración → Empresa y la leyenda en el detalle de la cotización.

**Tech Stack:** pnpm/turbo · Next.js 16 App Router · React 19 · TypeScript estricto · Tailwind 4 · Zod 4 · Supabase (PostgreSQL 15, PostgREST, Realtime) · @react-pdf/renderer · Vitest 3 · Playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-cotizacion-publica-y-cobro-design.md` — solo la sección **D1** y las decisiones 1, 2 y 6 de la sección 5. D2 (migración 042) y la IA (migración 043) tienen planes aparte y no se tocan aquí.

## Global Constraints

- Migración **041**: `apps/web/supabase/migrations/041_public_quote_share.sql`. La 040 ya existe; no se modifica. 042 y 043 quedan para D2 e IA.
- UUIDs con `gen_random_uuid()` (nunca `uuid_generate_v4()`).
- Token: "32 bytes aleatorios; se valida su formato antes de consultar" → 64 caracteres hex `^[a-f0-9]{64}$`; en la base solo se guarda `sha256` (hex).
- Vencimiento de la liga: "vence en `valid_until + 30 días`, o en 60 días si no hay vigencia".
- `deposit_percent`: "entero de 0 a 100; **por omisión 50**". `deposit_instructions`: "texto de hasta 500 caracteres". `deposit_payment_url`: "**una liga por negocio**, http(s) … opcional. Se configura en Configuración → Empresa". `quotes.deposit_percent` opcional por cotización; "No hay liga por cotización".
- `quotes.accepted_by_name`: "texto opcional, hasta 120 caracteres".
- `get_public_quote` "**no** regresa correo ni teléfono del cliente, notas internas, costos ni lista de materiales".
- Respuesta: "solo cambia desde `sent` o `viewed`"; "es idempotente: si ya estaba aceptada, regresa el estado actual".
- Límites: "`defaultApiLimiter` en las rutas públicas, más un límite por IP en `respond_public_quote` con el mismo patrón de `submit_quote_request`".
- Página: "`noindex`, sin caché pública. La página deja de funcionar si la liga vence o se revoca".
- Textos exactos: botones "Aceptar cotización", "Tengo dudas", "No me interesa", "Pagar anticipo"; campo "Tu nombre"; tarjeta "Anticipo: $X (Y %)"; aviso "El pago lo recibe directamente {negocio}"; "Vencida: pide una actualización"; WhatsApp "Revísala y acéptala aquí: …"; correo "Ver y aceptar cotización"; detalle "Vista por el cliente el …" y "Aceptada desde la liga el …"; diálogo "Copiar" y "Revocar liga".
- Sin service role en la app. Sin políticas `anon` sobre tablas. `REVOKE … FROM PUBLIC, anon` y luego `GRANT` explícito (patrón 034/039/040).
- No tocar columnas de facturación de `organizations` (trigger `guard_org_billing_columns` de 040).
- Código: sin `any`, `select()` con columnas explícitas, `.limit()` en listas, inmutabilidad, funciones < 50 líneas, archivos nuevos < 400 líneas, sin emojis, sin `console.log` (usar `logger`), copy de UI en español de México con acentos correctos, Zod en toda entrada.
- UI (`docs/UI_FORM_STANDARDS.md`): nada de `<select>` nativo; requerido con " *"; sin "(opcional)" en etiquetas; Cancelar a la izquierda y el botón principal a la derecha, ambos `flex-1`, con gerundio al cargar ("Aceptando...").
- Commits: **nunca automáticos**. Se agrupan en 3 commits (regla del usuario: 2-3 commits lógicos) y cada uno se hace **solo después de que el usuario lo apruebe**; antes de cada commit se ejecuta la skill `verify`. Mensajes cortos en formato convencional, sin `Co-Authored-By` ni líneas de sesión.
- Ninguna tarea se da por terminada sin `tsc`, las pruebas de la tarea y, al final, `pnpm build`.

### Comandos de apoyo (se usan en varias tareas)

```bash
export REPO=/Users/mariobustosjmz/Desktop/claude/my-saas-app
export DB="postgresql://postgres:postgres@127.0.0.1:54332/postgres"
export APP=http://localhost:3100   # el dev server ya corre en 3100
# JWT del propietario demo de MEGAGLASS, para probar rutas con sesión:
# (requiere SEED_DEMO_PASSWORD en apps/web/.env.local; el valor local no se versiona)
export JWT=$(cd $REPO/apps/web && node -e "require('dotenv').config({path:'.env.local'});const {createClient}=require('@supabase/supabase-js');createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}}).auth.signInWithPassword({email:'direccion@megaglass.demo.cotizapro.mx',password:process.env.SEED_DEMO_PASSWORD}).then(r=>console.log(r.data.session.access_token))")
# Una cotización en borrador de MEGAGLASS:
export QUOTE=$(psql "$DB" -Atc "select id from quotes where organization_id='00000000-0000-0000-00c0-000000000001' and status='draft' order by created_at desc limit 1")
```

## Review Focus

1. **Vista previa de ligas (WhatsApp, Facebook, Telegram) que abren `/c/<token>` sin JavaScript** → no deben marcar la cotización como "Vista". Se marca solo con la llamada del navegador y se ignoran agentes de vista previa. Pruebas: Tarea 1 (`reading the link does not change status`) y Tarea 2 (`isLinkPreviewAgent`).
2. **El negocio abre su propia liga con su sesión iniciada** → ve "Vista previa", no marca "Vista" y no puede aceptar ni rechazar. Pruebas: Tarea 1 (`owner sees preview flag`, `owner view does not mark viewed`, `business cannot answer its own link`) y Tarea 14 (E2E de vista previa).
3. **Reenviar una cotización ya aceptada (o en instalación, completada o cobrada)** → no debe regresar a "Enviada". Reenviar una rechazada o vencida sí la reabre como "Enviada". Prueba: Tarea 9 (`statusAfterSend`).
4. **Reenviar una cotización cuya vigencia ya pasó** → la liga abre y muestra "Vencida: pide una actualización", no "Liga no disponible". Prueba: Tarea 1 (`resent expired quote link still opens and says expired`, `expired quote link lives at least 7 days`).
5. **`valid_until` es DATE y en México (UTC-6) se mostraría un día antes** si se formatea con la zona local. Prueba: Tarea 2 (`formatDateOnly` no recorre la fecha).

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `apps/web/supabase/migrations/041_public_quote_share.sql` | Crear | Tablas, columnas, RLS, grants, RPCs, `update_org_settings`, avisos y Realtime |
| `apps/web/supabase/tests/public_quote_security.sql` | Crear | Pruebas SQL con transacción y rollback |
| `apps/web/lib/deposit/amount.ts` (+ `.test.ts`) | Crear | `DEFAULT_DEPOSIT_PERCENT`, `depositAmount` |
| `apps/web/lib/deposit/override.ts` (+ `.test.ts`) | Crear | `parseDepositOverride` (campo de % por cotización) |
| `apps/web/lib/deposit/settings-form.ts` (+ `.test.ts`) | Crear | `depositSettingsFromForm` (Configuración) |
| `apps/web/lib/public-quote/token.ts` (+ `.test.ts`) | Crear | Formato del token y URL pública |
| `apps/web/lib/public-quote/format.ts` (+ `.test.ts`) | Crear | Fechas sin corrimiento de zona horaria |
| `apps/web/lib/public-quote/user-agent.ts` (+ `.test.ts`) | Crear | Detección de agentes de vista previa |
| `apps/web/lib/public-quote/types.ts` | Crear | Esquema Zod y tipos de la cotización pública |
| `apps/web/lib/public-quote/test-fixtures.ts` | Crear | Objeto de ejemplo para pruebas |
| `apps/web/lib/public-quote/state.ts` (+ `.test.ts`) | Crear | Estado de la página y texto del aviso |
| `apps/web/lib/public-quote/activity.ts` (+ `.test.ts`) | Crear | Leyendas del detalle ("Vista por el cliente…") |
| `apps/web/lib/public-quote/get-public-quote.ts` | Crear | Lectura por RPC + validación |
| `apps/web/lib/public-quote/pdf-input.ts` (+ `.test.ts`) | Crear | Adaptador de la cotización pública al PDF |
| `apps/web/lib/pdf/quote-pdf-types.ts` | Crear | `QuotePdfData`, `QuotePdfItem` |
| `apps/web/lib/pdf/QuotePDF.tsx`, `apps/web/lib/integrations/pdf.tsx` | Modificar | Aceptar `QuotePdfData` |
| `apps/web/lib/whatsapp/link.ts` (+ test) | Modificar | `shareUrl` en el mensaje y `quoteQuestionMessage` |
| `apps/web/lib/email/quote-email.ts` (+ test) | Modificar | Botón "Ver y aceptar cotización" |
| `apps/web/lib/quotes/share-link.ts` | Crear | `createQuoteShareLink` (RPC + URL) |
| `apps/web/lib/quotes/send-status.ts` (+ `.test.ts`) | Crear | `statusAfterSend` |
| `apps/web/lib/validations/public-quote.ts` (+ `.test.ts`) | Crear | `respondPublicQuoteSchema` |
| `apps/web/lib/validations/settings.ts` (+ `settings.test.ts`) | Modificar / Crear test | Campos de anticipo |
| `apps/web/lib/validations/cotizapro.ts` (+ `quote-deposit.test.ts`) | Modificar / Crear test | `deposit_percent` en `updateQuoteSchema` |
| `apps/web/lib/notifications/types.ts`, `quote-notification-item.ts` (+ test) | Crear | Avisos de la campana |
| `apps/web/app/api/quotes/[id]/share/route.ts` | Crear | GET/POST/DELETE de la liga |
| `apps/web/app/api/quotes/[id]/send/route.ts` | Modificar | Liga en lugar del bucket `documents` |
| `apps/web/app/api/public/quotes/[token]/pdf/route.ts` | Crear | PDF público |
| `apps/web/app/api/public/quotes/[token]/view/route.ts` | Crear | Marca "Vista" desde el navegador |
| `apps/web/app/api/public/quotes/[token]/respond/route.ts` | Crear | Aceptar / rechazar |
| `apps/web/app/c/[token]/page.tsx` | Crear | Página pública |
| `apps/web/components/public-quote/*.tsx` | Crear | Encabezado, partidas, anticipo, aviso, acciones, paneles, extras, beacon |
| `apps/web/hooks/use-quote-response.ts`, `use-quote-share-link.ts` | Crear | Estado de cliente |
| `apps/web/components/dashboard/quote-share-link-panel.tsx` | Crear | Panel "Copiar / Revocar liga" |
| `apps/web/components/dashboard/quote-share-dialog.tsx` | Modificar | Usa el panel y el nuevo copy |
| `apps/web/components/settings/deposit-settings.tsx` | Crear | Sección "Anticipo" |
| `apps/web/app/(dashboard)/dashboard/settings/page.tsx` | Modificar | Inserta la sección y envía los campos |
| `apps/web/app/api/settings/organization/route.ts` | Modificar | Valida y guarda el anticipo |
| `apps/web/components/quotes/client-response-card.tsx` | Crear | Leyendas + % de anticipo por cotización |
| `apps/web/app/(dashboard)/dashboard/quotes/[id]/page.tsx` | Modificar | Inserta la tarjeta; acciones manuales también en "Vista" |
| `apps/web/app/api/notifications/route.ts`, `app/api/quotes/[id]/notifications/route.ts`, `types/database.types.ts` | Modificar | Avisos de respuesta del cliente |
| `packages/auth/src/public-routes.ts`, `apps/web/lib/auth/public-routes.test.ts` | Modificar | `/c` pública |
| `apps/web/e2e/specs/25-public-quote.spec.ts` | Crear | Flujo completo |

---

### Task 1: Migración 041 y pruebas de seguridad SQL

**Files:**
- Create: `apps/web/supabase/tests/public_quote_security.sql`
- Create: `apps/web/supabase/migrations/041_public_quote_share.sql`

**Interfaces:**
- Consumes: `public.user_organization_id()`, `public.user_has_role(TEXT[])`, `public.short_client_name(TEXT)` (034), `update_org_settings` (039), `extensions.digest`, `extensions.gen_random_bytes`.
- Produces:
  - `public.create_quote_share(p_quote_id UUID) RETURNS TEXT` — token hex de 64; errores `quote_not_found`, `forbidden`. Solo `authenticated`.
  - `public.get_public_quote(p_token TEXT) RETURNS JSONB` (STABLE, `anon`/`authenticated`) con la forma:
    `{ business: { name, brand_color, logo_url, phone }, client_first_name, quote_number, issued_on (YYYY-MM-DD), valid_until (YYYY-MM-DD), status, is_expired, accepted_at, rejected_at, accepted_by_name, subtotal, discount_rate, discount_amount, tax_rate, tax_amount, total, terms, items: [{ description, quantity, unit_type, unit_price, subtotal }], deposit: { percent, instructions, payment_url }, is_owner_preview }` o `NULL`.
  - `public.mark_public_quote_viewed(p_token TEXT) RETURNS BOOLEAN` (`anon`/`authenticated`).
  - `public.respond_public_quote(p_token TEXT, p_action TEXT, p_reason TEXT, p_name TEXT, p_ip_hash TEXT) RETURNS JSONB` → `{ status, changed }`; errores `invalid_action`, `invalid_token`, `owner_preview`, `rate_limited`, `quote_expired`.
  - `update_org_settings` acepta `deposit_percent`, `deposit_instructions`, `deposit_payment_url`; errores `invalid_deposit_percent`, `invalid_deposit_instructions`, `invalid_deposit_payment_url`.
  - Columnas `quotes.deposit_percent SMALLINT NULL`, `quotes.accepted_by_name TEXT NULL`.
  - `quote_notifications.notification_type` admite `client_accepted` y `client_rejected`; la tabla entra a la publicación `supabase_realtime`.

- [ ] **Step 1: Escribir las pruebas SQL (fallan sin la migración)**

Crear `apps/web/supabase/tests/public_quote_security.sql`:

```sql
-- Pruebas de seguridad de la migración 041 (cotización pública). Requiere el seed demo:
--   psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" -v ON_ERROR_STOP=1 -f apps/web/supabase/tests/public_quote_security.sql
-- Todo corre dentro de una transacción que se revierte. Termina con error si alguna prueba falla.
BEGIN;

CREATE TEMP TABLE _results (name TEXT, ok BOOLEAN, detail TEXT);
CREATE TEMP TABLE _tok (label TEXT PRIMARY KEY, token TEXT);
GRANT ALL ON _results, _tok TO anon, authenticated;

CREATE TEMP TABLE _fx AS
SELECT
  (SELECT id FROM auth.users WHERE email = 'direccion@megaglass.demo.cotizapro.mx') AS owner_id,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND status = 'sent' ORDER BY created_at, id LIMIT 1) AS q_sent,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND status = 'sent' ORDER BY created_at, id OFFSET 1 LIMIT 1) AS q_reject,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND status = 'sent' ORDER BY created_at, id OFFSET 2 LIMIT 1) AS q_expired,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND status = 'draft' ORDER BY created_at, id LIMIT 1) AS q_draft,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000001' AND status = 'cobrado' ORDER BY created_at, id LIMIT 1) AS q_paid,
  (SELECT id FROM quotes WHERE organization_id = '00000000-0000-0000-00c0-000000000003' ORDER BY created_at, id LIMIT 1) AS q_other_org;
ALTER TABLE _fx ADD COLUMN client_email TEXT;
UPDATE _fx SET client_email = (SELECT c.email FROM clients c JOIN quotes q ON q.client_id = c.id WHERE q.id = _fx.q_sent);
GRANT SELECT ON _fx TO anon, authenticated;

-- Fixtures como postgres: vigencias futuras salvo la vencida; sin anticipo configurado.
UPDATE quotes SET valid_until = current_date + 15
WHERE id IN (SELECT q_sent FROM _fx UNION ALL SELECT q_reject FROM _fx UNION ALL SELECT q_draft FROM _fx UNION ALL SELECT q_paid FROM _fx);
UPDATE quotes SET valid_until = current_date - 3 WHERE id = (SELECT q_expired FROM _fx);
UPDATE quotes SET deposit_percent = NULL WHERE organization_id = '00000000-0000-0000-00c0-000000000001';
UPDATE organizations SET settings = COALESCE(settings, '{}'::jsonb) - 'deposit_percent' - 'deposit_instructions' - 'deposit_payment_url'
WHERE id = '00000000-0000-0000-00c0-000000000001';

-- ---------------- A. propietario de MEGAGLASS ----------------
SELECT set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_first TEXT; v_second TEXT; v_err TEXT := '';
BEGIN
  v_first := create_quote_share((SELECT q_sent FROM _fx));
  v_second := create_quote_share((SELECT q_sent FROM _fx));
  INSERT INTO _tok VALUES ('revoked', v_first), ('sent', v_second);
  INSERT INTO _tok VALUES ('reject', create_quote_share((SELECT q_reject FROM _fx)));
  INSERT INTO _tok VALUES ('expired', create_quote_share((SELECT q_expired FROM _fx)));
  INSERT INTO _tok VALUES ('draft', create_quote_share((SELECT q_draft FROM _fx)));
  INSERT INTO _tok VALUES ('paid', create_quote_share((SELECT q_paid FROM _fx)));
  INSERT INTO _results VALUES ('token is 64 hex chars', v_second ~ '^[a-f0-9]{64}$', length(v_second)::text);
  INSERT INTO _results VALUES ('a new link revokes the previous one',
    (SELECT count(*) FROM quote_shares WHERE quote_id = (SELECT q_sent FROM _fx) AND revoked_at IS NULL) = 1, NULL);
  BEGIN PERFORM create_quote_share((SELECT q_other_org FROM _fx)); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('cannot share another org quote', v_err = 'quote_not_found', v_err);
END $$;

INSERT INTO _results SELECT 'owner sees preview flag', (get_public_quote(token)->>'is_owner_preview')::boolean, NULL FROM _tok WHERE label = 'sent';
INSERT INTO _results SELECT 'owner view does not mark viewed', NOT mark_public_quote_viewed(token), NULL FROM _tok WHERE label = 'sent';

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM respond_public_quote((SELECT token FROM _tok WHERE label = 'sent'), 'accept', NULL, NULL, 'ip-owner');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('business cannot answer its own link', v_err = 'owner_preview', v_err);
  v_err := '';
  BEGIN UPDATE quote_shares SET token_hash = repeat('0', 64) WHERE quote_id = (SELECT q_draft FROM _fx);
  EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('members cannot rewrite token_hash', v_err = '42501', v_err);
END $$;

-- ---------------- B. anónimo (el cliente) ----------------
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM count(*) FROM quote_shares; EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot read quote_shares', v_err = '42501', v_err);
  v_err := '';
  BEGIN PERFORM count(*) FROM quote_share_events; EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot read quote_share_events', v_err = '42501', v_err);
  v_err := '';
  BEGIN PERFORM create_quote_share((SELECT q_sent FROM _fx)); EXCEPTION WHEN OTHERS THEN v_err := SQLSTATE; END;
  INSERT INTO _results VALUES ('anon cannot create links', v_err = '42501', v_err);
END $$;

INSERT INTO _results SELECT 'revoked link returns null', get_public_quote(token) IS NULL, NULL FROM _tok WHERE label = 'revoked';
INSERT INTO _results SELECT 'malformed token returns null', get_public_quote('abc') IS NULL AND get_public_quote(NULL) IS NULL, NULL;
INSERT INTO _results SELECT 'unknown token returns null', get_public_quote(repeat('a', 64)) IS NULL, NULL;

INSERT INTO _results
SELECT 'public quote has business, items and the 50 % default deposit',
  q->'business'->>'name' = 'MEGAGLASS Demo' AND jsonb_array_length(q->'items') > 0
    AND (q->'deposit'->>'percent')::int = 50 AND NOT (q->>'is_owner_preview')::boolean,
  left(q::text, 160)
FROM (SELECT get_public_quote(token) AS q FROM _tok WHERE label = 'sent') s;

INSERT INTO _results
SELECT 'public quote exposes no client contact, notes or costs',
  position(COALESCE(f.client_email, '@@sin-correo@@') IN q::text) = 0
    AND NOT q ? 'notes' AND position('breakdown' IN q::text) = 0 AND position('pricing_snapshot' IN q::text) = 0,
  NULL
FROM (SELECT get_public_quote(token) AS q FROM _tok WHERE label = 'sent') s, _fx f;

INSERT INTO _results SELECT 'reading the link does not change status', get_public_quote(token)->>'status' = 'sent', NULL FROM _tok WHERE label = 'sent';

DO $$
BEGIN
  PERFORM mark_public_quote_viewed((SELECT token FROM _tok WHERE label = 'sent'));
END $$;
INSERT INTO _results SELECT 'client view marks viewed', get_public_quote(token)->>'status' = 'viewed', NULL FROM _tok WHERE label = 'sent';

DO $$
DECLARE v_tok TEXT := (SELECT token FROM _tok WHERE label = 'sent'); v_first JSONB; v_second JSONB; v_quote JSONB;
BEGIN
  v_first := respond_public_quote(v_tok, 'accept', NULL, '  Laura Pérez  ', 'ip-a');
  v_second := respond_public_quote(v_tok, 'accept', NULL, 'Otra Persona', 'ip-a');
  v_quote := get_public_quote(v_tok);
  INSERT INTO _results VALUES ('accept changes status once', v_first->>'status' = 'accepted' AND (v_first->>'changed')::boolean, v_first::text);
  INSERT INTO _results VALUES ('second accept is idempotent', v_second->>'status' = 'accepted' AND NOT (v_second->>'changed')::boolean, v_second::text);
  INSERT INTO _results VALUES ('accept stores trimmed name and accepted_at',
    v_quote->>'accepted_by_name' = 'Laura Pérez' AND v_quote->>'accepted_at' IS NOT NULL, v_quote->>'accepted_by_name');
END $$;

DO $$
DECLARE v JSONB;
BEGIN
  v := respond_public_quote((SELECT token FROM _tok WHERE label = 'draft'), 'accept', NULL, NULL, 'ip-b');
  INSERT INTO _results VALUES ('cannot accept a draft', v->>'status' = 'draft' AND NOT (v->>'changed')::boolean, v::text);
  v := respond_public_quote((SELECT token FROM _tok WHERE label = 'paid'), 'accept', NULL, NULL, 'ip-b');
  INSERT INTO _results VALUES ('cannot accept a paid quote', v->>'status' = 'cobrado' AND NOT (v->>'changed')::boolean, v::text);
END $$;

DO $$
DECLARE v JSONB; v_err TEXT := '';
BEGIN
  v := get_public_quote((SELECT token FROM _tok WHERE label = 'expired'));
  INSERT INTO _results VALUES ('resent expired quote link still opens and says expired', v IS NOT NULL AND (v->>'is_expired')::boolean, NULL);
  BEGIN PERFORM respond_public_quote((SELECT token FROM _tok WHERE label = 'expired'), 'accept', NULL, NULL, 'ip-b');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('cannot accept an expired quote', v_err = 'quote_expired', v_err);
END $$;

DO $$
DECLARE v JSONB; v_tok TEXT := (SELECT token FROM _tok WHERE label = 'reject');
BEGIN
  v := respond_public_quote(v_tok, 'reject', '  Muy caro  ', NULL, 'ip-c');
  INSERT INTO _results VALUES ('reject stores status', v->>'status' = 'rejected' AND (v->>'changed')::boolean, v::text);
  INSERT INTO _results VALUES ('reject writes rejected_at', get_public_quote(v_tok)->>'rejected_at' IS NOT NULL, NULL);
END $$;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM respond_public_quote((SELECT token FROM _tok WHERE label = 'paid'), 'delete', NULL, NULL, 'ip-d');
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('unknown action rejected', v_err = 'invalid_action', v_err);
END $$;

DO $$
DECLARE i INT; v_err TEXT := '';
BEGIN
  FOR i IN 1..21 LOOP
    BEGIN PERFORM respond_public_quote((SELECT token FROM _tok WHERE label = 'paid'), 'accept', NULL, NULL, 'ip-flood');
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  END LOOP;
  INSERT INTO _results VALUES ('21st response in an hour from one IP is rate limited', v_err = 'rate_limited', v_err);
END $$;

-- ---------------- C. propietario de nuevo ----------------
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true) FROM _fx;
SET LOCAL ROLE authenticated;

INSERT INTO _results SELECT 'business gets one client_accepted notice', count(*) = 1, count(*)::text
FROM quote_notifications WHERE quote_id = (SELECT q_sent FROM _fx) AND notification_type = 'client_accepted';
INSERT INTO _results SELECT 'rejection reason stored trimmed', rejection_reason = 'Muy caro', rejection_reason
FROM quotes WHERE id = (SELECT q_reject FROM _fx);
INSERT INTO _results SELECT 'viewed_at and accepted_at written', viewed_at IS NOT NULL AND accepted_at IS NOT NULL, NULL
FROM quotes WHERE id = (SELECT q_sent FROM _fx);

UPDATE quote_shares SET revoked_at = now() WHERE quote_id = (SELECT q_draft FROM _fx) AND revoked_at IS NULL;
INSERT INTO _results SELECT 'member can revoke a link', get_public_quote(token) IS NULL, NULL FROM _tok WHERE label = 'draft';

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN UPDATE quote_shares SET revoked_at = NULL WHERE quote_id = (SELECT q_sent FROM _fx) AND revoked_at IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('a revoked link cannot be reactivated', v_err LIKE '%row-level security%', v_err);
END $$;

DO $$
DECLARE v_err TEXT := '';
BEGIN
  BEGIN PERFORM update_org_settings(NULL, '{"deposit_percent": 150}'::jsonb); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('deposit percent above 100 rejected', v_err = 'invalid_deposit_percent', v_err);
  v_err := '';
  BEGIN PERFORM update_org_settings(NULL, '{"deposit_percent": 33.5}'::jsonb); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('decimal deposit percent rejected', v_err = 'invalid_deposit_percent', v_err);
  v_err := '';
  BEGIN PERFORM update_org_settings(NULL, '{"deposit_payment_url": "javascript:alert(1)"}'::jsonb); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('non-http payment url rejected', v_err = 'invalid_deposit_payment_url', v_err);
  v_err := '';
  BEGIN PERFORM update_org_settings(NULL, jsonb_build_object('deposit_instructions', repeat('x', 501))); EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO _results VALUES ('instructions over 500 chars rejected', v_err = 'invalid_deposit_instructions', v_err);
  PERFORM update_org_settings(NULL, '{"deposit_percent": 30, "deposit_payment_url": "https://mpago.la/abc", "deposit_instructions": "CLABE 012"}'::jsonb);
END $$;

INSERT INTO _results
SELECT 'valid deposit settings reach the public quote',
  (q->'deposit'->>'percent')::int = 30 AND q->'deposit'->>'payment_url' = 'https://mpago.la/abc' AND q->'deposit'->>'instructions' = 'CLABE 012',
  (q->'deposit')::text
FROM (SELECT get_public_quote(token) AS q FROM _tok WHERE label = 'reject') s;

UPDATE quotes SET deposit_percent = 0 WHERE id = (SELECT q_reject FROM _fx);
INSERT INTO _results SELECT 'per-quote deposit percent wins', (get_public_quote(token)->'deposit'->>'percent')::int = 0, NULL
FROM _tok WHERE label = 'reject';

-- ---------------- D. como postgres ----------------
RESET ROLE;
INSERT INTO _results SELECT 'link expires 30 days after valid_until', expires_at::date = current_date + 45, expires_at::text
FROM quote_shares WHERE quote_id = (SELECT q_reject FROM _fx) AND revoked_at IS NULL;
INSERT INTO _results SELECT 'expired quote link lives at least 7 days', expires_at > now() + INTERVAL '6 days', expires_at::text
FROM quote_shares WHERE quote_id = (SELECT q_expired FROM _fx) AND revoked_at IS NULL;
UPDATE quote_shares SET expires_at = now() - INTERVAL '1 second' WHERE quote_id = (SELECT q_paid FROM _fx) AND revoked_at IS NULL;
INSERT INTO _results SELECT 'expired link returns null', get_public_quote(token) IS NULL, NULL FROM _tok WHERE label = 'paid';

SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, detail FROM _results ORDER BY ok NULLS FIRST, name;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE ok IS NOT TRUE) AS failed FROM _results;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM _results WHERE ok IS NOT TRUE) THEN RAISE EXCEPTION 'public quote security tests failed'; END IF;
END $$;
ROLLBACK;
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `cd $REPO && psql "$DB" -v ON_ERROR_STOP=1 -f apps/web/supabase/tests/public_quote_security.sql`
Expected: FAIL con `ERROR:  column "deposit_percent" of relation "quotes" does not exist`.

- [ ] **Step 3: Escribir la migración 041**

Crear `apps/web/supabase/migrations/041_public_quote_share.sql`:

```sql
-- ================================================
-- Migration: 041_public_quote_share.sql
-- D1 (docs/superpowers/specs/2026-10-13-cotizacion-publica-y-cobro-design.md): cotización pública con
-- "Aceptar" y anticipo.
-- 1. quote_shares: una liga activa por cotización; se guarda solo el sha256 del token de 32 bytes.
-- 2. quote_share_events: respuestas por hash de IP para limitar abuso (patrón de submit_quote_request).
-- 3. quotes.deposit_percent (ajuste por cotización) y quotes.accepted_by_name.
-- 4. organizations.settings: deposit_percent (0-100, por omisión 50), deposit_instructions (<= 500) y
--    deposit_payment_url (http/https). update_org_settings las acepta y las valida.
-- 5. RPCs: create_quote_share (miembros), get_public_quote (solo lectura), mark_public_quote_viewed y
--    respond_public_quote (anon). La vista se marca desde el navegador y no al leer: los generadores de
--    vista previa de WhatsApp y redes abren la liga sin ejecutar JavaScript.
-- 6. quote_notifications admite client_accepted / client_rejected y se publica en Realtime para la campana.
-- ================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------
-- Columnas nuevas en quotes
-- ------------------------------------------------------------
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_percent SMALLINT
  CONSTRAINT quotes_deposit_percent_check CHECK (deposit_percent BETWEEN 0 AND 100);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS accepted_by_name TEXT
  CONSTRAINT quotes_accepted_by_name_check CHECK (char_length(accepted_by_name) <= 120);

-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_shares_quote ON quote_shares(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_shares_org ON quote_shares(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_shares_active ON quote_shares(quote_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS quote_share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  share_id UUID NOT NULL REFERENCES quote_shares(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('accept', 'reject')),
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_share_events_ip ON quote_share_events(ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_share_events_share ON quote_share_events(share_id);

-- ------------------------------------------------------------
-- RLS y privilegios: miembros ven y revocan; nadie inserta directo; anon no toca las tablas.
-- ------------------------------------------------------------
ALTER TABLE quote_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_share_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON quote_shares FROM anon, authenticated;
REVOKE ALL ON quote_share_events FROM anon, authenticated;
GRANT SELECT (id, quote_id, organization_id, expires_at, revoked_at, first_viewed_at, created_by, created_at)
  ON quote_shares TO authenticated;
GRANT UPDATE (revoked_at) ON quote_shares TO authenticated;

DROP POLICY IF EXISTS "Members view quote shares" ON quote_shares;
CREATE POLICY "Members view quote shares" ON quote_shares FOR SELECT TO authenticated
  USING (organization_id = public.user_organization_id());
DROP POLICY IF EXISTS "Workers revoke quote shares" ON quote_shares;
CREATE POLICY "Workers revoke quote shares" ON quote_shares FOR UPDATE TO authenticated
  USING (organization_id = public.user_organization_id() AND public.user_has_role(ARRAY['owner','admin','member']))
  WITH CHECK (organization_id = public.user_organization_id() AND revoked_at IS NOT NULL);

-- ------------------------------------------------------------
-- quote_notifications: avisos de respuesta del cliente (recipient = quien respondió)
-- ------------------------------------------------------------
ALTER TABLE quote_notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE quote_notifications ADD CONSTRAINT valid_notification_type
  CHECK (notification_type IN ('email', 'whatsapp', 'client_accepted', 'client_rejected'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quote_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quote_notifications;
  END IF;
END $$;

-- ------------------------------------------------------------
-- Funciones internas (sin EXECUTE para anon ni authenticated)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deposit_settings_error(p_settings JSONB)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v_pct JSONB := p_settings->'deposit_percent';
  v_text JSONB := p_settings->'deposit_instructions';
  v_url JSONB := p_settings->'deposit_payment_url';
BEGIN
  IF v_pct IS NOT NULL AND jsonb_typeof(v_pct) <> 'null'
     AND NOT (jsonb_typeof(v_pct) = 'number' AND v_pct::text ~ '^[0-9]{1,3}$' AND v_pct::text::int <= 100) THEN
    RETURN 'invalid_deposit_percent';
  END IF;
  IF v_text IS NOT NULL AND jsonb_typeof(v_text) <> 'null'
     AND NOT (jsonb_typeof(v_text) = 'string' AND char_length(v_text #>> '{}') <= 500) THEN
    RETURN 'invalid_deposit_instructions';
  END IF;
  IF v_url IS NOT NULL AND jsonb_typeof(v_url) <> 'null'
     AND NOT (jsonb_typeof(v_url) = 'string' AND char_length(v_url #>> '{}') <= 500
              AND (v_url #>> '{}') ~ '^https?://[^[:space:]"<>]+$') THEN
    RETURN 'invalid_deposit_payment_url';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.org_deposit_percent(p_settings JSONB)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_settings->'deposit_percent') = 'number'
     AND (p_settings->>'deposit_percent') ~ '^[0-9]{1,3}$'
     AND (p_settings->>'deposit_percent')::int <= 100
    THEN (p_settings->>'deposit_percent')::int
    ELSE 50
  END;
$$;

CREATE OR REPLACE FUNCTION public.public_quote_deposit(p_quote_percent SMALLINT, p_settings JSONB)
RETURNS JSONB
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'percent', COALESCE(p_quote_percent::int, public.org_deposit_percent(p_settings)),
    'instructions', CASE WHEN jsonb_typeof(p_settings->'deposit_instructions') = 'string'
      THEN NULLIF(left(btrim(p_settings->>'deposit_instructions'), 500), '') END,
    'payment_url', CASE WHEN jsonb_typeof(p_settings->'deposit_payment_url') = 'string'
      AND length(p_settings->>'deposit_payment_url') <= 500
      AND p_settings->>'deposit_payment_url' ~ '^https?://[^[:space:]"<>]+$'
      THEN p_settings->>'deposit_payment_url' END
  );
$$;

CREATE OR REPLACE FUNCTION public.quote_share_hash(p_token TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.active_quote_share(p_token TEXT)
RETURNS quote_shares
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  SELECT * FROM quote_shares
  WHERE p_token ~ '^[a-f0-9]{64}$'
    AND token_hash = public.quote_share_hash(p_token)
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.public_quote_business(p_org_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'name', o.name,
    'brand_color', CASE WHEN o.settings->>'brand_color' ~ '^#[0-9A-Fa-f]{6}$' THEN o.settings->>'brand_color' END,
    'logo_url', CASE WHEN length(o.settings->>'logo_url') <= 500
      AND o.settings->>'logo_url' ~ '^https?://[^[:space:]"<>]+$' THEN o.settings->>'logo_url' END,
    'phone', NULLIF(COALESCE(pp.whatsapp_phone, regexp_replace(COALESCE(o.settings->>'company_phone', ''), '[^0-9]', '', 'g')), '')
  )
  FROM organizations o
  LEFT JOIN public_profiles pp ON pp.organization_id = o.id
  WHERE o.id = p_org_id;
$$;

CREATE OR REPLACE FUNCTION public.public_quote_items(p_quote_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'description', i.description, 'quantity', i.quantity, 'unit_type', i.unit_type,
    'unit_price', i.unit_price, 'subtotal', i.subtotal
  ) ORDER BY i.sort_order, i.created_at), '[]'::jsonb)
  FROM (
    SELECT description, quantity, unit_type, unit_price, subtotal, sort_order, created_at
    FROM quote_items WHERE quote_id = p_quote_id ORDER BY sort_order, created_at LIMIT 100
  ) i;
$$;

CREATE OR REPLACE FUNCTION public.quote_is_past_validity(p_valid_until DATE)
RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT p_valid_until < (now() AT TIME ZONE 'America/Mexico_City')::date;
$$;

-- ------------------------------------------------------------
-- Configuración: update_org_settings acepta y valida el anticipo (resto igual que 039)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_org_settings(p_name TEXT, p_settings JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller profiles%ROWTYPE;
  v_allowed CONSTANT TEXT[] := ARRAY['company_address', 'company_phone', 'company_email', 'quote_terms',
    'quote_valid_days', 'tax_rate', 'logo_url', 'brand_color', 'checklist_dismissed_at',
    'deposit_percent', 'deposit_instructions', 'deposit_payment_url'];
  v_patch JSONB;
  v_error TEXT;
  v_org organizations%ROWTYPE;
BEGIN
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_caller.role NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_name IS NOT NULL AND length(btrim(p_name)) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'invalid_name'; END IF;

  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb) INTO v_patch
  FROM jsonb_each(COALESCE(p_settings, '{}'::jsonb)) WHERE key = ANY(v_allowed);

  v_error := public.deposit_settings_error(v_patch);
  IF v_error IS NOT NULL THEN RAISE EXCEPTION '%', v_error USING ERRCODE = '22023'; END IF;

  UPDATE organizations
  SET name = COALESCE(btrim(p_name), name),
      settings = COALESCE(settings, '{}'::jsonb) || v_patch,
      updated_at = now()
  WHERE id = v_caller.organization_id
  RETURNING * INTO v_org;

  RETURN jsonb_build_object('id', v_org.id, 'name', v_org.name, 'slug', v_org.slug, 'settings', v_org.settings);
END;
$$;

-- ------------------------------------------------------------
-- RPCs
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_quote_share(p_quote_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_quote quotes%ROWTYPE;
  v_token TEXT := encode(extensions.gen_random_bytes(32), 'hex');
BEGIN
  SELECT * INTO v_quote FROM quotes
  WHERE id = p_quote_id AND organization_id = public.user_organization_id()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'quote_not_found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.user_has_role(ARRAY['owner','admin','member']) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  UPDATE quote_shares SET revoked_at = now() WHERE quote_id = p_quote_id AND revoked_at IS NULL;
  -- Mínimo 7 días: reenviar una cotización vencida debe abrir la página con el aviso "Vencida".
  INSERT INTO quote_shares (quote_id, organization_id, token_hash, expires_at, created_by)
  VALUES (
    v_quote.id, v_quote.organization_id, public.quote_share_hash(v_token),
    GREATEST(COALESCE((v_quote.valid_until + 30)::timestamptz, now() + INTERVAL '60 days'), now() + INTERVAL '7 days'),
    auth.uid()
  );
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_quote(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_share quote_shares%ROWTYPE := public.active_quote_share(p_token);
  v_quote quotes%ROWTYPE;
  v_settings JSONB;
BEGIN
  IF v_share.id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_quote FROM quotes WHERE id = v_share.quote_id;
  SELECT COALESCE(settings, '{}'::jsonb) INTO v_settings FROM organizations WHERE id = v_share.organization_id;

  RETURN jsonb_build_object(
    'business', public.public_quote_business(v_share.organization_id),
    'client_first_name', (SELECT NULLIF(split_part(btrim(name), ' ', 1), '') FROM clients WHERE id = v_quote.client_id),
    'quote_number', v_quote.quote_number,
    'issued_on', (v_quote.created_at AT TIME ZONE 'America/Mexico_City')::date,
    'valid_until', v_quote.valid_until,
    'status', v_quote.status,
    'is_expired', public.quote_is_past_validity(v_quote.valid_until),
    'accepted_at', v_quote.accepted_at,
    'rejected_at', v_quote.rejected_at,
    'accepted_by_name', v_quote.accepted_by_name,
    'subtotal', v_quote.subtotal,
    'discount_rate', COALESCE(v_quote.discount_rate, 0),
    'discount_amount', COALESCE(v_quote.discount_amount, 0),
    'tax_rate', COALESCE(v_quote.tax_rate, 0),
    'tax_amount', v_quote.tax_amount,
    'total', v_quote.total,
    'terms', v_quote.terms_and_conditions,
    'items', public.public_quote_items(v_quote.id),
    'deposit', public.public_quote_deposit(v_quote.deposit_percent, v_settings),
    'is_owner_preview', public.user_organization_id() IS NOT DISTINCT FROM v_share.organization_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_public_quote_viewed(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_share quote_shares%ROWTYPE := public.active_quote_share(p_token);
BEGIN
  IF v_share.id IS NULL THEN RETURN false; END IF;
  IF public.user_organization_id() IS NOT DISTINCT FROM v_share.organization_id THEN RETURN false; END IF;

  UPDATE quote_shares SET first_viewed_at = now() WHERE id = v_share.id AND first_viewed_at IS NULL;
  UPDATE quotes
  SET viewed_at = COALESCE(viewed_at, now()),
      status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
  WHERE id = v_share.quote_id AND (viewed_at IS NULL OR status = 'sent');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_public_quote(
  p_token TEXT, p_action TEXT, p_reason TEXT DEFAULT NULL, p_name TEXT DEFAULT NULL, p_ip_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_share quote_shares%ROWTYPE := public.active_quote_share(p_token);
  v_quote quotes%ROWTYPE;
  v_name TEXT := NULLIF(left(btrim(COALESCE(p_name, '')), 120), '');
  v_accept BOOLEAN := p_action = 'accept';
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('accept', 'reject') THEN RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023'; END IF;
  IF v_share.id IS NULL THEN RAISE EXCEPTION 'invalid_token' USING ERRCODE = 'P0002'; END IF;
  IF public.user_organization_id() IS NOT DISTINCT FROM v_share.organization_id THEN
    RAISE EXCEPTION 'owner_preview' USING ERRCODE = '42501';
  END IF;
  IF p_ip_hash IS NOT NULL AND (
    SELECT count(*) FROM quote_share_events WHERE ip_hash = p_ip_hash AND created_at > now() - INTERVAL '1 hour'
  ) >= 20 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_quote FROM quotes WHERE id = v_share.quote_id FOR UPDATE;
  INSERT INTO quote_share_events (organization_id, share_id, action, ip_hash)
  VALUES (v_share.organization_id, v_share.id, p_action, p_ip_hash);

  IF v_quote.status NOT IN ('sent', 'viewed') THEN
    RETURN jsonb_build_object('status', v_quote.status, 'changed', false);
  END IF;
  IF public.quote_is_past_validity(v_quote.valid_until) THEN RAISE EXCEPTION 'quote_expired' USING ERRCODE = 'P0001'; END IF;

  UPDATE quotes SET
    status = CASE WHEN v_accept THEN 'accepted' ELSE 'rejected' END,
    viewed_at = COALESCE(viewed_at, now()),
    accepted_at = CASE WHEN v_accept THEN now() ELSE accepted_at END,
    accepted_by_name = CASE WHEN v_accept THEN v_name ELSE accepted_by_name END,
    rejected_at = CASE WHEN v_accept THEN rejected_at ELSE now() END,
    rejection_reason = CASE WHEN v_accept THEN rejection_reason ELSE NULLIF(left(btrim(COALESCE(p_reason, '')), 500), '') END
  WHERE id = v_quote.id
  RETURNING * INTO v_quote;

  UPDATE quote_shares SET first_viewed_at = COALESCE(first_viewed_at, now()) WHERE id = v_share.id;
  INSERT INTO quote_notifications (quote_id, notification_type, recipient, status)
  VALUES (
    v_quote.id,
    CASE WHEN v_accept THEN 'client_accepted' ELSE 'client_rejected' END,
    COALESCE(v_name, (SELECT public.short_client_name(name) FROM clients WHERE id = v_quote.client_id), 'Cliente'),
    'sent'
  );
  RETURN jsonb_build_object('status', v_quote.status, 'changed', true);
END;
$$;

-- ------------------------------------------------------------
-- Privilegios de funciones
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.deposit_settings_error(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.org_deposit_percent(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_quote_deposit(SMALLINT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quote_share_hash(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.active_quote_share(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_quote_business(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_quote_items(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quote_is_past_validity(DATE) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.update_org_settings(TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_quote_share(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_quote(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_public_quote_viewed(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_public_quote(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_org_settings(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_quote_share(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_quote(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_public_quote_viewed(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_public_quote(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
```

- [ ] **Step 4: Aplicar la migración en la base local**

Run:
```bash
cd $REPO && (echo "begin;"; cat apps/web/supabase/migrations/041_public_quote_share.sql; echo "insert into supabase_migrations.schema_migrations (version,name) values ('041','041_public_quote_share') on conflict do nothing; commit;") | psql "$DB" -v ON_ERROR_STOP=1
```
Expected: termina en `COMMIT` sin errores.

Verificar:
```bash
psql "$DB" -Atc "select version, name from supabase_migrations.schema_migrations where version = '041'"
psql "$DB" -Atc "select count(*) from quotes; select count(*) from quote_shares; select tablename from pg_publication_tables where pubname='supabase_realtime' and tablename='quote_notifications'"
```
Expected: `041|041_public_quote_share`; el conteo de `quotes` igual al de antes (el seed sigue completo); `0` ligas; `quote_notifications`.

- [ ] **Step 5: Correr las pruebas nuevas y las de la vitrina**

Run:
```bash
cd $REPO && psql "$DB" -v ON_ERROR_STOP=1 -f apps/web/supabase/tests/public_quote_security.sql
psql "$DB" -v ON_ERROR_STOP=1 -f apps/web/supabase/tests/showcase_security.sql
```
Expected: todas las filas `PASS`, `failed = 0`, salida sin `ERROR`. La de la vitrina (034) sigue en verde porque `update_org_settings` conserva su comportamiento.

- [ ] **Step 6: Commit A (solo con aprobación del usuario)**

Mostrar al usuario `git status` y `git diff --stat` de los dos archivos, ejecutar la skill `verify` y esperar un "sí" explícito. Solo entonces:

```bash
git add apps/web/supabase/migrations/041_public_quote_share.sql apps/web/supabase/tests/public_quote_security.sql
git commit -m "feat: liga pública de cotización en base de datos (041)"
```

---

### Task 2: Utilidades puras (anticipo, token, fechas, agentes de vista previa)

**Files:**
- Create: `apps/web/lib/deposit/amount.ts`, `apps/web/lib/deposit/amount.test.ts`
- Create: `apps/web/lib/deposit/override.ts`, `apps/web/lib/deposit/override.test.ts`
- Create: `apps/web/lib/public-quote/token.ts`, `apps/web/lib/public-quote/token.test.ts`
- Create: `apps/web/lib/public-quote/format.ts`, `apps/web/lib/public-quote/format.test.ts`
- Create: `apps/web/lib/public-quote/user-agent.ts`, `apps/web/lib/public-quote/user-agent.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `DEFAULT_DEPOSIT_PERCENT: 50`; `depositAmount(total: number | string, percent: number): number`
  - `type DepositOverrideResult = { ok: true; value: number | null } | { ok: false; error: string }`; `parseDepositOverride(raw: string): DepositOverrideResult`
  - `PUBLIC_QUOTE_TOKEN_PATTERN: RegExp`; `isPublicQuoteToken(value: unknown): value is string`; `publicQuoteUrl(token: string, fallbackOrigin?: string): string`
  - `BUSINESS_TIME_ZONE = 'America/Monterrey'`; `formatDateOnly(value: string): string`; `formatDateTime(value: string, timeZone?: string): string`
  - `isLinkPreviewAgent(userAgent: string | null): boolean`

- [ ] **Step 1: Escribir las pruebas que fallan**

`apps/web/lib/deposit/amount.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_DEPOSIT_PERCENT, depositAmount } from './amount'

describe('depositAmount', () => {
  it('usa 50 % por omisión', () => {
    expect(DEFAULT_DEPOSIT_PERCENT).toBe(50)
  })

  it.each([
    [12238.48, 50, 6119.24],
    [999.99, 33, 330],
    [100.01, 50, 50.01],
    ['1740.00', 50, 870],
    [1000, 100, 1000],
    [1500, 0, 0],
    [Number.NaN, 50, 0],
    [-200, 50, 0],
  ] as const)('total %s al %s %% → %s', (total, percent, expected) => {
    expect(depositAmount(total, percent)).toBe(expected)
  })

  it('no pasa del 100 %', () => {
    expect(depositAmount(500, 150)).toBe(500)
  })
})
```

`apps/web/lib/deposit/override.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { parseDepositOverride } from './override'

describe('parseDepositOverride', () => {
  it('vacío significa usar el porcentaje de la empresa', () => {
    expect(parseDepositOverride('  ')).toEqual({ ok: true, value: null })
  })

  it.each([['0', 0], ['30', 30], ['100', 100]] as const)('acepta %s', (raw, value) => {
    expect(parseDepositOverride(raw)).toEqual({ ok: true, value })
  })

  it.each(['101', '33.5', '-1', 'abc'])('rechaza %s', (raw) => {
    expect(parseDepositOverride(raw)).toEqual({ ok: false, error: 'Usa un número entero de 0 a 100' })
  })
})
```

`apps/web/lib/public-quote/token.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPublicQuoteToken, publicQuoteUrl } from './token'

const TOKEN = 'a'.repeat(64)

describe('isPublicQuoteToken', () => {
  it('acepta 64 caracteres hex en minúsculas', () => {
    expect(isPublicQuoteToken(TOKEN)).toBe(true)
  })

  it.each(['a'.repeat(63), 'A'.repeat(64), `${'a'.repeat(63)}g`, '', null, 42])('rechaza %s', (value) => {
    expect(isPublicQuoteToken(value)).toBe(false)
  })
})

describe('publicQuoteUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('usa NEXT_PUBLIC_APP_URL sin diagonal final', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.cotizapro.mx/')
    expect(publicQuoteUrl(TOKEN, 'http://localhost:3100')).toBe(`https://app.cotizapro.mx/c/${TOKEN}`)
  })

  it('sin variable usa el origen de la petición', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    expect(publicQuoteUrl(TOKEN, 'http://localhost:3100')).toBe(`http://localhost:3100/c/${TOKEN}`)
  })
})
```

`apps/web/lib/public-quote/format.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { formatDateOnly, formatDateTime } from './format'

describe('formatDateOnly', () => {
  it('no recorre la fecha por la zona horaria de México', () => {
    expect(formatDateOnly('2026-10-27')).toBe('27 de octubre de 2026')
  })

  it('regresa el texto original si no es fecha', () => {
    expect(formatDateOnly('mañana')).toBe('mañana')
  })
})

describe('formatDateTime', () => {
  it('muestra la hora de Monterrey en formato de 24 horas', () => {
    const text = formatDateTime('2026-10-14T15:05:00Z')
    expect(text).toContain('14 de octubre de 2026')
    expect(text).toContain('09:05')
  })
})
```

`apps/web/lib/public-quote/user-agent.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { isLinkPreviewAgent } from './user-agent'

describe('isLinkPreviewAgent', () => {
  it.each([
    'WhatsApp/2.23.20.0 A',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'TelegramBot (like TwitterBot)',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ])('detecta %s', (ua) => {
    expect(isLinkPreviewAgent(ua)).toBe(true)
  })

  it.each([
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  ])('no confunde un navegador real: %s', (ua) => {
    expect(isLinkPreviewAgent(ua)).toBe(false)
  })

  it('sin agente no es vista previa', () => {
    expect(isLinkPreviewAgent(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/deposit lib/public-quote`
Expected: FAIL, `Failed to resolve import "./amount"` (y equivalentes para cada archivo).

- [ ] **Step 3: Implementar**

`apps/web/lib/deposit/amount.ts`:
```ts
/** Porcentaje de anticipo cuando el negocio no configuró uno (spec D1, decisión 1). */
export const DEFAULT_DEPOSIT_PERCENT = 50

/** Anticipo en pesos redondeado a centavos. Se calcula en centavos para no arrastrar error de punto flotante. */
export function depositAmount(total: number | string, percent: number): number {
  const totalCents = Math.round(Number(total) * 100)
  if (!Number.isFinite(totalCents) || totalCents <= 0 || !(percent > 0)) return 0
  const boundedPercent = Math.min(percent, 100)
  return Math.round((totalCents * boundedPercent) / 100) / 100
}
```

`apps/web/lib/deposit/override.ts`:
```ts
export type DepositOverrideResult =
  | { readonly ok: true; readonly value: number | null }
  | { readonly ok: false; readonly error: string }

const INVALID: DepositOverrideResult = { ok: false, error: 'Usa un número entero de 0 a 100' }

/** Campo de anticipo de una cotización: vacío = usar el de la empresa (null). */
export function parseDepositOverride(raw: string): DepositOverrideResult {
  const text = raw.trim()
  if (text === '') return { ok: true, value: null }
  if (!/^\d{1,3}$/.test(text)) return INVALID
  const value = Number(text)
  return value <= 100 ? { ok: true, value } : INVALID
}
```

`apps/web/lib/public-quote/token.ts`:
```ts
/** 32 bytes aleatorios en hex (migración 041). Se valida antes de llamar a la base. */
export const PUBLIC_QUOTE_TOKEN_PATTERN = /^[a-f0-9]{64}$/

export function isPublicQuoteToken(value: unknown): value is string {
  return typeof value === 'string' && PUBLIC_QUOTE_TOKEN_PATTERN.test(value)
}

export function publicQuoteUrl(token: string, fallbackOrigin?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/c/${token}`
}
```

`apps/web/lib/public-quote/format.ts`:
```ts
export const BUSINESS_TIME_ZONE = 'America/Monterrey'

const DATE_ONLY = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function parse(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Para columnas DATE (YYYY-MM-DD): se formatea en UTC para que México no la muestre un día antes. */
export function formatDateOnly(value: string): string {
  const date = parse(value)
  return date ? DATE_ONLY.format(date) : value
}

export function formatDateTime(value: string, timeZone: string = BUSINESS_TIME_ZONE): string {
  const date = parse(value)
  if (!date) return value
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone,
  }).format(date)
}
```

`apps/web/lib/public-quote/user-agent.ts`:
```ts
/** Generadores de vista previa de ligas: abren la página pero no son el cliente. */
const PREVIEW_AGENT =
  /^WhatsApp\/|facebookexternalhit|facebookcatalog|TelegramBot|Twitterbot|Slackbot|Discordbot|LinkedInBot|SkypeUriPreview|Googlebot|bingbot|Applebot|Pinterestbot|redditbot|Embedly/i

export function isLinkPreviewAgent(userAgent: string | null): boolean {
  return userAgent !== null && PREVIEW_AGENT.test(userAgent)
}
```

- [ ] **Step 4: Correr y ver que pasan**

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/deposit lib/public-quote && pnpm exec tsc --noEmit -p .`
Expected: PASS en los 5 archivos; `tsc` sin errores.

- [ ] **Step 5: Punto de control (sin commit)**

Estos cambios entran en el **Commit B** (Tarea 9). No se hace commit aquí.

---

### Task 3: Modelo de la cotización pública (esquema, estado, aviso, leyendas, lectura)

**Files:**
- Create: `apps/web/lib/public-quote/types.ts`
- Create: `apps/web/lib/public-quote/test-fixtures.ts`
- Create: `apps/web/lib/public-quote/state.ts`, `apps/web/lib/public-quote/state.test.ts`
- Create: `apps/web/lib/public-quote/activity.ts`, `apps/web/lib/public-quote/activity.test.ts`
- Create: `apps/web/lib/public-quote/get-public-quote.ts`

**Interfaces:**
- Consumes: `formatDateTime` (Tarea 2), `isPublicQuoteToken` (Tarea 2), RPC `get_public_quote` (Tarea 1), `createServerClient`, `logger`.
- Produces:
  - `publicQuoteSchema` (Zod) y `type PublicQuote`, `type PublicQuoteItem`, `type PublicQuoteState = 'open' | 'accepted' | 'rejected' | 'expired' | 'closed'`, `type BannerTone = 'info' | 'success' | 'warning' | 'neutral'`, `interface StatusBanner { tone: BannerTone; text: string }`
  - `publicQuoteFixture: PublicQuote` (solo pruebas)
  - `publicQuoteState(quote: Pick<PublicQuote, 'status' | 'is_expired'>): PublicQuoteState`
  - `statusBanner(quote: BannerInput): StatusBanner | null`
  - `interface ClientActivity { viewed_at; accepted_at; rejected_at; rejection_reason; accepted_by_name }` (todos `string | null`); `clientActivityLines(activity: ClientActivity): readonly string[]`
  - `getPublicQuote(token: string): Promise<PublicQuote | null>`

- [ ] **Step 1: Tipos y fixture (necesarios para compilar las pruebas)**

`apps/web/lib/public-quote/types.ts`:
```ts
import { z } from 'zod'

export const publicQuoteItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_type: z.string(),
  unit_price: z.number(),
  subtotal: z.number(),
})

export const publicQuoteSchema = z.object({
  business: z.object({
    name: z.string(),
    brand_color: z.string().nullable(),
    logo_url: z.string().nullable(),
    phone: z.string().nullable(),
  }),
  client_first_name: z.string().nullable(),
  quote_number: z.string(),
  issued_on: z.string(),
  valid_until: z.string(),
  status: z.string(),
  is_expired: z.boolean(),
  accepted_at: z.string().nullable(),
  rejected_at: z.string().nullable(),
  accepted_by_name: z.string().nullable(),
  subtotal: z.number(),
  discount_rate: z.number(),
  discount_amount: z.number(),
  tax_rate: z.number(),
  tax_amount: z.number(),
  total: z.number(),
  terms: z.string().nullable(),
  items: z.array(publicQuoteItemSchema),
  deposit: z.object({
    percent: z.number().int().min(0).max(100),
    instructions: z.string().nullable(),
    payment_url: z.string().nullable(),
  }),
  is_owner_preview: z.boolean(),
})

export type PublicQuote = z.infer<typeof publicQuoteSchema>
export type PublicQuoteItem = z.infer<typeof publicQuoteItemSchema>
export type PublicQuoteState = 'open' | 'accepted' | 'rejected' | 'expired' | 'closed'
export type BannerTone = 'info' | 'success' | 'warning' | 'neutral'

export interface StatusBanner {
  readonly tone: BannerTone
  readonly text: string
}
```

`apps/web/lib/public-quote/test-fixtures.ts`:
```ts
import type { PublicQuote } from './types'

export const publicQuoteFixture: PublicQuote = {
  business: { name: 'MEGAGLASS', brand_color: '#0E7490', logo_url: 'https://example.com/logo.png', phone: '528112345678' },
  client_first_name: 'Laura',
  quote_number: 'COT-2026-0007',
  issued_on: '2026-10-13',
  valid_until: '2026-10-28',
  status: 'sent',
  is_expired: false,
  accepted_at: null,
  rejected_at: null,
  accepted_by_name: null,
  subtotal: 1500,
  discount_rate: 0,
  discount_amount: 0,
  tax_rate: 16,
  tax_amount: 240,
  total: 1740,
  terms: '50 % de anticipo al aceptar.',
  items: [{ description: 'Cancel de baño templado', quantity: 1, unit_type: 'fixed', unit_price: 1500, subtotal: 1500 }],
  deposit: { percent: 50, instructions: null, payment_url: null },
  is_owner_preview: false,
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

`apps/web/lib/public-quote/state.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { publicQuoteState, statusBanner } from './state'
import { publicQuoteFixture as base } from './test-fixtures'

describe('publicQuoteState', () => {
  it.each([
    ['sent', false, 'open'],
    ['viewed', false, 'open'],
    ['sent', true, 'expired'],
    ['expired', false, 'expired'],
    ['accepted', false, 'accepted'],
    ['en_instalacion', false, 'accepted'],
    ['completado', true, 'accepted'],
    ['cobrado', false, 'accepted'],
    ['rejected', false, 'rejected'],
    ['draft', false, 'closed'],
  ] as const)('%s (vencida: %s) → %s', (status, isExpired, expected) => {
    expect(publicQuoteState({ status, is_expired: isExpired })).toBe(expected)
  })
})

describe('statusBanner', () => {
  it('no muestra aviso cuando el cliente puede responder', () => {
    expect(statusBanner(base)).toBeNull()
  })

  it('avisa al negocio que es una vista previa', () => {
    expect(statusBanner({ ...base, is_owner_preview: true })).toEqual({
      tone: 'info',
      text: 'Vista previa: así ve tu cliente esta cotización. Solo tu cliente puede aceptarla o rechazarla.',
    })
  })

  it('aceptada con fecha y nombre', () => {
    const banner = statusBanner({ ...base, status: 'accepted', accepted_at: '2026-10-14T15:05:00Z', accepted_by_name: 'Laura Pérez' })
    expect(banner?.tone).toBe('success')
    expect(banner?.text).toContain('Cotización aceptada el 14 de octubre de 2026')
    expect(banner?.text).toContain('por Laura Pérez')
  })

  it('vencida pide una actualización', () => {
    expect(statusBanner({ ...base, is_expired: true })).toEqual({ tone: 'warning', text: 'Vencida: pide una actualización a MEGAGLASS.' })
  })

  it('rechazada invita a escribir', () => {
    expect(statusBanner({ ...base, status: 'rejected' })?.text).toBe('Esta cotización fue rechazada. Si cambias de opinión, escríbele a MEGAGLASS.')
  })

  it('borrador no se puede aceptar en línea', () => {
    expect(statusBanner({ ...base, status: 'draft' })?.tone).toBe('neutral')
  })
})
```

`apps/web/lib/public-quote/activity.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { clientActivityLines } from './activity'

const none = { viewed_at: null, accepted_at: null, rejected_at: null, rejection_reason: null, accepted_by_name: null }

describe('clientActivityLines', () => {
  it('sin actividad no hay leyendas', () => {
    expect(clientActivityLines(none)).toEqual([])
  })

  it('vista y aceptada con nombre', () => {
    const lines = clientActivityLines({ ...none, viewed_at: '2026-10-14T15:05:00Z', accepted_at: '2026-10-14T16:00:00Z', accepted_by_name: 'Laura Pérez' })
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^Vista por el cliente el 14 de octubre de 2026/)
    expect(lines[1]).toMatch(/^Aceptada desde la liga el 14 de octubre de 2026/)
    expect(lines[1]).toContain('por Laura Pérez')
  })

  it('rechazada con motivo', () => {
    const [line] = clientActivityLines({ ...none, rejected_at: '2026-10-15T18:00:00Z', rejection_reason: 'Muy caro' })
    expect(line).toMatch(/^Rechazada desde la liga el 15 de octubre de 2026/)
    expect(line).toContain('Motivo: Muy caro')
  })
})
```

- [ ] **Step 3: Correr y ver que fallan**

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/public-quote/state.test.ts lib/public-quote/activity.test.ts`
Expected: FAIL, `Failed to resolve import "./state"` / `"./activity"`.

- [ ] **Step 4: Implementar**

`apps/web/lib/public-quote/state.ts`:
```ts
import { formatDateTime } from './format'
import type { PublicQuote, PublicQuoteState, StatusBanner } from './types'

const ACCEPTED: ReadonlySet<string> = new Set(['accepted', 'en_instalacion', 'completado', 'cobrado'])
const OPEN: ReadonlySet<string> = new Set(['sent', 'viewed'])
const PREVIEW_TEXT = 'Vista previa: así ve tu cliente esta cotización. Solo tu cliente puede aceptarla o rechazarla.'

type BannerInput = Pick<PublicQuote, 'status' | 'is_expired' | 'accepted_at' | 'accepted_by_name' | 'is_owner_preview'> & {
  readonly business: Pick<PublicQuote['business'], 'name'>
}

export function publicQuoteState(quote: Pick<PublicQuote, 'status' | 'is_expired'>): PublicQuoteState {
  if (ACCEPTED.has(quote.status)) return 'accepted'
  if (quote.status === 'rejected') return 'rejected'
  if (quote.status === 'expired') return 'expired'
  if (!OPEN.has(quote.status)) return 'closed'
  return quote.is_expired ? 'expired' : 'open'
}

function acceptedText(quote: BannerInput): string {
  const when = quote.accepted_at ? ` el ${formatDateTime(quote.accepted_at)}` : ''
  const who = quote.accepted_by_name ? ` por ${quote.accepted_by_name}` : ''
  return `Cotización aceptada${when}${who}.`
}

export function statusBanner(quote: BannerInput): StatusBanner | null {
  const business = quote.business.name
  switch (publicQuoteState(quote)) {
    case 'accepted':
      return { tone: 'success', text: acceptedText(quote) }
    case 'rejected':
      return { tone: 'neutral', text: `Esta cotización fue rechazada. Si cambias de opinión, escríbele a ${business}.` }
    case 'expired':
      return { tone: 'warning', text: `Vencida: pide una actualización a ${business}.` }
    case 'closed':
      return { tone: 'neutral', text: `Esta cotización todavía no se puede aceptar en línea. Escríbele a ${business} si tienes dudas.` }
    case 'open':
      return quote.is_owner_preview ? { tone: 'info', text: PREVIEW_TEXT } : null
  }
}
```

`apps/web/lib/public-quote/activity.ts`:
```ts
import { formatDateTime } from './format'

export interface ClientActivity {
  readonly viewed_at: string | null
  readonly accepted_at: string | null
  readonly rejected_at: string | null
  readonly rejection_reason: string | null
  readonly accepted_by_name: string | null
}

/**
 * accepted_at y rejected_at solo los escribe respond_public_quote (migración 041); el cambio manual de
 * estado no los toca. Por eso su presencia indica que el cliente respondió desde la liga.
 */
export function clientActivityLines(activity: ClientActivity): readonly string[] {
  const acceptedBy = activity.accepted_by_name ? ` por ${activity.accepted_by_name}` : ''
  const reason = activity.rejection_reason ? `. Motivo: ${activity.rejection_reason}` : ''
  return [
    activity.viewed_at ? `Vista por el cliente el ${formatDateTime(activity.viewed_at)}` : null,
    activity.accepted_at ? `Aceptada desde la liga el ${formatDateTime(activity.accepted_at)}${acceptedBy}` : null,
    activity.rejected_at ? `Rechazada desde la liga el ${formatDateTime(activity.rejected_at)}${reason}` : null,
  ].filter((line): line is string => line !== null)
}
```

`apps/web/lib/public-quote/get-public-quote.ts`:
```ts
import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { isPublicQuoteToken } from './token'
import { publicQuoteSchema, type PublicQuote } from './types'

/** Lee la cotización por RPC anónima (sin service role). Liga vencida, revocada o mal formada: null. */
export async function getPublicQuote(token: string): Promise<PublicQuote | null> {
  if (!isPublicQuoteToken(token)) return null
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('get_public_quote', { p_token: token })
  if (error) {
    logger.error('get_public_quote failed', error)
    return null
  }
  if (data === null) return null
  const parsed = publicQuoteSchema.safeParse(data)
  if (!parsed.success) {
    logger.warn('get_public_quote returned an unexpected shape', { issues: parsed.error.issues.length })
    return null
  }
  return parsed.data
}
```

- [ ] **Step 5: Correr y ver que pasan**

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/public-quote && pnpm exec tsc --noEmit -p .`
Expected: PASS; `tsc` sin errores.

- [ ] **Step 6: Comprobar la forma real de la RPC contra el esquema**

Run (crea una liga de prueba en la base local, como lo haría la app, y valida la respuesta anónima con el esquema Zod):
```bash
OWNER_ID=$(psql "$DB" -Atc "select id from auth.users where email='direccion@megaglass.demo.cotizapro.mx'")
TOKEN=$(psql "$DB" -At -v ON_ERROR_STOP=1 <<SQL | tail -1
select set_config('request.jwt.claims', json_build_object('sub','$OWNER_ID','role','authenticated')::text, false);
set role authenticated;
select create_quote_share('$QUOTE');
SQL
)
SCRATCH=$(mktemp -d)
psql "$DB" -At -c "set role anon; select get_public_quote('$TOKEN')" | tail -1 > "$SCRATCH/public-quote.json"
cd $REPO/apps/web && pnpm exec tsx -e "import { publicQuoteSchema } from './lib/public-quote/types'; import { readFileSync } from 'node:fs'; const r = publicQuoteSchema.safeParse(JSON.parse(readFileSync('$SCRATCH/public-quote.json', 'utf8'))); console.log(r.success ? 'schema ok' : JSON.stringify(r.error.issues, null, 2))"
```
Expected: `schema ok`. Si imprime errores, ajustar `types.ts` (no la migración) y repetir. Esta liga de prueba se reemplaza sola en la siguiente tarea que cree una.

- [ ] **Step 7: Punto de control (sin commit)**

Entra en el **Commit B**.

---

### Task 4: Mensajes de WhatsApp y correo con la liga

**Files:**
- Modify: `apps/web/lib/whatsapp/link.ts`
- Modify: `apps/web/lib/whatsapp/link.test.ts`
- Modify: `apps/web/lib/email/quote-email.ts`
- Modify: `apps/web/lib/email/quote-email.test.ts`
- Modify: `apps/web/app/api/quotes/[id]/send/route.ts` (solo para que compile; la Tarea 9 lo reescribe)

**Interfaces:**
- Consumes: nada nuevo.
- Produces:
  - `QuoteMessageInput.shareUrl: string | null` (reemplaza a `pdfUrl`)
  - `quoteQuestionMessage(quoteNumber: string, clientFirstName: string | null): string`
  - `QuoteEmailInput.acceptUrl: string | null`

- [ ] **Step 1: Actualizar las pruebas (fallan)**

En `apps/web/lib/whatsapp/link.test.ts`, cambiar la importación, el fixture y el último caso, y agregar el bloque nuevo:

```ts
import { describe, expect, it } from 'vitest'
import { normalizeWhatsappPhone, quoteQuestionMessage, quoteWhatsappMessage, whatsappLink } from './link'
```

```ts
  const base = {
    clientName: 'Andrea Garza Villarreal',
    businessName: 'MEGAGLASS',
    quoteNumber: 'COT-2026-002',
    total: 12238.48,
    validUntil: '2026-10-27T00:00:00.000Z',
    shareUrl: null,
  }
```

```ts
  it('lleva la liga para revisar y aceptar cuando existe', () => {
    const text = quoteWhatsappMessage({ ...base, shareUrl: 'https://app.cotizapro.mx/c/abc' })
    expect(text).toContain('Revísala y acéptala aquí: https://app.cotizapro.mx/c/abc')
    expect(text).not.toContain('PDF')
  })
})

describe('quoteQuestionMessage', () => {
  it('se presenta con el nombre del cliente', () => {
    expect(quoteQuestionMessage('COT-2026-002', 'Andrea')).toBe('Hola, soy Andrea. Tengo dudas sobre la cotización COT-2026-002.')
  })

  it('sin nombre solo menciona el folio', () => {
    expect(quoteQuestionMessage('COT-2026-002', null)).toBe('Hola. Tengo dudas sobre la cotización COT-2026-002.')
  })
})
```
(El caso `'usa la liga del PDF cuando existe'` se elimina; el caso `'saluda por nombre…'` se queda igual y sigue esperando `'te mando el PDF'` cuando `shareUrl` es `null`.)

En `apps/web/lib/email/quote-email.test.ts`, agregar `acceptUrl: null,` al objeto `base: QuoteEmailInput` (después de `validUntil`; sin esa línea el fixture deja de compilar) y estos casos dentro del `describe`:

```ts
  it('agrega el botón "Ver y aceptar cotización" con la liga', () => {
    const url = 'https://app.cotizapro.mx/c/0123abcd'
    const { html, text } = buildQuoteEmail({ ...base, acceptUrl: url })
    expect(html).toContain('Ver y aceptar cotización')
    expect(html).toContain(`href="${url}"`)
    expect(text).toContain(`Ver y aceptar cotización: ${url}`)
  })

  it('sin liga no muestra el botón', () => {
    const { html, text } = buildQuoteEmail(base)
    expect(html).not.toContain('Ver y aceptar cotización')
    expect(text).not.toContain('Ver y aceptar cotización')
  })
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/whatsapp/link.test.ts lib/email/quote-email.test.ts`
Expected: FAIL (`quoteQuestionMessage is not a function`; el HTML no contiene "Ver y aceptar cotización").

- [ ] **Step 3: Implementar `link.ts`**

Reemplazar desde `export interface QuoteMessageInput` hasta el final de `apps/web/lib/whatsapp/link.ts` por:

```ts
export interface QuoteMessageInput {
  readonly clientName: string
  readonly businessName: string | null
  readonly quoteNumber: string
  readonly total: number
  readonly validUntil: string | null
  /** Liga pública /c/... para ver y aceptar; null si no se generó. */
  readonly shareUrl: string | null
}

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
const day = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function quoteWhatsappMessage(input: QuoteMessageInput): string {
  const firstName = input.clientName.trim().split(/\s+/)[0] ?? ''
  const from = input.businessName ? ` de ${input.businessName}` : ''
  const lines = [
    `Hola ${firstName}, te comparto la cotización ${input.quoteNumber}${from}.`,
    `Total: ${money.format(Number(input.total))}`,
    input.validUntil ? `Vigente hasta el ${day.format(new Date(input.validUntil))}.` : null,
    input.shareUrl ? `Revísala y acéptala aquí: ${input.shareUrl}` : 'En seguida te mando el PDF por aquí.',
  ]
  return lines.filter((line): line is string => line !== null).join('\n')
}

/** Mensaje del botón "Tengo dudas" de la página pública (lo escribe el cliente al negocio). */
export function quoteQuestionMessage(quoteNumber: string, clientFirstName: string | null): string {
  const who = clientFirstName ? `, soy ${clientFirstName}` : ''
  return `Hola${who}. Tengo dudas sobre la cotización ${quoteNumber}.`
}
```

- [ ] **Step 4: Implementar `quote-email.ts`**

El archivo actual arma el HTML con `brandedEmailHtml`, `contactHtml` y `contactLines` de `./layout`; se conservan. Reemplazar el contenido completo de `apps/web/lib/email/quote-email.ts` por:

```ts
import { encode as escapeHtml } from 'html-entities'
import { formatAmount } from '@/lib/format/money'
import { brandedEmailHtml, contactHtml, contactLines, type BrandedEmailBrand, type BusinessContact } from './layout'

export interface QuoteEmailInput extends BrandedEmailBrand {
  readonly clientName: string
  readonly quoteNumber: string
  readonly total: number | string
  readonly validUntil: string | null
  /** Liga pública /c/... para ver y aceptar; null si no se generó. */
  readonly acceptUrl: string | null
  readonly contact: BusinessContact
}

export interface EmailContent {
  readonly subject: string
  readonly html: string
  readonly text: string
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Monterrey' })
}

function acceptButton(input: QuoteEmailInput): string {
  if (!input.acceptUrl) return ''
  return `<p style="margin:20px 0 0;text-align:center"><a href="${escapeHtml(input.acceptUrl)}" style="display:inline-block;background:${input.palette.color};color:${input.palette.ink};text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:8px">Ver y aceptar cotización</a></p>`
}

function closingLine(input: QuoteEmailInput): string {
  return input.acceptUrl
    ? 'Puedes revisarla y aceptarla en línea con el botón. Si tienes dudas, responde a este correo y con gusto te atendemos.'
    : 'Si tienes dudas o quieres aprobarla, responde a este correo y con gusto te atendemos.'
}

export function buildQuoteEmail(input: QuoteEmailInput): EmailContent {
  const total = `$${formatAmount(input.total)} MXN`
  const validUntil = formatDate(input.validUntil)
  const subject = `Cotización ${input.quoteNumber} de ${input.businessName}`

  const body = `<p style="margin:0 0 12px;font-size:16px">Hola ${escapeHtml(input.clientName)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Te compartimos la cotización <strong>${escapeHtml(input.quoteNumber)}</strong>. Va adjunta en PDF con el detalle de cada concepto.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px">
<tr><td style="padding:12px 16px;font-size:14px;color:#6b7280">Total</td><td style="padding:12px 16px;font-size:18px;font-weight:bold;text-align:right;color:${input.palette.onLight}">${escapeHtml(total)}</td></tr>
${validUntil ? `<tr><td style="padding:0 16px 12px;font-size:14px;color:#6b7280">Válida hasta</td><td style="padding:0 16px 12px;font-size:14px;text-align:right">${escapeHtml(validUntil)}</td></tr>` : ''}
</table>
${acceptButton(input)}
<p style="margin:16px 0 0;font-size:15px;line-height:1.5">${closingLine(input)}</p>
${contactHtml(input.contact)}`

  const lines = contactLines(input.contact)
  const text = [
    `Hola ${input.clientName},`,
    '',
    `Te compartimos la cotización ${input.quoteNumber} de ${input.businessName}. Va adjunta en PDF.`,
    `Total: ${total}`,
    ...(validUntil ? [`Válida hasta: ${validUntil}`] : []),
    ...(input.acceptUrl ? ['', `Ver y aceptar cotización: ${input.acceptUrl}`] : []),
    '',
    input.acceptUrl ? 'Si tienes dudas, responde a este correo.' : 'Si tienes dudas o quieres aprobarla, responde a este correo.',
    ...(lines.length ? ['', ...lines] : []),
  ].join('\n')

  return { subject, html: brandedEmailHtml(input, body), text }
}
```

- [ ] **Step 5: Mantener compilando la ruta de envío**

En `apps/web/app/api/quotes/[id]/send/route.ts`:
- en la llamada a `buildQuoteEmail({ ... })`, agregar la propiedad `acceptUrl: null,` después de `validUntil: quote.valid_until,`;
- en la llamada a `quoteWhatsappMessage({ ... })`, reemplazar `pdfUrl: publicUrl || null,` por `shareUrl: null,`.

- [ ] **Step 6: Correr y ver que pasan**

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/whatsapp lib/email && pnpm exec tsc --noEmit -p .`
Expected: PASS; `tsc` sin errores.

- [ ] **Step 7: Punto de control (sin commit)**

Entra en el **Commit B**.

---

### Task 5: Servicio de la liga y API privada `/api/quotes/[id]/share`

**Files:**
- Create: `apps/web/lib/quotes/share-link.ts`
- Create: `apps/web/app/api/quotes/[id]/share/route.ts`

**Interfaces:**
- Consumes: RPC `create_quote_share` (Tarea 1), `isPublicQuoteToken`, `publicQuoteUrl` (Tarea 2), `requireMember` (`lib/auth/require-member.ts`), `defaultApiLimiter`, `applyRateLimit`, `logger`.
- Produces:
  - `type ServerClient = Awaited<ReturnType<typeof createServerClient>>`
  - `type ShareLinkResult = { ok: true; url: string } | { ok: false; status: number; error: string }`
  - `createQuoteShareLink(supabase: ServerClient, quoteId: string, fallbackOrigin: string): Promise<ShareLinkResult>`
  - `GET /api/quotes/[id]/share` → `200 { data: { expires_at, first_viewed_at, created_at } | null }`
  - `POST /api/quotes/[id]/share` → `201 { data: { url } }` (owner/admin/member)
  - `DELETE /api/quotes/[id]/share` → `200 { data: { revoked: number } }` (owner/admin/member)

- [ ] **Step 1: Implementar el servicio**

`apps/web/lib/quotes/share-link.ts`:
```ts
import type { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { isPublicQuoteToken, publicQuoteUrl } from '@/lib/public-quote/token'

export type ServerClient = Awaited<ReturnType<typeof createServerClient>>

export type ShareLinkResult =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly status: number; readonly error: string }

const SHARE_ERRORS: Readonly<Record<string, { readonly status: number; readonly error: string }>> = {
  quote_not_found: { status: 404, error: 'Cotización no encontrada' },
  forbidden: { status: 403, error: 'Tu rol no permite compartir cotizaciones' },
}

const FAILED: ShareLinkResult = { ok: false, status: 500, error: 'No se pudo generar la liga de la cotización' }

/** Crea la liga pública y revoca la anterior. El token solo existe en esta respuesta; la base guarda su hash. */
export async function createQuoteShareLink(supabase: ServerClient, quoteId: string, fallbackOrigin: string): Promise<ShareLinkResult> {
  const { data, error } = await supabase.rpc('create_quote_share', { p_quote_id: quoteId })
  if (error) {
    const known = SHARE_ERRORS[error.message]
    if (known) return { ok: false, ...known }
    logger.error('create_quote_share failed', error, { quoteId })
    return FAILED
  }
  if (!isPublicQuoteToken(data)) {
    logger.error('create_quote_share returned an invalid token', undefined, { quoteId })
    return FAILED
  }
  return { ok: true, url: publicQuoteUrl(data, fallbackOrigin) }
}
```

- [ ] **Step 2: Implementar la ruta**

`apps/web/app/api/quotes/[id]/share/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMember } from '@/lib/auth/require-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { createQuoteShareLink } from '@/lib/quotes/share-link'
import { logger } from '@/lib/logger'

interface RouteContext {
  readonly params: Promise<{ id: string }>
}

const WORKERS = ['owner', 'admin', 'member'] as const
const quoteIdSchema = z.guid()

async function quoteIdFrom(context: RouteContext): Promise<string | null> {
  const parsed = quoteIdSchema.safeParse((await context.params).id)
  return parsed.success ? parsed.data : null
}

function invalidId(): NextResponse {
  return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
}

/** Liga activa de la cotización. El token no se puede volver a mostrar: solo existe al crearla. */
export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember()
  if (!auth.ok) return auth.response
  const id = await quoteIdFrom(context)
  if (!id) return invalidId()

  const { data, error } = await auth.ctx.supabase
    .from('quote_shares')
    .select('expires_at, first_viewed_at, created_at')
    .eq('quote_id', id)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) {
    logger.error('quote_shares lookup failed', error, { quoteId: id })
    return NextResponse.json({ error: 'No se pudo consultar la liga' }, { status: 500 })
  }
  return NextResponse.json({ data: data?.[0] ?? null })
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember(WORKERS)
  if (!auth.ok) return auth.response
  const id = await quoteIdFrom(context)
  if (!id) return invalidId()

  const share = await createQuoteShareLink(auth.ctx.supabase, id, request.nextUrl.origin)
  if (!share.ok) return NextResponse.json({ error: share.error }, { status: share.status })
  return NextResponse.json({ data: { url: share.url } }, { status: 201 })
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember(WORKERS)
  if (!auth.ok) return auth.response
  const id = await quoteIdFrom(context)
  if (!id) return invalidId()

  const { data, error } = await auth.ctx.supabase
    .from('quote_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('quote_id', id)
    .is('revoked_at', null)
    .select('id')
  if (error) {
    logger.error('quote_shares revoke failed', error, { quoteId: id })
    return NextResponse.json({ error: 'No se pudo revocar la liga' }, { status: 500 })
  }
  return NextResponse.json({ data: { revoked: (data ?? []).length } })
}
```

- [ ] **Step 3: Verificar tipos**

Run: `cd $REPO/apps/web && pnpm exec tsc --noEmit -p .`
Expected: sin errores.

- [ ] **Step 4: Prueba de humo contra el dev server**

Run (con los "Comandos de apoyo" cargados):
```bash
curl -s -X POST -H "Authorization: Bearer $JWT" $APP/api/quotes/$QUOTE/share
curl -s -H "Authorization: Bearer $JWT" $APP/api/quotes/$QUOTE/share
curl -s -X DELETE -H "Authorization: Bearer $JWT" $APP/api/quotes/$QUOTE/share
curl -s -o /dev/null -w "%{http_code}\n" -X POST $APP/api/quotes/$QUOTE/share
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer $JWT" $APP/api/quotes/no-es-uuid/share
```
Expected, en orden: `{"data":{"url":"…/c/<64 hex>"}}`; `{"data":{"expires_at":…,"first_viewed_at":null,…}}`; `{"data":{"revoked":1}}`; `401`; `400`.

- [ ] **Step 5: Punto de control (sin commit)**

Entra en el **Commit B**.

---

### Task 6: PDF público

**Files:**
- Create: `apps/web/lib/pdf/quote-pdf-types.ts`
- Modify: `apps/web/lib/pdf/QuotePDF.tsx`
- Modify: `apps/web/lib/integrations/pdf.tsx`
- Create: `apps/web/lib/public-quote/pdf-input.ts`, `apps/web/lib/public-quote/pdf-input.test.ts`
- Create: `apps/web/app/api/public/quotes/[token]/pdf/route.ts`

**Interfaces:**
- Consumes: `PublicQuote`, `publicQuoteFixture`, `getPublicQuote` (Tarea 3), `OrgSettings` (`lib/pdf/QuotePDF.tsx`).
- Produces:
  - `interface QuotePdfItem { id; description; quantity; unit_type: string; unit_price; subtotal; breakdown?: unknown }`
  - `interface QuotePdfData { quote_number; created_at; valid_until; subtotal; discount_rate; discount_amount; tax_rate; tax_amount; total; notes; terms_and_conditions; client: { name; email: string | null; phone: string | null }; items: readonly QuotePdfItem[] }`
  - `generateQuotePDF(quote: QuotePdfData, orgName?: string, orgSettings?: OrgSettings): Promise<Buffer>`
  - `toPdfQuote(quote: PublicQuote): QuotePdfData`; `toPdfOrgSettings(quote: PublicQuote): OrgSettings`
  - `GET /api/public/quotes/[token]/pdf` → `application/pdf` o `404 { error }`

- [ ] **Step 1: Escribir la prueba del adaptador (falla)**

`apps/web/lib/public-quote/pdf-input.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { toPdfOrgSettings, toPdfQuote } from './pdf-input'
import { publicQuoteFixture as base } from './test-fixtures'

describe('toPdfQuote', () => {
  it('no pasa contacto del cliente ni notas internas', () => {
    const pdf = toPdfQuote(base)
    expect(pdf.client).toEqual({ name: 'Laura', email: null, phone: null })
    expect(pdf.notes).toBeNull()
    expect(pdf.terms_and_conditions).toBe('50 % de anticipo al aceptar.')
  })

  it('usa la fecha de emisión y numera las partidas sin desglose de costos', () => {
    const pdf = toPdfQuote(base)
    expect(pdf.created_at).toBe('2026-10-13')
    expect(pdf.items).toEqual([{ id: 'item-1', description: 'Cancel de baño templado', quantity: 1, unit_type: 'fixed', unit_price: 1500, subtotal: 1500 }])
  })

  it('sin nombre de cliente usa "Cliente"', () => {
    expect(toPdfQuote({ ...base, client_first_name: null }).client.name).toBe('Cliente')
  })
})

describe('toPdfOrgSettings', () => {
  it('solo incluye los datos presentes del negocio', () => {
    expect(toPdfOrgSettings({ ...base, business: { ...base.business, logo_url: null } })).toEqual({
      company_phone: '528112345678',
      brand_color: '#0E7490',
    })
  })
})
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/public-quote/pdf-input.test.ts`
Expected: FAIL, `Failed to resolve import "./pdf-input"`.

- [ ] **Step 3: Tipos del PDF y cambios en `QuotePDF.tsx` / `pdf.tsx`**

`apps/web/lib/pdf/quote-pdf-types.ts`:
```ts
/** Datos mínimos que dibuja QuotePDF. Una QuoteWithItems completa también cumple esta forma. */
export interface QuotePdfItem {
  readonly id: string
  readonly description: string
  readonly quantity: number
  readonly unit_type: string
  readonly unit_price: number
  readonly subtotal: number
  readonly breakdown?: unknown
}

export interface QuotePdfData {
  readonly quote_number: string
  readonly created_at: string
  readonly valid_until: string
  readonly subtotal: number
  readonly discount_rate: number
  readonly discount_amount: number
  readonly tax_rate: number
  readonly tax_amount: number
  readonly total: number
  readonly notes: string | null
  readonly terms_and_conditions: string | null
  readonly client: { readonly name: string; readonly email: string | null; readonly phone: string | null }
  readonly items: readonly QuotePdfItem[]
}
```

En `apps/web/lib/pdf/QuotePDF.tsx`:
- reemplazar `import type { QuoteWithItems } from '@/types/database.types'` por `import type { QuotePdfData } from './quote-pdf-types'`;
- en `interface QuotePDFProps`, reemplazar `quote: QuoteWithItems` por `quote: QuotePdfData`;
- reemplazar `const materials = materialsFromItems(quote.items as readonly { readonly breakdown?: unknown }[])` por `const materials = materialsFromItems(quote.items)`.

Reemplazar el contenido de `apps/web/lib/integrations/pdf.tsx` por:
```tsx
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePDF, type OrgSettings } from '@/lib/pdf/QuotePDF'
import type { QuotePdfData } from '@/lib/pdf/quote-pdf-types'

export type { OrgSettings }

export async function generateQuotePDF(
  quote: QuotePdfData,
  orgName: string = 'Tu Empresa',
  orgSettings: OrgSettings = {}
): Promise<Buffer> {
  const element = <QuotePDF quote={quote} orgName={orgName} orgSettings={orgSettings} />
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
```

- [ ] **Step 4: Implementar el adaptador**

`apps/web/lib/public-quote/pdf-input.ts`:
```ts
import type { OrgSettings } from '@/lib/pdf/QuotePDF'
import type { QuotePdfData } from '@/lib/pdf/quote-pdf-types'
import type { PublicQuote } from './types'

/** El PDF público usa exactamente los datos de get_public_quote: sin contacto del cliente, notas ni costos. */
export function toPdfQuote(quote: PublicQuote): QuotePdfData {
  return {
    quote_number: quote.quote_number,
    created_at: quote.issued_on,
    valid_until: quote.valid_until,
    subtotal: quote.subtotal,
    discount_rate: quote.discount_rate,
    discount_amount: quote.discount_amount,
    tax_rate: quote.tax_rate,
    tax_amount: quote.tax_amount,
    total: quote.total,
    notes: null,
    terms_and_conditions: quote.terms,
    client: { name: quote.client_first_name ?? 'Cliente', email: null, phone: null },
    items: quote.items.map((item, index) => ({ id: `item-${index + 1}`, ...item })),
  }
}

export function toPdfOrgSettings(quote: PublicQuote): OrgSettings {
  const { phone, logo_url, brand_color } = quote.business
  return {
    ...(phone ? { company_phone: phone } : {}),
    ...(logo_url ? { logo_url } : {}),
    ...(brand_color ? { brand_color } : {}),
  }
}
```

- [ ] **Step 5: Implementar la ruta del PDF**

`apps/web/app/api/public/quotes/[token]/pdf/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { generateQuotePDF } from '@/lib/integrations/pdf'
import { getPublicQuote } from '@/lib/public-quote/get-public-quote'
import { toPdfOrgSettings, toPdfQuote } from '@/lib/public-quote/pdf-input'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

interface RouteContext {
  readonly params: Promise<{ token: string }>
}

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } as const

/** Público: PDF de la cotización con la liga /c/<token>. Sustituye la URL adivinable del bucket documents. */
export async function GET(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const { token } = await params
  const quote = await getPublicQuote(token)
  if (!quote) return NextResponse.json({ error: 'Liga no disponible' }, { status: 404, headers: PRIVATE_HEADERS })

  try {
    const pdf = await generateQuotePDF(toPdfQuote(quote), quote.business.name, toPdfOrgSettings(quote))
    const fileName = `cotizacion-${quote.quote_number.replace(/[^A-Za-z0-9-]/g, '')}.pdf`
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': pdf.length.toString(),
      },
    })
  } catch (error) {
    logger.error('public quote PDF failed', error)
    return NextResponse.json({ error: 'No se pudo generar el PDF' }, { status: 500, headers: PRIVATE_HEADERS })
  }
}
```

- [ ] **Step 6: Correr pruebas, tipos y humo**

Run:
```bash
cd $REPO/apps/web && pnpm exec vitest run lib/public-quote && pnpm exec tsc --noEmit -p .
TOKEN_URL=$(curl -s -X POST -H "Authorization: Bearer $JWT" $APP/api/quotes/$QUOTE/share | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.url')
TOKEN=${TOKEN_URL##*/}
curl -s -o /tmp/publica.pdf -w "%{http_code} %{content_type}\n" $APP/api/public/quotes/$TOKEN/pdf
curl -s -o /dev/null -w "%{http_code}\n" $APP/api/public/quotes/$(printf 'a%.0s' {1..64})/pdf
```
Expected: PASS; `tsc` sin errores; `200 application/pdf`; `404`. Abrir `/tmp/publica.pdf`: muestra marca del negocio y partidas, y **no** muestra correo ni teléfono del cliente ni "Notas".

- [ ] **Step 7: Punto de control (sin commit)**

Entra en el **Commit B**.

---

### Task 7: Rutas públicas de vista y de respuesta

**Files:**
- Create: `apps/web/lib/validations/public-quote.ts`, `apps/web/lib/validations/public-quote.test.ts`
- Create: `apps/web/app/api/public/quotes/[token]/view/route.ts`
- Create: `apps/web/app/api/public/quotes/[token]/respond/route.ts`

**Interfaces:**
- Consumes: RPCs `mark_public_quote_viewed`, `respond_public_quote` (Tarea 1); `isPublicQuoteToken`, `isLinkPreviewAgent` (Tarea 2); `hashClientIp` (`lib/showcase/request-meta.ts`); `validationErrorResponse` (`lib/error-handler.ts`).
- Produces:
  - `respondPublicQuoteSchema` y `type RespondPublicQuoteInput = { action: 'accept' | 'reject'; name?: string; reason?: string }`
  - `POST /api/public/quotes/[token]/view` → `204`, `400 { error }`, `500 { error }`
  - `POST /api/public/quotes/[token]/respond` body `RespondPublicQuoteInput` → `200 { data: { status: string; changed: boolean } }`; `400` (validación o acción), `403` (vista previa del negocio), `409` (vencida), `410` (liga no activa), `429` (límite por IP).

- [ ] **Step 1: Escribir la prueba de validación (falla)**

`apps/web/lib/validations/public-quote.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { respondPublicQuoteSchema } from './public-quote'

describe('respondPublicQuoteSchema', () => {
  it('acepta aceptar sin nombre', () => {
    expect(respondPublicQuoteSchema.parse({ action: 'accept' })).toEqual({ action: 'accept' })
  })

  it('recorta nombre y motivo', () => {
    expect(respondPublicQuoteSchema.parse({ action: 'reject', reason: '  Muy caro  ', name: ' Laura ' })).toEqual({
      action: 'reject', reason: 'Muy caro', name: 'Laura',
    })
  })

  it('rechaza acciones desconocidas', () => {
    expect(respondPublicQuoteSchema.safeParse({ action: 'delete' }).success).toBe(false)
  })

  it('limita el nombre a 120 y el motivo a 500 caracteres', () => {
    expect(respondPublicQuoteSchema.safeParse({ action: 'accept', name: 'x'.repeat(121) }).success).toBe(false)
    expect(respondPublicQuoteSchema.safeParse({ action: 'reject', reason: 'x'.repeat(501) }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/validations/public-quote.test.ts`
Expected: FAIL, `Failed to resolve import "./public-quote"`.

- [ ] **Step 3: Implementar el esquema**

`apps/web/lib/validations/public-quote.ts`:
```ts
import { z } from 'zod'

export const respondPublicQuoteSchema = z.object({
  action: z.enum(['accept', 'reject']),
  name: z.string().trim().max(120, 'Tu nombre puede tener hasta 120 caracteres').optional(),
  reason: z.string().trim().max(500, 'El motivo puede tener hasta 500 caracteres').optional(),
})

export type RespondPublicQuoteInput = z.infer<typeof respondPublicQuoteSchema>
```

- [ ] **Step 4: Implementar la ruta de vista**

`apps/web/app/api/public/quotes/[token]/view/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isPublicQuoteToken } from '@/lib/public-quote/token'
import { isLinkPreviewAgent } from '@/lib/public-quote/user-agent'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

interface RouteContext {
  readonly params: Promise<{ token: string }>
}

/** Público: el navegador del cliente avisa que abrió la liga (sent → viewed). Las vistas previas no cuentan. */
export async function POST(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const { token } = await params
  if (!isPublicQuoteToken(token)) return NextResponse.json({ error: 'Liga inválida' }, { status: 400 })
  if (isLinkPreviewAgent(request.headers.get('user-agent'))) return new NextResponse(null, { status: 204 })

  const supabase = await createServerClient()
  const { error } = await supabase.rpc('mark_public_quote_viewed', { p_token: token })
  if (error) {
    logger.error('mark_public_quote_viewed failed', error)
    return NextResponse.json({ error: 'No se pudo registrar la vista' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Implementar la ruta de respuesta**

`apps/web/app/api/public/quotes/[token]/respond/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { hashClientIp } from '@/lib/showcase/request-meta'
import { isPublicQuoteToken } from '@/lib/public-quote/token'
import { respondPublicQuoteSchema } from '@/lib/validations/public-quote'

interface RouteContext {
  readonly params: Promise<{ token: string }>
}

interface KnownError {
  readonly status: number
  readonly message: string
}

const INVALID_TOKEN: KnownError = { status: 410, message: 'Esta liga ya no está activa. Pide una nueva a quien te cotizó.' }

const RESPOND_ERRORS: Readonly<Record<string, KnownError>> = {
  invalid_token: INVALID_TOKEN,
  quote_expired: { status: 409, message: 'Esta cotización ya venció. Pide una actualización.' },
  owner_preview: { status: 403, message: 'Estás viendo tu propia cotización: solo tu cliente puede responder.' },
  rate_limited: { status: 429, message: 'Recibimos varias respuestas desde tu conexión. Intenta de nuevo en una hora.' },
  invalid_action: { status: 400, message: 'Acción no válida.' },
}

const respondResultSchema = z.object({ status: z.string(), changed: z.boolean() })

/** Público: el cliente acepta o rechaza desde la liga. Idempotente; límite por IP en la base. */
export async function POST(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const { token } = await params
  if (!isPublicQuoteToken(token)) return NextResponse.json({ error: INVALID_TOKEN.message }, { status: INVALID_TOKEN.status })
  const parsed = respondPublicQuoteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('respond_public_quote', {
    p_token: token,
    p_action: parsed.data.action,
    p_reason: parsed.data.reason ?? null,
    p_name: parsed.data.name ?? null,
    p_ip_hash: hashClientIp(request),
  })
  if (error) {
    const known = RESPOND_ERRORS[error.message]
    if (known) return NextResponse.json({ error: known.message }, { status: known.status })
    logger.error('respond_public_quote failed', error)
    return NextResponse.json({ error: 'No pudimos registrar tu respuesta. Intenta de nuevo.' }, { status: 500 })
  }
  const result = respondResultSchema.safeParse(data)
  if (!result.success) {
    logger.error('respond_public_quote returned an unexpected shape')
    return NextResponse.json({ error: 'No pudimos registrar tu respuesta. Intenta de nuevo.' }, { status: 500 })
  }
  return NextResponse.json({ data: result.data })
}
```

- [ ] **Step 6: Correr pruebas, tipos y humo**

Run:
```bash
cd $REPO/apps/web && pnpm exec vitest run lib/validations/public-quote.test.ts && pnpm exec tsc --noEmit -p .
psql "$DB" -c "update quotes set status='sent', valid_until=current_date+15 where id='$QUOTE'"
TOKEN_URL=$(curl -s -X POST -H "Authorization: Bearer $JWT" $APP/api/quotes/$QUOTE/share | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data.url'); TOKEN=${TOKEN_URL##*/}
curl -s -o /dev/null -w "%{http_code}\n" -X POST -A 'WhatsApp/2.23.20.0 A' $APP/api/public/quotes/$TOKEN/view
psql "$DB" -Atc "select status from quotes where id='$QUOTE'"
curl -s -o /dev/null -w "%{http_code}\n" -X POST $APP/api/public/quotes/$TOKEN/view
psql "$DB" -Atc "select status from quotes where id='$QUOTE'"
curl -s -X POST -H 'Content-Type: application/json' -d '{"action":"accept","name":"Prueba Humo"}' $APP/api/public/quotes/$TOKEN/respond
curl -s -X POST -H 'Content-Type: application/json' -d '{"action":"accept"}' $APP/api/public/quotes/$TOKEN/respond
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H 'Content-Type: application/json' -d '{"action":"delete"}' $APP/api/public/quotes/$TOKEN/respond
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' -d '{"action":"accept"}' $APP/api/public/quotes/$TOKEN/respond
```
Expected, en orden: PASS y `tsc` limpio; `204` y estado `sent` (la vista previa de WhatsApp no cuenta); `204` y estado `viewed`; `{"data":{"status":"accepted","changed":true}}`; `{"data":{"status":"accepted","changed":false}}`; `400`; `403`.

Nota: `curl` con `Authorization` hace que la RPC vea al propietario → `owner_preview` → `403`. Al terminar, regresar la cotización de humo a borrador: `psql "$DB" -c "update quotes set status='draft', accepted_at=null, accepted_by_name=null, viewed_at=null where id='$QUOTE'"`.

- [ ] **Step 7: Punto de control (sin commit)**

Entra en el **Commit B**.

---

### Task 8: Página pública `/c/[token]`

**Files:**
- Modify: `packages/auth/src/public-routes.ts`
- Modify: `apps/web/lib/auth/public-routes.test.ts`
- Create: `apps/web/hooks/use-quote-response.ts`
- Create: `apps/web/components/public-quote/public-quote-header.tsx`
- Create: `apps/web/components/public-quote/public-quote-items.tsx`
- Create: `apps/web/components/public-quote/deposit-card.tsx`
- Create: `apps/web/components/public-quote/quote-status-banner.tsx`
- Create: `apps/web/components/public-quote/quote-extras.tsx`
- Create: `apps/web/components/public-quote/respond-panels.tsx`
- Create: `apps/web/components/public-quote/quote-actions.tsx`
- Create: `apps/web/components/public-quote/view-beacon.tsx`
- Create: `apps/web/app/c/[token]/page.tsx`

**Interfaces:**
- Consumes: `getPublicQuote`, `publicQuoteState`, `statusBanner`, `PublicQuote`, `StatusBanner`, `BannerTone` (Tarea 3); `depositAmount` (Tarea 2); `formatDateOnly` (Tarea 2); `whatsappLink`, `normalizeWhatsappPhone`, `quoteQuestionMessage` (Tarea 4); `brandCssVars`, `brandPalette` (`lib/branding/color.ts`); `formatAmount` (`lib/format/money.ts`); `formatMxPhone` (`lib/showcase/format-phone.ts`); `ITEM_UNIT_LABEL` (`lib/pdf/quote-materials.ts`); `RespondPublicQuoteInput` (Tarea 7); rutas `view`, `respond`, `pdf` (Tareas 6 y 7).
- Produces: página `/c/[token]` con `data-testid`: `public-quote-total`, `deposit-card`, `quote-status-banner`, `quote-actions`; botones "Aceptar cotización", "No me interesa", "Confirmar aceptación", "Enviar respuesta"; liga "Tengo dudas", "Pagar anticipo", "Descargar PDF"; campo con etiqueta "Tu nombre"; título "Liga no disponible".
  - `useQuoteResponse(token: string): { status: 'idle' | 'sending' | 'done'; error: string; respond(input: RespondPublicQuoteInput): Promise<void> }`

- [ ] **Step 1: Prueba de ruta pública (falla)**

En `apps/web/lib/auth/public-routes.test.ts`, agregar `'/c/0123abcd'` a la lista de rutas públicas y `'/clientes'` a la de rutas con sesión:

```ts
  it.each(['/', '/login', '/signup', '/forgot-password', '/auth/reset-password', '/invite/abc123', '/p/megaglass', '/r/token', '/c/0123abcd', '/terminos', '/privacidad', '/onboarding'])(
```
```ts
  it.each(['/dashboard', '/dashboard/quotes/new', '/invitex', '/pagos', '/forgot-passwordx', '/clientes'])('exige sesión en %s', (path) => {
```

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/auth/public-routes.test.ts`
Expected: FAIL en `permite /c/0123abcd sin sesión`.

- [ ] **Step 2: Hacer pública `/c`**

En `packages/auth/src/public-routes.ts`:
```ts
export const PUBLIC_ROUTES: readonly string[] = [
  '/', '/login', '/signup', '/forgot-password', '/auth', '/onboarding', '/invite', '/terminos', '/privacidad', '/p', '/r', '/c',
]
```

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/auth/public-routes.test.ts`
Expected: PASS (incluido `exige sesión en /clientes`).

- [ ] **Step 3: Hook de respuesta**

`apps/web/hooks/use-quote-response.ts`:
```ts
'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RespondPublicQuoteInput } from '@/lib/validations/public-quote'

export type QuoteResponseStatus = 'idle' | 'sending' | 'done'

export interface QuoteResponseState {
  readonly status: QuoteResponseStatus
  readonly error: string
  readonly respond: (input: RespondPublicQuoteInput) => Promise<void>
}

/** Envía la respuesta del cliente y vuelve a pintar la página de servidor con el estado nuevo. */
export function useQuoteResponse(token: string): QuoteResponseState {
  const router = useRouter()
  const [status, setStatus] = useState<QuoteResponseStatus>('idle')
  const [error, setError] = useState('')

  const respond = useCallback(async (input: RespondPublicQuoteInput) => {
    setStatus('sending')
    setError('')
    try {
      const res = await fetch(`/api/public/quotes/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const body: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'No pudimos registrar tu respuesta. Intenta de nuevo.')
        setStatus('idle')
        return
      }
      setStatus('done')
      router.refresh()
    } catch {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.')
      setStatus('idle')
    }
  }, [router, token])

  return { status, error, respond }
}
```

- [ ] **Step 4: Componentes de servidor**

`apps/web/components/public-quote/public-quote-header.tsx`:
```tsx
import { formatDateOnly } from '@/lib/public-quote/format'
import { formatMxPhone } from '@/lib/showcase/format-phone'
import { normalizeWhatsappPhone } from '@/lib/whatsapp/link'
import type { PublicQuote } from '@/lib/public-quote/types'

function Fact({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-semibold text-gray-900">{children}</dd>
    </div>
  )
}

export function PublicQuoteHeader({ quote }: { readonly quote: PublicQuote }) {
  const { business } = quote
  return (
    <header className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 bg-[var(--brand)] text-[var(--brand-ink)]">
        {business.logo_url && (
          <span className="w-12 h-12 shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo servido desde Storage del negocio */}
            <img src={business.logo_url} alt="" className="w-full h-full object-contain" />
          </span>
        )}
        <h1 className="text-lg font-bold leading-tight">{business.name}</h1>
      </div>
      <dl className="grid grid-cols-2 gap-3 px-4 py-4">
        <Fact label="Cotización">{quote.quote_number}</Fact>
        <Fact label="Para">{quote.client_first_name ?? 'Cliente'}</Fact>
        <Fact label="Fecha">{formatDateOnly(quote.issued_on)}</Fact>
        <Fact label="Válida hasta">{formatDateOnly(quote.valid_until)}</Fact>
        {business.phone && (
          <div className="col-span-2">
            <dt className="text-xs text-gray-500">Teléfono</dt>
            <dd>
              <a href={`tel:+${normalizeWhatsappPhone(business.phone)}`} className="text-sm font-semibold text-[var(--brand-on-light)]">
                {formatMxPhone(business.phone)}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </header>
  )
}
```

`apps/web/components/public-quote/public-quote-items.tsx`:
```tsx
import { formatAmount } from '@/lib/format/money'
import { ITEM_UNIT_LABEL } from '@/lib/pdf/quote-materials'
import type { PublicQuote } from '@/lib/public-quote/types'

function Row({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value < 0 ? '-' : ''}${formatAmount(Math.abs(value))}</dd>
    </div>
  )
}

function Totals({ quote }: { readonly quote: PublicQuote }) {
  return (
    <dl className="border-t border-gray-100 px-4 py-3 space-y-1 text-sm">
      <Row label="Subtotal" value={quote.subtotal} />
      {quote.discount_amount > 0 && <Row label={`Descuento (${quote.discount_rate} %)`} value={-quote.discount_amount} />}
      <Row label={`IVA (${quote.tax_rate} %)`} value={quote.tax_amount} />
      <div className="flex justify-between pt-2 border-t border-gray-100" data-testid="public-quote-total">
        <dt className="font-bold text-gray-900">Total</dt>
        <dd className="text-lg font-bold text-[var(--brand-on-light)]">${formatAmount(quote.total)} MXN</dd>
      </div>
    </dl>
  )
}

export function PublicQuoteItems({ quote }: { readonly quote: PublicQuote }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200">
      <h2 className="px-4 pt-4 text-base font-bold text-gray-900">Conceptos</h2>
      <ul className="divide-y divide-gray-100">
        {quote.items.map((item, index) => (
          <li key={`${index}-${item.description}`} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.description}</p>
              <p className="text-xs text-gray-500">
                {item.quantity} {ITEM_UNIT_LABEL[item.unit_type] ?? item.unit_type} × ${formatAmount(item.unit_price)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-gray-900">${formatAmount(item.subtotal)}</p>
          </li>
        ))}
      </ul>
      <Totals quote={quote} />
    </section>
  )
}
```

`apps/web/components/public-quote/deposit-card.tsx`:
```tsx
import { depositAmount } from '@/lib/deposit/amount'
import { formatAmount } from '@/lib/format/money'
import type { PublicQuote } from '@/lib/public-quote/types'

interface DepositCardProps {
  readonly businessName: string
  readonly total: number
  readonly deposit: PublicQuote['deposit']
}

export function DepositCard({ businessName, total, deposit }: DepositCardProps) {
  const amount = depositAmount(total, deposit.percent)
  return (
    <section data-testid="deposit-card" className="bg-white rounded-2xl border-2 border-[color-mix(in_srgb,var(--brand)_35%,transparent)] p-4 space-y-3">
      <h2 className="text-base font-bold text-gray-900">Anticipo: ${formatAmount(amount)} ({deposit.percent} %)</h2>
      {deposit.instructions && <p className="text-sm text-gray-700 whitespace-pre-line">{deposit.instructions}</p>}
      {deposit.payment_url && (
        <a
          href={deposit.payment_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex items-center justify-center rounded-xl bg-[var(--brand)] py-3 text-sm font-semibold text-[var(--brand-ink)] hover:opacity-90"
        >
          Pagar anticipo
        </a>
      )}
      <p className="text-xs text-gray-500">El pago lo recibe directamente {businessName}.</p>
    </section>
  )
}
```

`apps/web/components/public-quote/quote-status-banner.tsx`:
```tsx
import type { BannerTone, StatusBanner } from '@/lib/public-quote/types'

const TONES: Readonly<Record<BannerTone, string>> = {
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  neutral: 'bg-gray-100 border-gray-200 text-gray-800',
}

export function QuoteStatusBanner({ banner }: { readonly banner: StatusBanner }) {
  return (
    <p role="status" data-testid="quote-status-banner" className={`rounded-xl border px-4 py-3 text-sm font-medium ${TONES[banner.tone]}`}>
      {banner.text}
    </p>
  )
}
```

`apps/web/components/public-quote/quote-extras.tsx`:
```tsx
import Link from 'next/link'

export function QuestionLink({ href }: { readonly href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
    >
      Tengo dudas
    </a>
  )
}

export function TermsSection({ terms }: { readonly terms: string }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Términos y condiciones</h2>
      <p className="text-sm text-gray-600 whitespace-pre-line">{terms}</p>
    </section>
  )
}

export function PublicQuoteFooter({ token }: { readonly token: string }) {
  return (
    <footer className="text-center space-y-2 py-4">
      <a href={`/api/public/quotes/${token}/pdf`} className="text-sm font-semibold text-[var(--brand-on-light)] hover:underline">
        Descargar PDF
      </a>
      <p className="text-xs text-gray-400">
        Cotización enviada con{' '}
        <Link href="/" className="font-semibold text-orange-600 hover:underline">CotizaPro</Link>
      </p>
    </footer>
  )
}
```

- [ ] **Step 5: Componentes de cliente**

`apps/web/components/public-quote/view-beacon.tsx`:
```tsx
'use client'

import { useEffect } from 'react'

/** Marca la vista desde el navegador: los generadores de vista previa no ejecutan JavaScript. */
export function ViewBeacon({ token }: { readonly token: string }) {
  useEffect(() => {
    // Sin efecto visible si falla: la vista es informativa y no debe interrumpir al cliente.
    fetch(`/api/public/quotes/${token}/view`, { method: 'POST', keepalive: true }).catch(() => undefined)
  }, [token])
  return null
}
```

`apps/web/components/public-quote/respond-panels.tsx`:
```tsx
'use client'

import { useState, type FormEvent } from 'react'

interface PanelProps {
  readonly businessName: string
  readonly sending: boolean
  readonly error: string
  readonly onCancel: () => void
}

const FIELD = 'w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const CANCEL = 'flex-1 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60'
const SUBMIT = 'flex-1 rounded-xl bg-[var(--brand)] py-3 text-sm font-semibold text-[var(--brand-ink)] hover:opacity-90 disabled:opacity-60'

function Buttons({ sending, onCancel, label, busyLabel }: { readonly sending: boolean; readonly onCancel: () => void; readonly label: string; readonly busyLabel: string }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onCancel} disabled={sending} className={CANCEL}>Cancelar</button>
      <button type="submit" disabled={sending} className={SUBMIT}>{sending ? busyLabel : label}</button>
    </div>
  )
}

export function AcceptPanel({ businessName, sending, error, onCancel, onConfirm }: PanelProps & { readonly onConfirm: (name: string | undefined) => void }) {
  const [name, setName] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onConfirm(name.trim() || undefined)
  }
  return (
    <form onSubmit={submit} aria-label="Confirmar aceptación" className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <p className="text-base font-semibold text-gray-900">¿Aceptas la cotización de {businessName}?</p>
      <p className="text-xs text-gray-500">Guardamos la fecha y hora en que la aceptas. No es una firma electrónica.</p>
      <div>
        <label htmlFor="accept-name" className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
        <input id="accept-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" className={FIELD} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Buttons sending={sending} onCancel={onCancel} label="Confirmar aceptación" busyLabel="Aceptando..." />
    </form>
  )
}

export function RejectPanel({ businessName, sending, error, onCancel, onConfirm }: PanelProps & { readonly onConfirm: (reason: string | undefined) => void }) {
  const [reason, setReason] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onConfirm(reason.trim() || undefined)
  }
  return (
    <form onSubmit={submit} aria-label="No me interesa" className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <p className="text-base font-semibold text-gray-900">¿Nos cuentas por qué no te interesa?</p>
      <p className="text-xs text-gray-500">Ayuda a {businessName} a mejorar su propuesta.</p>
      <div>
        <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
        <textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Por ejemplo: el precio, la fecha o ya lo resolví." className={FIELD} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Buttons sending={sending} onCancel={onCancel} label="Enviar respuesta" busyLabel="Enviando..." />
    </form>
  )
}
```

`apps/web/components/public-quote/quote-actions.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useQuoteResponse } from '@/hooks/use-quote-response'
import { AcceptPanel, RejectPanel } from './respond-panels'

interface QuoteActionsProps {
  readonly token: string
  readonly businessName: string
  readonly questionUrl: string | null
}

type OpenPanel = 'none' | 'accept' | 'reject'

const SECONDARY = 'flex items-center justify-center rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50'

export function QuoteActions({ token, businessName, questionUrl }: QuoteActionsProps) {
  const [panel, setPanel] = useState<OpenPanel>('none')
  const { status, error, respond } = useQuoteResponse(token)
  const sending = status !== 'idle'
  const close = () => setPanel('none')

  if (panel === 'accept') {
    return <AcceptPanel businessName={businessName} sending={sending} error={error} onCancel={close} onConfirm={(name) => void respond({ action: 'accept', name })} />
  }
  if (panel === 'reject') {
    return <RejectPanel businessName={businessName} sending={sending} error={error} onCancel={close} onConfirm={(reason) => void respond({ action: 'reject', reason })} />
  }
  return (
    <section className="space-y-2" data-testid="quote-actions">
      <button type="button" onClick={() => setPanel('accept')} className="w-full rounded-xl bg-[var(--brand)] py-3.5 text-base font-semibold text-[var(--brand-ink)] hover:opacity-90">
        Aceptar cotización
      </button>
      <div className={`grid gap-2 ${questionUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {questionUrl && <a href={questionUrl} target="_blank" rel="noopener noreferrer" className={SECONDARY}>Tengo dudas</a>}
        <button type="button" onClick={() => setPanel('reject')} className={SECONDARY}>No me interesa</button>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: La página**

`apps/web/app/c/[token]/page.tsx`:
```tsx
import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { brandCssVars, brandPalette } from '@/lib/branding/color'
import { getPublicQuote } from '@/lib/public-quote/get-public-quote'
import { publicQuoteState, statusBanner } from '@/lib/public-quote/state'
import { quoteQuestionMessage, whatsappLink } from '@/lib/whatsapp/link'
import { PublicQuoteHeader } from '@/components/public-quote/public-quote-header'
import { PublicQuoteItems } from '@/components/public-quote/public-quote-items'
import { DepositCard } from '@/components/public-quote/deposit-card'
import { QuoteStatusBanner } from '@/components/public-quote/quote-status-banner'
import { QuoteActions } from '@/components/public-quote/quote-actions'
import { ViewBeacon } from '@/components/public-quote/view-beacon'
import { PublicQuoteFooter, QuestionLink, TermsSection } from '@/components/public-quote/quote-extras'

interface PageProps {
  readonly params: Promise<{ token: string }>
}

export const metadata: Metadata = { title: 'Cotización', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

function Unavailable() {
  return (
    <main className="min-h-screen bg-gray-50 grid place-items-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900">Liga no disponible</h1>
        <p className="mt-2 text-sm text-gray-500">La liga venció, se reemplazó por una nueva o está incompleta. Pide a quien te cotizó que te la mande otra vez.</p>
      </div>
    </main>
  )
}

export default async function PublicQuotePage({ params }: PageProps) {
  const { token } = await params
  const quote = await getPublicQuote(token)
  if (!quote) return <Unavailable />

  const state = publicQuoteState(quote)
  const banner = statusBanner(quote)
  const questionUrl = whatsappLink(quote.business.phone, quoteQuestionMessage(quote.quote_number, quote.client_first_name))
  const canRespond = state === 'open' && !quote.is_owner_preview
  const showDeposit = quote.deposit.percent > 0 && (state === 'open' || state === 'accepted')
  const brandStyle = brandCssVars(brandPalette(quote.business.brand_color)) as CSSProperties

  return (
    <main className="min-h-screen bg-gray-50" style={brandStyle}>
      {!quote.is_owner_preview && <ViewBeacon token={token} />}
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 space-y-4">
        <PublicQuoteHeader quote={quote} />
        {banner && <QuoteStatusBanner banner={banner} />}
        <PublicQuoteItems quote={quote} />
        {showDeposit && <DepositCard businessName={quote.business.name} total={quote.total} deposit={quote.deposit} />}
        {canRespond && <QuoteActions token={token} businessName={quote.business.name} questionUrl={questionUrl} />}
        {!canRespond && questionUrl && <QuestionLink href={questionUrl} />}
        {quote.terms && <TermsSection terms={quote.terms} />}
        <PublicQuoteFooter token={token} />
      </div>
    </main>
  )
}
```

- [ ] **Step 7: Tipos, lint y verificación real en el navegador**

Run: `cd $REPO/apps/web && pnpm exec tsc --noEmit -p . && pnpm exec eslint app/c components/public-quote hooks/use-quote-response.ts`
Expected: sin errores.

Verificación con herramientas (Playwright MCP o el navegador integrado), sin sesión iniciada:
1. Generar una liga (como en la Tarea 7, Step 6, con la cotización en `sent`) y abrir `$APP/c/$TOKEN` a 375 px de ancho.
2. Comprobar: encabezado con el color de marca y "MEGAGLASS Demo", "Conceptos", total, tarjeta "Anticipo: $… (50 %)" con "El pago lo recibe directamente MEGAGLASS Demo", botones "Aceptar cotización", "Tengo dudas" (href `https://wa.me/…`), "No me interesa", y "Descargar PDF".
3. `psql "$DB" -Atc "select status from quotes where id='$QUOTE'"` → `viewed`.
4. "Aceptar cotización" → escribir en "Tu nombre" → "Confirmar aceptación" → aparece "Cotización aceptada el …" y desaparecen los botones.
5. Abrir `$APP/c/no-es-token` → "Liga no disponible". Revisar en el HTML `<meta name="robots" content="noindex, nofollow">` y en la respuesta `Cache-Control: no-store, max-age=0`.
6. Regresar la cotización de humo a borrador (comando de la Tarea 7).

- [ ] **Step 8: Punto de control (sin commit)**

Entra en el **Commit B**.

---

### Task 9: El envío usa la liga (WhatsApp y correo)

**Files:**
- Create: `apps/web/lib/quotes/send-status.ts`, `apps/web/lib/quotes/send-status.test.ts`
- Modify (reemplazo completo): `apps/web/app/api/quotes/[id]/send/route.ts`

**Interfaces:**
- Consumes: `createQuoteShareLink`, `ServerClient` (Tarea 5); `quoteWhatsappMessage` con `shareUrl`, `buildQuoteEmail` con `acceptUrl` (Tarea 4); `generateQuotePDF(QuotePdfData)` (Tarea 6); `QuotePdfData`.
- Produces:
  - `statusAfterSend(current: string): string`
  - `POST /api/quotes/[id]/send` → `200 { success: true, results: { email: EmailResult | null, whatsapp: { success: true; url: string } | null }, share_url: string }`. Ya no regresa `pdf_url` ni sube nada al bucket `documents`.

- [ ] **Step 1: Prueba de estado al reenviar (falla)**

`apps/web/lib/quotes/send-status.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { statusAfterSend } from './send-status'

describe('statusAfterSend', () => {
  it.each([
    ['draft', 'sent'],
    ['rejected', 'sent'],
    ['expired', 'sent'],
    ['sent', 'sent'],
    ['viewed', 'viewed'],
    ['accepted', 'accepted'],
    ['en_instalacion', 'en_instalacion'],
    ['completado', 'completado'],
    ['cobrado', 'cobrado'],
  ])('al reenviar %s queda %s', (current, expected) => {
    expect(statusAfterSend(current)).toBe(expected)
  })
})
```

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/quotes/send-status.test.ts`
Expected: FAIL, `Failed to resolve import "./send-status"`.

- [ ] **Step 2: Implementar `statusAfterSend`**

`apps/web/lib/quotes/send-status.ts`:
```ts
const REOPENED_ON_SEND: ReadonlySet<string> = new Set(['draft', 'rejected', 'expired'])

/** Al (re)enviar: borrador, rechazada o vencida vuelven a "Enviada"; las demás conservan su avance. */
export function statusAfterSend(current: string): string {
  return REOPENED_ON_SEND.has(current) ? 'sent' : current
}
```

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/quotes/send-status.test.ts`
Expected: PASS.

- [ ] **Step 3: Reescribir la ruta de envío**

Reemplazar todo `apps/web/app/api/quotes/[id]/send/route.ts` por:

```ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendQuoteSchema } from '@/lib/validations/cotizapro'
import { generateQuotePDF } from '@/lib/integrations/pdf'
import { sendEmail, type EmailResult } from '@/lib/integrations/email'
import { buildQuoteEmail } from '@/lib/email/quote-email'
import { safeReplyTo } from '@/lib/email/sender'
import { orgBranding } from '@/lib/branding/org-branding'
import { quoteWhatsappMessage, whatsappLink } from '@/lib/whatsapp/link'
import { createQuoteShareLink, type ServerClient } from '@/lib/quotes/share-link'
import { statusAfterSend } from '@/lib/quotes/send-status'
import { messageLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import type { QuotePdfData } from '@/lib/pdf/quote-pdf-types'

type SendChannel = 'email' | 'whatsapp'

interface SendableQuote extends QuotePdfData {
  readonly id: string
  readonly status: string
  readonly client: QuotePdfData['client'] & { readonly whatsapp_phone: string | null }
}

interface Organization {
  readonly name: string
  readonly settings: unknown
}

interface Recipients {
  readonly email: string | null
  readonly whatsapp: string | null
}

type RecipientsResult = { readonly ok: true; readonly value: Recipients } | { readonly ok: false; readonly error: string }

interface WhatsappResult {
  readonly success: true
  readonly url: string
}

/** Se valida a quién se envía antes de crear la liga: crearla revoca la liga anterior. */
function resolveRecipients(
  sendVia: readonly SendChannel[],
  quote: SendableQuote,
  overrides: { readonly email?: string; readonly whatsapp?: string },
): RecipientsResult {
  const email = sendVia.includes('email') ? overrides.email || quote.client.email || null : null
  if (sendVia.includes('email') && !email) return { ok: false, error: 'El cliente no tiene email y no se proporcionó uno alternativo' }
  const whatsapp = sendVia.includes('whatsapp') ? overrides.whatsapp || quote.client.whatsapp_phone || quote.client.phone || null : null
  if (sendVia.includes('whatsapp') && !whatsappLink(whatsapp, '')) {
    return { ok: false, error: 'El cliente no tiene un WhatsApp válido y no se proporcionó uno alternativo' }
  }
  return { ok: true, value: { email, whatsapp } }
}

async function sendQuoteByEmail(
  supabase: ServerClient,
  quote: SendableQuote,
  organization: Organization | null,
  delivery: { readonly to: string; readonly acceptUrl: string; readonly fallbackReplyTo: string | undefined },
): Promise<EmailResult> {
  const settings = (organization?.settings ?? {}) as Record<string, unknown>
  const branding = orgBranding(organization?.name, settings)
  const content = buildQuoteEmail({
    businessName: branding.name,
    logoUrl: branding.logoUrl,
    palette: branding.palette,
    clientName: quote.client.name,
    quoteNumber: quote.quote_number,
    total: quote.total,
    validUntil: quote.valid_until,
    acceptUrl: delivery.acceptUrl,
    contact: {
      phone: typeof settings.company_phone === 'string' ? settings.company_phone : null,
      email: safeReplyTo(settings.company_email),
      address: typeof settings.company_address === 'string' ? settings.company_address : null,
    },
  })
  const pdfBuffer = await generateQuotePDF(quote)
  const result = await sendEmail({
    to: delivery.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
    fromName: branding.name,
    replyTo: safeReplyTo(settings.company_email) ?? safeReplyTo(delivery.fallbackReplyTo),
    attachments: [{ filename: `${quote.quote_number}.pdf`, content: pdfBuffer }],
  })
  await supabase.from('quote_notifications').insert({
    quote_id: quote.id,
    notification_type: 'email',
    recipient: delivery.to,
    status: result.success ? 'sent' : 'failed',
    provider_message_id: result.messageId,
    error_message: result.error,
  })
  if (!result.success) logger.warn('Email sending failed for quote', { quoteId: quote.id, error: result.error })
  return result
}

async function prepareWhatsapp(
  supabase: ServerClient,
  quote: SendableQuote,
  businessName: string | null,
  delivery: { readonly to: string; readonly shareUrl: string },
): Promise<WhatsappResult | null> {
  const url = whatsappLink(delivery.to, quoteWhatsappMessage({
    clientName: quote.client.name,
    businessName,
    quoteNumber: quote.quote_number,
    total: quote.total,
    validUntil: quote.valid_until,
    shareUrl: delivery.shareUrl,
  }))
  if (!url) return null
  await supabase.from('quote_notifications').insert({ quote_id: quote.id, notification_type: 'whatsapp', recipient: delivery.to, status: 'sent' })
  return { success: true, url }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limitResult = messageLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for quote sending', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }
    const { id } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('POST /api/quotes/[id]/send - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'POST /api/quotes/[id]/send')
    }

    const validation = sendQuoteSchema.safeParse({ ...(await request.json()), quote_id: id })
    if (!validation.success) {
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid send quote data: ${validation.error.issues.map(e => `${e.path.join('.')}: ${e.code}`).join(', ')}`),
        'POST /api/quotes/[id]/send - validation'
      )
    }
    const { send_via, email_override, whatsapp_override } = validation.data

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`*, items:quote_items(*), client:clients(*), organization:organizations(name, settings)`)
      .eq('id', id)
      .single()
    if (quoteError || !quote) {
      logger.error('Error fetching quote for sending', quoteError, { quoteId: id })
      return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'POST /api/quotes/[id]/send')
    }

    const recipients = resolveRecipients(send_via, quote, { email: email_override, whatsapp: whatsapp_override })
    if (!recipients.ok) return NextResponse.json({ error: recipients.error }, { status: 400 })

    const share = await createQuoteShareLink(supabase, id, request.nextUrl.origin)
    if (!share.ok) return NextResponse.json({ error: share.error }, { status: share.status })

    const organization = quote.organization as unknown as Organization | null
    const { email: emailTo, whatsapp: whatsappTo } = recipients.value
    const email = emailTo ? await sendQuoteByEmail(supabase, quote, organization, { to: emailTo, acceptUrl: share.url, fallbackReplyTo: user.email }) : null
    if (email && !email.success && !whatsappTo) {
      return NextResponse.json({ error: `No se pudo enviar el correo: ${email.error ?? 'error desconocido'}` }, { status: 502 })
    }
    const whatsapp = whatsappTo ? await prepareWhatsapp(supabase, quote, organization?.name ?? null, { to: whatsappTo, shareUrl: share.url }) : null

    await supabase
      .from('quotes')
      .update({ status: statusAfterSend(quote.status), sent_at: new Date().toISOString(), sent_via: send_via })
      .eq('id', id)

    logger.api('POST', `/api/quotes/${id}/send`, 200, 0, { quoteId: id, sentVia: send_via })
    return NextResponse.json({ success: true, results: { email, whatsapp }, share_url: share.url })
  } catch (error) {
    logger.error('Unexpected error in POST /api/quotes/[id]/send', error)
    return handleApiError(ApiErrors.INTERNAL_ERROR('Failed to send quote'), 'POST /api/quotes/[id]/send - unhandled exception')
  }
}
```

Nota: el manejador `POST` queda en ~50 líneas porque conserva el flujo original (autenticación, validación y consulta); la lógica nueva vive en las tres funciones auxiliares.

- [ ] **Step 4: Tipos y humo**

Run:
```bash
cd $REPO/apps/web && pnpm exec vitest run lib/quotes && pnpm exec tsc --noEmit -p .
curl -s -X POST -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' -d '{"send_via":["whatsapp"],"whatsapp_override":"8112345678"}' $APP/api/quotes/$QUOTE/send | node -pe 'const b=JSON.parse(require("fs").readFileSync(0,"utf8")); [b.share_url, decodeURIComponent(b.results.whatsapp.url)].join("\n")'
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' -d '{"send_via":["whatsapp"],"whatsapp_override":"12345"}' $APP/api/quotes/$QUOTE/send
psql "$DB" -Atc "select count(*) from quote_shares where quote_id='$QUOTE' and revoked_at is null"
grep -n "documents" app/api/quotes/\[id\]/send/route.ts
```
Expected: PASS y `tsc` limpio; la liga `…/c/<64 hex>` y el mensaje con "Revísala y acéptala aquí: …/c/…"; `400` con un número inválido; el conteo de ligas activas sigue en `1` (el `400` sale antes de crear la liga, así que no revoca la anterior); `grep` sin resultados (ya no se usa el bucket `documents`).

- [ ] **Step 5: Commit B (solo con aprobación del usuario)**

Correr el conjunto completo antes de pedir aprobación:
```bash
cd $REPO/apps/web && pnpm exec vitest run && pnpm exec tsc --noEmit -p .
```
Expected: todo en verde.

Mostrar al usuario `git status` y `git diff --stat`, ejecutar la skill `verify` y esperar un "sí" explícito. Solo entonces:
```bash
git add packages/auth/src/public-routes.ts apps/web/lib/auth/public-routes.test.ts \
  apps/web/lib/deposit/amount.ts apps/web/lib/deposit/amount.test.ts apps/web/lib/deposit/override.ts apps/web/lib/deposit/override.test.ts \
  apps/web/lib/public-quote apps/web/lib/pdf/quote-pdf-types.ts apps/web/lib/pdf/QuotePDF.tsx apps/web/lib/integrations/pdf.tsx \
  apps/web/lib/whatsapp/link.ts apps/web/lib/whatsapp/link.test.ts apps/web/lib/email/quote-email.ts apps/web/lib/email/quote-email.test.ts \
  apps/web/lib/quotes/share-link.ts apps/web/lib/quotes/send-status.ts apps/web/lib/quotes/send-status.test.ts \
  apps/web/lib/validations/public-quote.ts apps/web/lib/validations/public-quote.test.ts \
  "apps/web/app/api/quotes/[id]/share/route.ts" "apps/web/app/api/quotes/[id]/send/route.ts" \
  "apps/web/app/api/public/quotes" "apps/web/app/c" apps/web/components/public-quote apps/web/hooks/use-quote-response.ts
git commit -m "feat: página pública de cotización con aceptar y anticipo"
```

---

### Task 10: Diálogo de envío con "Copiar" y "Revocar liga"

**Files:**
- Create: `apps/web/hooks/use-quote-share-link.ts`
- Create: `apps/web/components/dashboard/quote-share-link-panel.tsx`
- Modify: `apps/web/components/dashboard/quote-share-dialog.tsx`

**Interfaces:**
- Consumes: `GET/POST/DELETE /api/quotes/[id]/share` (Tarea 5); `share_url` de `POST /api/quotes/[id]/send` (Tarea 9); `formatDateOnly`, `formatDateTime` (Tarea 2).
- Produces:
  - `interface ActiveShare { expires_at: string; first_viewed_at: string | null; created_at: string }`
  - `useQuoteShareLink(quoteId: string, freshUrl: string | null): { active; url; action: 'idle' | 'loading' | 'generating' | 'revoking'; error; copied; generate(); revoke(); copy() }`
  - `<QuoteShareLinkPanel quoteId freshUrl />` con `data-testid="share-link-panel"` y `data-testid="share-link-url"`.

- [ ] **Step 1: Hook**

`apps/web/hooks/use-quote-share-link.ts`:
```ts
'use client'

import { useCallback, useEffect, useState } from 'react'

export interface ActiveShare {
  readonly expires_at: string
  readonly first_viewed_at: string | null
  readonly created_at: string
}

export type ShareLinkAction = 'idle' | 'loading' | 'generating' | 'revoking'

async function fetchActiveShare(quoteId: string): Promise<ActiveShare | null> {
  const res = await fetch(`/api/quotes/${quoteId}/share`)
  const body: { data?: ActiveShare | null; error?: string } = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? 'No se pudo consultar la liga')
  return body.data ?? null
}

/** El token solo existe al crearlo: después solo se sabe que hay una liga activa y cuándo vence. */
export function useQuoteShareLink(quoteId: string, freshUrl: string | null) {
  const [active, setActive] = useState<ActiveShare | null>(null)
  const [url, setUrl] = useState<string | null>(freshUrl)
  const [action, setAction] = useState<ShareLinkAction>('loading')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const run = useCallback(async (kind: ShareLinkAction, task: () => Promise<void>) => {
    setAction(kind)
    setError('')
    try {
      await task()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal. Intenta de nuevo.')
    } finally {
      setAction('idle')
    }
  }, [])

  useEffect(() => {
    void run('loading', async () => setActive(await fetchActiveShare(quoteId)))
  }, [quoteId, run])

  const generate = useCallback(() => run('generating', async () => {
    const res = await fetch(`/api/quotes/${quoteId}/share`, { method: 'POST' })
    const body: { data?: { url: string }; error?: string } = await res.json().catch(() => ({}))
    if (!res.ok || !body.data) throw new Error(body.error ?? 'No se pudo generar la liga')
    setUrl(body.data.url)
    setCopied(false)
    setActive(await fetchActiveShare(quoteId))
  }), [quoteId, run])

  const revoke = useCallback(() => {
    if (!window.confirm('¿Revocar la liga? Tu cliente ya no podrá abrirla.')) return Promise.resolve()
    return run('revoking', async () => {
      const res = await fetch(`/api/quotes/${quoteId}/share`, { method: 'DELETE' })
      const body: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'No se pudo revocar la liga')
      setUrl(null)
      setActive(null)
    })
  }, [quoteId, run])

  const copy = useCallback(async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setError('No se pudo copiar. Selecciona la liga y cópiala a mano.')
    }
  }, [url])

  return { active, url, action, error, copied, generate, revoke, copy }
}
```

- [ ] **Step 2: Panel**

`apps/web/components/dashboard/quote-share-link-panel.tsx`:
```tsx
'use client'

import { Copy, Link2, Loader2, RefreshCw, ShieldOff } from 'lucide-react'
import { useQuoteShareLink, type ActiveShare } from '@/hooks/use-quote-share-link'
import { formatDateOnly, formatDateTime } from '@/lib/public-quote/format'

interface QuoteShareLinkPanelProps {
  readonly quoteId: string
  readonly freshUrl: string | null
}

const BUTTON = 'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60'
const DANGER = 'inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60'

function describe(active: ActiveShare | null): string {
  if (!active) return 'Aún no hay liga activa. Se crea al enviar, o genérala aquí para copiarla.'
  const viewed = active.first_viewed_at ? ` Tu cliente la abrió el ${formatDateTime(active.first_viewed_at)}.` : ''
  return `Hay una liga activa que vence el ${formatDateOnly(active.expires_at)}. Por seguridad solo se muestra al crearla.${viewed}`
}

export function QuoteShareLinkPanel({ quoteId, freshUrl }: QuoteShareLinkPanelProps) {
  const link = useQuoteShareLink(quoteId, freshUrl)
  const busy = link.action !== 'idle'
  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3" data-testid="share-link-panel">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-orange-500" aria-hidden />
        <p className="text-sm font-medium text-gray-900 dark:text-white">Liga para ver y aceptar</p>
        {link.action === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" aria-hidden />}
      </div>
      {link.url ? (
        <input
          readOnly
          value={link.url}
          aria-label="Liga de la cotización"
          onFocus={(e) => e.currentTarget.select()}
          data-testid="share-link-url"
          className="w-full px-3 py-2 text-xs font-mono border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">{describe(link.active)}</p>
      )}
      {link.error && <p role="alert" className="text-xs text-red-600">{link.error}</p>}
      <div className="flex flex-wrap gap-2">
        {link.url ? (
          <button type="button" onClick={() => void link.copy()} className={BUTTON}>
            <Copy className="w-3.5 h-3.5" aria-hidden /> {link.copied ? 'Liga copiada' : 'Copiar'}
          </button>
        ) : (
          <button type="button" onClick={() => void link.generate()} disabled={busy} className={BUTTON}>
            <RefreshCw className="w-3.5 h-3.5" aria-hidden />
            {link.action === 'generating' ? 'Generando...' : link.active ? 'Generar liga nueva' : 'Generar liga'}
          </button>
        )}
        {(link.url || link.active) && (
          <button type="button" onClick={() => void link.revoke()} disabled={busy} className={DANGER}>
            <ShieldOff className="w-3.5 h-3.5" aria-hidden /> {link.action === 'revoking' ? 'Revocando...' : 'Revocar liga'}
          </button>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Integrar en el diálogo**

En `apps/web/components/dashboard/quote-share-dialog.tsx`:

1. Importar el panel debajo de las importaciones existentes:
```tsx
import { QuoteShareLinkPanel } from '@/components/dashboard/quote-share-link-panel'
```
2. Agregar el estado junto a `whatsappUrl`:
```tsx
  const [shareUrl, setShareUrl] = useState<string | null>(null)
```
3. En el `useEffect` de apertura, junto a `setWhatsappUrl(null)`:
```tsx
    setShareUrl(null)
```
4. En `handleSend`, justo antes de `onSent?.()`:
```tsx
      setShareUrl(typeof json.share_url === 'string' ? json.share_url : null)
```
5. Reemplazar el texto de ayuda de WhatsApp:
```tsx
              <p className="text-xs text-gray-500 dark:text-gray-400">Se abre tu WhatsApp con el mensaje y la liga para que tu cliente revise y acepte la cotización.</p>
```
6. Inmediatamente después del `</div>` que cierra el bloque `{/* Method toggles */}`, insertar:
```tsx
          <QuoteShareLinkPanel key={shareUrl ?? 'sin-liga'} quoteId={quoteId} freshUrl={shareUrl} />
```
7. Reemplazar el texto del aviso verde:
```tsx
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Mensaje listo con la liga de la cotización. Ábrelo en WhatsApp para enviarlo.</p>
```
8. Corregir acentos existentes: `'Error de conexion al enviar'` → `'Error de conexión al enviar'` y `Historial de envios` → `Historial de envíos`.

(La `key` vuelve a montar el panel cuando llega una liga nueva del envío, así el panel no arrastra el estado anterior.)

- [ ] **Step 4: Tipos, lint y verificación en el navegador**

Run: `cd $REPO/apps/web && pnpm exec tsc --noEmit -p . && pnpm exec eslint components/dashboard hooks/use-quote-share-link.ts && wc -l components/dashboard/quote-share-dialog.tsx`
Expected: sin errores; el diálogo queda por debajo de 400 líneas.

Con sesión del propietario demo en el navegador (Playwright MCP): abrir una cotización → "Enviar" → el panel dice "Aún no hay liga activa…" → "Generar liga" muestra `…/c/<64 hex>` → "Copiar" cambia a "Liga copiada" → "Revocar liga" (aceptar el confirm) → vuelve a "Aún no hay liga activa…". Elegir WhatsApp → "Enviar" → aparece la liga nueva en el panel y "Abrir WhatsApp".

- [ ] **Step 5: Punto de control (sin commit)**

Entra en el **Commit C**.

---

### Task 11: Configuración → Empresa: sección "Anticipo"

**Files:**
- Modify: `apps/web/lib/validations/settings.ts`
- Create: `apps/web/lib/validations/settings.test.ts`
- Create: `apps/web/lib/deposit/settings-form.ts`, `apps/web/lib/deposit/settings-form.test.ts`
- Modify: `apps/web/app/api/settings/organization/route.ts`
- Create: `apps/web/components/settings/deposit-settings.tsx`
- Modify: `apps/web/app/(dashboard)/dashboard/settings/page.tsx`

**Interfaces:**
- Consumes: `DEFAULT_DEPOSIT_PERCENT` (Tarea 2); `update_org_settings` con claves de anticipo y errores `invalid_deposit_*` (Tarea 1); `validationErrorResponse`.
- Produces:
  - `updateOrganizationSchema` con `deposit_percent?: number` (entero 0-100), `deposit_instructions?: string | null` (≤ 500), `deposit_payment_url?: string | null` (http/https, ≤ 500)
  - `interface DepositSettingsPayload { deposit_percent: number; deposit_instructions: string | null; deposit_payment_url: string | null }`; `depositSettingsFromForm(form: FormData): DepositSettingsPayload`
  - `<DepositSettings initialPercent initialInstructions initialPaymentUrl />` con campos `deposit_percent`, `deposit_payment_url`, `deposit_instructions`.

- [ ] **Step 1: Pruebas (fallan)**

`apps/web/lib/validations/settings.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { updateOrganizationSchema } from './settings'

const base = { name: 'MEGAGLASS' }

describe('updateOrganizationSchema · anticipo', () => {
  it('acepta porcentaje, instrucciones y liga https', () => {
    const parsed = updateOrganizationSchema.parse({ ...base, deposit_percent: 30, deposit_instructions: '  CLABE 012  ', deposit_payment_url: 'https://mpago.la/2abc' })
    expect(parsed.deposit_percent).toBe(30)
    expect(parsed.deposit_instructions).toBe('CLABE 012')
  })

  it.each([150, -1, 33.5])('rechaza porcentaje %s', (deposit_percent) => {
    expect(updateOrganizationSchema.safeParse({ ...base, deposit_percent }).success).toBe(false)
  })

  it.each(['javascript:alert(1)', 'mpago.la/abc', `https://x.mx/${'a'.repeat(500)}`])('rechaza la liga %s', (deposit_payment_url) => {
    expect(updateOrganizationSchema.safeParse({ ...base, deposit_payment_url }).success).toBe(false)
  })

  it('rechaza instrucciones de más de 500 caracteres', () => {
    expect(updateOrganizationSchema.safeParse({ ...base, deposit_instructions: 'x'.repeat(501) }).success).toBe(false)
  })

  it('permite quitar instrucciones y liga con null', () => {
    expect(updateOrganizationSchema.safeParse({ ...base, deposit_instructions: null, deposit_payment_url: null }).success).toBe(true)
  })
})
```

`apps/web/lib/deposit/settings-form.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { depositSettingsFromForm } from './settings-form'

function form(entries: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.append(key, value)
  return data
}

describe('depositSettingsFromForm', () => {
  it('convierte el porcentaje y recorta los textos', () => {
    expect(depositSettingsFromForm(form({ deposit_percent: '30', deposit_instructions: '  CLABE 012 ', deposit_payment_url: ' https://mpago.la/x ' }))).toEqual({
      deposit_percent: 30, deposit_instructions: 'CLABE 012', deposit_payment_url: 'https://mpago.la/x',
    })
  })

  it('sin porcentaje usa 50 y los textos vacíos quedan en null', () => {
    expect(depositSettingsFromForm(form({ deposit_percent: '', deposit_instructions: '  ', deposit_payment_url: '' }))).toEqual({
      deposit_percent: 50, deposit_instructions: null, deposit_payment_url: null,
    })
  })
})
```

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/validations/settings.test.ts lib/deposit/settings-form.test.ts`
Expected: FAIL (el esquema ignora `deposit_percent: 150` y lo acepta; `./settings-form` no existe).

- [ ] **Step 2: Esquema**

En `apps/web/lib/validations/settings.ts`, dentro de `updateOrganizationSchema`, después de `brand_color`:
```ts
  deposit_percent: z.number()
    .int('El anticipo debe ser un número entero')
    .min(0, 'El anticipo no puede ser negativo')
    .max(100, 'El anticipo no puede pasar de 100 %')
    .optional(),
  deposit_instructions: z.string().trim().max(500, 'Las instrucciones de pago pueden tener hasta 500 caracteres').nullable().optional(),
  deposit_payment_url: z.string()
    .trim()
    .max(500, 'La liga de pago es muy larga')
    .regex(/^https?:\/\/[^\s"<>]+$/i, 'La liga de pago debe empezar con https://')
    .nullable()
    .optional(),
```

- [ ] **Step 3: Lectura del formulario**

`apps/web/lib/deposit/settings-form.ts`:
```ts
import { DEFAULT_DEPOSIT_PERCENT } from './amount'

export interface DepositSettingsPayload {
  readonly deposit_percent: number
  readonly deposit_instructions: string | null
  readonly deposit_payment_url: string | null
}

function optionalText(form: FormData, key: string): string | null {
  const value = form.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/** Un porcentaje inválido se manda tal cual (NaN viaja como null) para que la API lo rechace con su mensaje. */
export function depositSettingsFromForm(form: FormData): DepositSettingsPayload {
  const rawPercent = String(form.get('deposit_percent') ?? '').trim()
  return {
    deposit_percent: rawPercent === '' ? DEFAULT_DEPOSIT_PERCENT : Number(rawPercent),
    deposit_instructions: optionalText(form, 'deposit_instructions'),
    deposit_payment_url: optionalText(form, 'deposit_payment_url'),
  }
}
```

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/validations/settings.test.ts lib/deposit/settings-form.test.ts`
Expected: PASS.

- [ ] **Step 4: Ruta de la API**

En `apps/web/app/api/settings/organization/route.ts`:

1. Importar `validationErrorResponse`:
```ts
import { handleApiError, ApiErrors, validationErrorResponse } from '@/lib/error-handler'
```
2. Arriba de `export async function PATCH`, agregar:
```ts
const DEPOSIT_ERRORS: Readonly<Record<string, string>> = {
  invalid_deposit_percent: 'El anticipo debe ser un número entero de 0 a 100.',
  invalid_deposit_instructions: 'Las instrucciones de pago pueden tener hasta 500 caracteres.',
  invalid_deposit_payment_url: 'La liga de pago debe empezar con https://',
}
```
3. Reemplazar el bloque `if (!validation.success) { … }` por:
```ts
    if (!validation.success) {
      logger.warn('Organization update validation failed', { errors: validation.error.issues.length })
      return validationErrorResponse(validation.error)
    }
```
4. Agregar `deposit_percent, deposit_instructions, deposit_payment_url,` a la desestructuración de `validation.data`, y al objeto `settings`:
```ts
      ...(deposit_percent !== undefined && { deposit_percent }),
      ...(deposit_instructions !== undefined && { deposit_instructions }),
      ...(deposit_payment_url !== undefined && { deposit_payment_url }),
```
5. Al inicio del bloque `if (error) {` que sigue a la llamada `rpc('update_org_settings', …)`:
```ts
      const depositError = DEPOSIT_ERRORS[error.message]
      if (depositError) return NextResponse.json({ error: depositError }, { status: 400 })
```

- [ ] **Step 5: Componente y página**

`apps/web/components/settings/deposit-settings.tsx`:
```tsx
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { DEFAULT_DEPOSIT_PERCENT } from '@/lib/deposit/amount'

interface DepositSettingsProps {
  readonly initialPercent: number | null
  readonly initialInstructions: string | null
  readonly initialPaymentUrl: string | null
}

/** Campos del anticipo; viajan con el formulario de la empresa (mismo patrón que BrandSettings). */
export function DepositSettings({ initialPercent, initialInstructions, initialPaymentUrl }: DepositSettingsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <FormField label="Anticipo (%)" htmlFor="deposit_percent" required hint="Se pide al aceptar la cotización. Pon 0 si no pides anticipo.">
        <Input id="deposit_percent" name="deposit_percent" type="number" min="0" max="100" step="1" required defaultValue={initialPercent ?? DEFAULT_DEPOSIT_PERCENT} />
      </FormField>
      <FormField label="Liga de pago" htmlFor="deposit_payment_url" hint="Mercado Pago u otra. Tu cliente la abre con el botón «Pagar anticipo».">
        <Input id="deposit_payment_url" name="deposit_payment_url" type="url" maxLength={500} placeholder="https://mpago.la/..." defaultValue={initialPaymentUrl ?? ''} />
      </FormField>
      <FormField label="Instrucciones de pago" htmlFor="deposit_instructions" className="md:col-span-2" hint="Banco, CLABE y a nombre de quién. Hasta 500 caracteres.">
        <Textarea id="deposit_instructions" name="deposit_instructions" rows={3} maxLength={500} placeholder="Transferencia a BBVA, CLABE 0121 8000 1234 5678 90, a nombre de ..." defaultValue={initialInstructions ?? ''} />
      </FormField>
    </div>
  )
}
```

En `apps/web/app/(dashboard)/dashboard/settings/page.tsx`:

1. Importaciones:
```tsx
import { DepositSettings } from '@/components/settings/deposit-settings'
import { depositSettingsFromForm } from '@/lib/deposit/settings-form'
```
2. En `interface Organization`, dentro de `settings`, después de `brand_color?: string`:
```tsx
    deposit_percent?: number
    deposit_instructions?: string
    deposit_payment_url?: string
```
3. En `handleOrganizationSubmit`, en el objeto `data`, después de `brand_color: rawBrandColor || null,`:
```tsx
      ...depositSettingsFromForm(formData),
```
4. Después del `FormField` de "Términos y Condiciones" (antes del `div` con el botón Guardar):
```tsx
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Anticipo</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Tu cliente lo ve al abrir la liga de la cotización. El pago lo recibes tú directamente.</p>
              <DepositSettings
                initialPercent={organization.settings?.deposit_percent ?? null}
                initialInstructions={organization.settings?.deposit_instructions ?? null}
                initialPaymentUrl={organization.settings?.deposit_payment_url ?? null}
              />
            </div>
```

- [ ] **Step 6: Tipos y verificación en el navegador**

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/validations lib/deposit && pnpm exec tsc --noEmit -p .`
Expected: PASS; `tsc` limpio.

En el navegador con el propietario demo: Configuración → Empresa → la sección "Anticipo" muestra 50, "Liga de pago" e "Instrucciones de pago". Guardar 30 % y `https://mpago.la/prueba` → toast de éxito; `psql "$DB" -Atc "select settings->'deposit_percent', settings->>'deposit_payment_url' from organizations where slug='megaglass-demo'"` → `30|https://mpago.la/prueba`. Abrir una liga de la Tarea 8 → "Anticipo: $… (30 %)" y "Pagar anticipo". Regresar la configuración a 50 y vaciar la liga.

- [ ] **Step 7: Punto de control (sin commit)**

Entra en el **Commit C**.

---

### Task 12: Detalle de la cotización: respuesta del cliente y anticipo por cotización

**Files:**
- Modify: `apps/web/lib/validations/cotizapro.ts`
- Create: `apps/web/lib/validations/quote-deposit.test.ts`
- Create: `apps/web/components/quotes/client-response-card.tsx`
- Modify: `apps/web/app/(dashboard)/dashboard/quotes/[id]/page.tsx`

**Interfaces:**
- Consumes: `clientActivityLines`, `ClientActivity` (Tarea 3); `parseDepositOverride` (Tarea 2); `PATCH /api/quotes/[id]` (existente; pasa `updateData` tal cual).
- Produces:
  - `updateQuoteSchema.deposit_percent?: number | null` (entero 0-100)
  - `<ClientResponseCard quote onSaved />` con `data-testid="client-response-card"`; `interface ClientResponseQuote extends ClientActivity { id: string; status: string; deposit_percent: number | null }`

- [ ] **Step 1: Prueba del esquema (falla)**

`apps/web/lib/validations/quote-deposit.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { updateQuoteSchema } from './cotizapro'

describe('updateQuoteSchema · deposit_percent', () => {
  it.each([0, 30, 100, null])('acepta %s', (deposit_percent) => {
    expect(updateQuoteSchema.parse({ deposit_percent })).toEqual({ deposit_percent })
  })

  it.each([101, -1, 12.5])('rechaza %s', (deposit_percent) => {
    expect(updateQuoteSchema.safeParse({ deposit_percent }).success).toBe(false)
  })
})
```

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/validations/quote-deposit.test.ts`
Expected: FAIL (`deposit_percent` no está en el esquema y se descarta: `{}` ≠ `{ deposit_percent: 0 }`).

- [ ] **Step 2: Esquema**

En `apps/web/lib/validations/cotizapro.ts`, dentro de `updateQuoteSchema`, después de `status: quoteStatusSchema.optional(),`:
```ts
  deposit_percent: z.number()
    .int('El anticipo debe ser un número entero')
    .min(0, 'El anticipo no puede ser negativo')
    .max(100, 'El anticipo no puede pasar de 100 %')
    .nullable()
    .optional(),
```

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/validations/quote-deposit.test.ts`
Expected: PASS.

- [ ] **Step 3: Tarjeta**

`apps/web/components/quotes/client-response-card.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Eye, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { useToast } from '@/components/ui/toast'
import { clientActivityLines, type ClientActivity } from '@/lib/public-quote/activity'
import { parseDepositOverride } from '@/lib/deposit/override'

export interface ClientResponseQuote extends ClientActivity {
  readonly id: string
  readonly status: string
  readonly deposit_percent: number | null
}

interface ClientResponseCardProps {
  readonly quote: ClientResponseQuote
  readonly onSaved: () => void
}

function emptyText(status: string): string {
  return status === 'draft'
    ? 'Envía la cotización para que tu cliente la revise y la acepte desde su celular.'
    : 'Tu cliente todavía no abre la liga.'
}

export function ClientResponseCard({ quote, onSaved }: ClientResponseCardProps) {
  const { toast } = useToast()
  const [percent, setPercent] = useState(quote.deposit_percent === null ? '' : String(quote.deposit_percent))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const lines = clientActivityLines(quote)

  async function save() {
    const parsed = parseDepositOverride(percent)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deposit_percent: parsed.value }),
      })
      if (!res.ok) throw new Error('No se pudo guardar el anticipo')
      toast({ message: 'Anticipo actualizado', variant: 'success' })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el anticipo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section data-testid="client-response-card" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
        <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Respuesta del cliente</span>
      </div>
      <div className="p-4 space-y-4">
        {lines.length > 0 ? (
          <ul className="space-y-1">
            {lines.map((line) => <li key={line} className="text-sm text-gray-700 dark:text-gray-300">{line}</li>)}
          </ul>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">{emptyText(quote.status)}</p>
        )}
        <div className="flex items-end gap-2">
          <FormField label="Anticipo de esta cotización (%)" htmlFor="quote_deposit_percent" hint="Vacío: usa el porcentaje de Configuración → Empresa." error={error || undefined} className="flex-1">
            <Input id="quote_deposit_percent" type="number" min="0" max="100" step="1" inputMode="numeric" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="Igual que la empresa" hasError={Boolean(error)} />
          </FormField>
          <Button type="button" size="sm" onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white mb-6">
            <Save className="w-3.5 h-3.5 mr-1" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Integrar en el detalle**

En `apps/web/app/(dashboard)/dashboard/quotes/[id]/page.tsx`:

1. Importación:
```tsx
import { ClientResponseCard } from '@/components/quotes/client-response-card'
```
2. En `interface Quote`, después de `created_at: string`:
```tsx
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  accepted_by_name: string | null
  deposit_percent: number | null
```
3. Justo antes de `{/* Payments */}`:
```tsx
      <ClientResponseCard quote={quote} onSaved={handleRefreshQuote} />
```
4. En "Acciones", reemplazar `{quote.status === 'sent' && (` por:
```tsx
                {(quote.status === 'sent' || quote.status === 'viewed') && (
```
(La API ya permite `viewed → accepted | rejected`; antes la pantalla solo mostraba los botones en `sent`.)

- [ ] **Step 5: Tipos y verificación en el navegador**

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/validations && pnpm exec tsc --noEmit -p .`
Expected: PASS; `tsc` limpio.

En el navegador con el propietario demo: abrir la cotización aceptada en la Tarea 8 → la tarjeta "Respuesta del cliente" muestra "Vista por el cliente el …" y "Aceptada desde la liga el … por …". Escribir `0` → "Guardar" → toast "Anticipo actualizado"; `psql "$DB" -Atc "select deposit_percent from quotes where id='$QUOTE'"` → `0`. Escribir `150` → aparece "Usa un número entero de 0 a 100" con borde rojo y no se envía nada.

- [ ] **Step 6: Punto de control (sin commit)**

Entra en el **Commit C**.

---

### Task 13: Avisos de respuesta en la campana

**Files:**
- Create: `apps/web/lib/notifications/types.ts`
- Create: `apps/web/lib/notifications/quote-notification-item.ts`, `apps/web/lib/notifications/quote-notification-item.test.ts`
- Modify (reemplazo completo): `apps/web/app/api/notifications/route.ts`
- Modify: `apps/web/app/api/quotes/[id]/notifications/route.ts`
- Modify: `apps/web/types/database.types.ts`

**Interfaces:**
- Consumes: filas de `quote_notifications` con `client_accepted` / `client_rejected` (Tarea 1); la campana (`components/dashboard/notification-bell.tsx`) ya escucha `quote_notifications` por Realtime y marca leídas con `PATCH /api/notifications/[id]` tipo `send`.
- Produces:
  - `interface BellItem { id; type: 'reminder' | 'send'; title; subtitle; date; priority; read; href }`
  - `interface QuoteNotificationRow { id; quote_id: string | null; notification_type; recipient; status; sent_at; quotes: { quote_number?: string } | null }`
  - `quoteNotificationItem(row: QuoteNotificationRow): BellItem`
  - `GET /api/notifications` → `unread_count` = recordatorios + respuestas de clientes sin leer.

- [ ] **Step 1: Prueba (falla)**

`apps/web/lib/notifications/quote-notification-item.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { quoteNotificationItem, type QuoteNotificationRow } from './quote-notification-item'

const row: QuoteNotificationRow = {
  id: 'n1',
  quote_id: 'q1',
  notification_type: 'client_accepted',
  recipient: 'Laura Pérez',
  status: 'sent',
  sent_at: '2026-10-14T16:00:00Z',
  quotes: { quote_number: 'COT-2026-0007' },
}

describe('quoteNotificationItem', () => {
  it('respuesta de aceptación sin leer y prioritaria', () => {
    expect(quoteNotificationItem(row)).toEqual({
      id: 'n1', type: 'send', title: 'Tu cliente aceptó la cotización', subtitle: 'COT-2026-0007 · Laura Pérez',
      date: '2026-10-14T16:00:00Z', priority: 'high', read: false, href: '/dashboard/quotes/q1',
    })
  })

  it('rechazo leído', () => {
    const item = quoteNotificationItem({ ...row, notification_type: 'client_rejected', status: 'read' })
    expect(item.title).toBe('Tu cliente rechazó la cotización')
    expect(item.read).toBe(true)
    expect(item.priority).toBe('normal')
  })

  it('envíos de correo y WhatsApp conservan su texto y cuentan como leídos', () => {
    expect(quoteNotificationItem({ ...row, notification_type: 'email', status: 'failed' })).toMatchObject({ title: 'Email fallido', subtitle: 'COT-2026-0007', priority: 'high', read: true })
    expect(quoteNotificationItem({ ...row, notification_type: 'whatsapp' }).title).toBe('WhatsApp enviado')
  })
})
```

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/notifications`
Expected: FAIL, `Failed to resolve import "./quote-notification-item"`.

- [ ] **Step 2: Implementar**

`apps/web/lib/notifications/types.ts`:
```ts
export interface BellItem {
  readonly id: string
  readonly type: 'reminder' | 'send'
  readonly title: string
  readonly subtitle: string
  readonly date: string
  readonly priority: string
  readonly read: boolean
  readonly href: string
}
```

`apps/web/lib/notifications/quote-notification-item.ts`:
```ts
import type { BellItem } from './types'

export interface QuoteNotificationRow {
  readonly id: string
  readonly quote_id: string | null
  readonly notification_type: string
  readonly recipient: string
  readonly status: string
  readonly sent_at: string
  readonly quotes: { readonly quote_number?: string } | null
}

const CLIENT_RESPONSE_TITLES: Readonly<Record<string, string>> = {
  client_accepted: 'Tu cliente aceptó la cotización',
  client_rejected: 'Tu cliente rechazó la cotización',
}

function sendTitle(row: QuoteNotificationRow): string {
  const channel = row.notification_type === 'email' ? 'Email' : 'WhatsApp'
  const state = row.status === 'sent' ? 'enviado' : row.status === 'failed' ? 'fallido' : row.status
  return `${channel} ${state}`
}

export function quoteNotificationItem(row: QuoteNotificationRow): BellItem {
  const quoteNumber = row.quotes?.quote_number ?? ''
  const base = { id: row.id, type: 'send' as const, date: row.sent_at, href: row.quote_id ? `/dashboard/quotes/${row.quote_id}` : '#' }
  const clientTitle = CLIENT_RESPONSE_TITLES[row.notification_type]
  if (clientTitle) {
    return {
      ...base,
      title: clientTitle,
      subtitle: [quoteNumber, row.recipient].filter(Boolean).join(' · '),
      priority: row.notification_type === 'client_accepted' ? 'high' : 'normal',
      read: row.status === 'read',
    }
  }
  return { ...base, title: sendTitle(row), subtitle: quoteNumber, priority: row.status === 'failed' ? 'high' : 'normal', read: true }
}
```

Reemplazar `apps/web/app/api/notifications/route.ts` por:
```ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { quoteNotificationItem, type QuoteNotificationRow } from '@/lib/notifications/quote-notification-item'
import type { BellItem } from '@/lib/notifications/types'

interface ReminderRow {
  readonly id: string
  readonly title: string
  readonly scheduled_date: string
  readonly priority: string
  readonly clients: { readonly name?: string } | null
}

function reminderItem(r: ReminderRow): BellItem {
  return {
    id: r.id, type: 'reminder', title: r.title, subtitle: r.clients?.name ?? '', date: r.scheduled_date,
    priority: r.priority, read: false, href: `/dashboard/reminders/${r.id}`,
  }
}

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/notifications')

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
    if (!profile) return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/notifications')

    const orgId = profile.organization_id
    const today = new Date().toISOString().split('T')[0]
    const [remindersResult, notificationsResult] = await Promise.all([
      supabase
        .from('follow_up_reminders')
        .select('id, title, scheduled_date, priority, status, client_id, clients(name)')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .lte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(20),
      supabase
        .from('quote_notifications')
        .select('id, quote_id, notification_type, recipient, status, sent_at, quotes(quote_number)')
        .eq('quotes.organization_id', orgId)
        .order('sent_at', { ascending: false })
        .limit(10),
    ])

    const reminders = (remindersResult.data ?? []).map((r: ReminderRow) => reminderItem(r))
    const sends = (notificationsResult.data ?? []).map((n: QuoteNotificationRow) => quoteNotificationItem(n))
    const items = [...reminders, ...sends]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15)
    const unreadCount = reminders.length + sends.filter((item) => !item.read).length

    return NextResponse.json({ data: items, unread_count: unreadCount })
  } catch {
    return handleApiError(ApiErrors.INTERNAL_ERROR('Unexpected error'), 'GET /api/notifications')
  }
}
```

En `apps/web/app/api/quotes/[id]/notifications/route.ts`, después de `.eq('quote_id', id)`, agregar:
```ts
      .in('notification_type', ['email', 'whatsapp'])
```
(El historial del diálogo de envío solo lista envíos; las respuestas del cliente van a la campana y al detalle.)

En `apps/web/types/database.types.ts`:
```ts
export type NotificationType = 'email' | 'whatsapp' | 'client_accepted' | 'client_rejected'
```

- [ ] **Step 3: Pruebas, tipos y verificación**

Run: `cd $REPO/apps/web && pnpm exec vitest run lib/notifications && pnpm exec tsc --noEmit -p .`
Expected: PASS; `tsc` limpio.

Verificación con herramientas: con el propietario en `/dashboard` en una pestaña, aceptar una liga desde otra pestaña sin sesión (Tarea 8). Con `MutationObserver` vía `browser_evaluate` sobre el contador de la campana, confirmar que el número sube sin recargar (Realtime) y que el menú muestra "Tu cliente aceptó la cotización" con el folio. `curl -s -H "Authorization: Bearer $JWT" $APP/api/notifications` → la respuesta incluye el aviso con `"read":false` y `unread_count` lo cuenta.

- [ ] **Step 4: Punto de control (sin commit)**

Entra en el **Commit C**.

---

### Task 14: E2E del flujo completo y verificación final

**Files:**
- Create: `apps/web/e2e/specs/25-public-quote.spec.ts`

**Interfaces:**
- Consumes: todo lo anterior; `demoAccessToken`, `DEMO_PASSWORD` (`e2e/helpers/demo-auth.ts`); `GET /api/analytics/trends?period=week&metric=revenue` (existente, cuenta `accepted_at`).
- Produces: 6 pruebas E2E en verde.

- [ ] **Step 1: Escribir la especificación**

`apps/web/e2e/specs/25-public-quote.spec.ts`:
```ts
import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { DEMO_PASSWORD, demoAccessToken } from '../helpers/demo-auth'

// Requiere el seed demo (megaglass-demo) y la migración 041 aplicada en la base local.
const OWNER = 'direccion@megaglass.demo.cotizapro.mx'
const BUSINESS = 'MEGAGLASS Demo'
const TOKEN_PATH = /\/c\/([a-f0-9]{64})$/

interface Ctx {
  readonly api: APIRequestContext
  readonly headers: Record<string, string>
}

interface SentQuote {
  readonly id: string
  readonly token: string
  readonly total: number
}

interface QuoteRow {
  readonly status: string
  readonly total: number | string
  readonly accepted_at: string | null
  readonly accepted_by_name: string | null
}

function money(value: number): string {
  return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Rango de documentación (RFC 5737): cada prueba usa otra IP y no agota el límite por IP de respond. */
function testClientIp(): string {
  return `198.51.100.${1 + Math.floor(Math.random() * 250)}`
}

async function ownerCtx(api: APIRequestContext): Promise<Ctx> {
  return { api, headers: { Authorization: `Bearer ${await demoAccessToken(OWNER)}` } }
}

async function getQuote(ctx: Ctx, id: string): Promise<QuoteRow> {
  const res = await ctx.api.get(`/api/quotes/${id}`, { headers: ctx.headers })
  expect(res.ok(), await res.text()).toBeTruthy()
  return ((await res.json()) as { data: QuoteRow }).data
}

async function createSentQuote(ctx: Ctx): Promise<SentQuote> {
  const clients: { clients: { id: string }[] } = await (await ctx.api.get('/api/clients', { headers: ctx.headers })).json()
  const created = await ctx.api.post('/api/quotes', {
    headers: ctx.headers,
    data: {
      client_id: clients.clients[0]!.id,
      valid_until: new Date(Date.now() + 15 * 86_400_000).toISOString(),
      items: [{ description: 'Cancel de baño templado E2E', quantity: 1, unit_price: 1500, unit_type: 'fixed' }],
    },
  })
  expect(created.status(), await created.text()).toBe(201)
  const id = ((await created.json()) as { data: { id: string } }).data.id
  const sent = await ctx.api.post(`/api/quotes/${id}/send`, { headers: ctx.headers, data: { send_via: ['whatsapp'], whatsapp_override: '8112345678' } })
  expect(sent.status(), await sent.text()).toBe(200)
  const body: { share_url: string; results: { whatsapp: { url: string } } } = await sent.json()
  const match = TOKEN_PATH.exec(new URL(body.share_url).pathname)
  expect(match, body.share_url).not.toBeNull()
  expect(decodeURIComponent(body.results.whatsapp.url)).toContain('Revísala y acéptala aquí:')
  const quote = await getQuote(ctx, id)
  expect(quote.status).toBe('sent')
  return { id, token: match![1]!, total: Number(quote.total) }
}

async function acceptedRevenue(ctx: Ctx): Promise<number> {
  const res = await ctx.api.get('/api/analytics/trends?period=week&metric=revenue', { headers: ctx.headers })
  expect(res.ok(), await res.text()).toBeTruthy()
  const body: { trends: { revenue?: { amount: number }[] } } = await res.json()
  return (body.trends.revenue ?? []).reduce((sum, row) => sum + row.amount, 0)
}

async function anonymousPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': testClientIp() } })
  return context.newPage()
}

async function loginAsOwner(page: Page): Promise<void> {
  await page.goto('/login')
  await page.locator('input[name="email"]').fill(OWNER)
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
}

test.describe('Cotización pública con Aceptar y anticipo', () => {
  test('el cliente abre la liga sin sesión, ve el anticipo, acepta y el negocio la ve aceptada', async ({ playwright, baseURL, browser, page }) => {
    const ctx = await ownerCtx(await playwright.request.newContext({ baseURL }))
    const quote = await createSentQuote(ctx)
    const revenueBefore = await acceptedRevenue(ctx)
    const client = await anonymousPage(browser)

    await client.goto(`/c/${quote.token}`)
    await expect(client.getByRole('heading', { level: 1 })).toHaveText(BUSINESS)
    await expect(client.getByTestId('public-quote-total')).toContainText(`$${money(quote.total)}`)
    const deposit = client.getByTestId('deposit-card')
    await expect(deposit).toContainText(`Anticipo: $${money(Math.round(quote.total * 50) / 100)} (50 %)`)
    await expect(deposit).toContainText(`El pago lo recibe directamente ${BUSINESS}`)
    await expect(client.getByRole('link', { name: 'Tengo dudas' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+\?text=/)
    await expect.poll(async () => (await getQuote(ctx, quote.id)).status).toBe('viewed')

    await client.getByRole('button', { name: 'Aceptar cotización' }).click()
    await client.getByLabel('Tu nombre').fill('Laura Pérez E2E')
    await client.getByRole('button', { name: 'Confirmar aceptación' }).click()
    await expect(client.getByTestId('quote-status-banner')).toContainText('Cotización aceptada')
    await expect(client.getByRole('button', { name: 'Aceptar cotización' })).toHaveCount(0)

    const again = await client.request.post(`/api/public/quotes/${quote.token}/respond`, { data: { action: 'accept', name: 'Otra Persona' } })
    expect(again.status(), await again.text()).toBe(200)
    expect(((await again.json()) as { data: { changed: boolean } }).data.changed).toBe(false)

    const accepted = await getQuote(ctx, quote.id)
    expect(accepted.status).toBe('accepted')
    expect(accepted.accepted_at).not.toBeNull()
    expect(accepted.accepted_by_name).toBe('Laura Pérez E2E')
    await expect.poll(() => acceptedRevenue(ctx)).toBeGreaterThanOrEqual(revenueBefore + quote.total - 0.01)

    await loginAsOwner(page)
    await page.goto(`/dashboard/quotes/${quote.id}`)
    await expect(page.getByTestId('client-response-card')).toContainText('Aceptada desde la liga')
    await expect(page.getByTestId('client-response-card')).toContainText('Laura Pérez E2E')
    await client.context().close()
  })

  test('una liga revocada o mal formada muestra "Liga no disponible" y su PDF responde 404', async ({ playwright, baseURL, browser }) => {
    const ctx = await ownerCtx(await playwright.request.newContext({ baseURL }))
    const quote = await createSentQuote(ctx)
    const client = await anonymousPage(browser)

    const pdf = await client.request.get(`/api/public/quotes/${quote.token}/pdf`)
    expect(pdf.status()).toBe(200)
    expect(pdf.headers()['content-type']).toContain('application/pdf')

    const revoked = await ctx.api.delete(`/api/quotes/${quote.id}/share`, { headers: ctx.headers })
    expect(revoked.status(), await revoked.text()).toBe(200)
    await client.goto(`/c/${quote.token}`)
    await expect(client.getByRole('heading', { name: 'Liga no disponible' })).toBeVisible()
    expect((await client.request.get(`/api/public/quotes/${quote.token}/pdf`)).status()).toBe(404)

    await client.goto('/c/no-es-un-token')
    await expect(client.getByRole('heading', { name: 'Liga no disponible' })).toBeVisible()
    await client.context().close()
  })

  test('el negocio abre su propia liga en vista previa: no marca "Vista" ni puede responder', async ({ playwright, baseURL, page }) => {
    const ctx = await ownerCtx(await playwright.request.newContext({ baseURL }))
    const quote = await createSentQuote(ctx)

    await loginAsOwner(page)
    await page.goto(`/c/${quote.token}`)
    await expect(page.getByTestId('quote-status-banner')).toContainText('Vista previa')
    await expect(page.getByRole('button', { name: 'Aceptar cotización' })).toHaveCount(0)
    const res = await page.request.post(`/api/public/quotes/${quote.token}/respond`, { data: { action: 'accept' } })
    expect(res.status()).toBe(403)
    expect((await getQuote(ctx, quote.id)).status).toBe('sent')
  })

  test('una cotización vista por el cliente se puede aceptar a mano desde el detalle', async ({ playwright, baseURL, browser, page }) => {
    const ctx = await ownerCtx(await playwright.request.newContext({ baseURL }))
    const quote = await createSentQuote(ctx)
    const client = await anonymousPage(browser)
    await client.goto(`/c/${quote.token}`)
    await expect.poll(async () => (await getQuote(ctx, quote.id)).status).toBe('viewed')

    await loginAsOwner(page)
    await page.goto(`/dashboard/quotes/${quote.id}`)
    await expect(page.getByTestId('client-response-card')).toContainText('Vista por el cliente')
    await page.getByRole('button', { name: 'Aceptar', exact: true }).click()
    await expect.poll(async () => (await getQuote(ctx, quote.id)).status).toBe('accepted')
    await client.context().close()
  })

  test('anticipo 0 en la cotización oculta la tarjeta de anticipo', async ({ playwright, baseURL, browser }) => {
    const ctx = await ownerCtx(await playwright.request.newContext({ baseURL }))
    const quote = await createSentQuote(ctx)
    const res = await ctx.api.patch(`/api/quotes/${quote.id}`, { headers: ctx.headers, data: { deposit_percent: 0 } })
    expect(res.status(), await res.text()).toBe(200)

    const client = await anonymousPage(browser)
    await client.goto(`/c/${quote.token}`)
    await expect(client.getByRole('button', { name: 'Aceptar cotización' })).toBeVisible()
    await expect(client.getByTestId('deposit-card')).toHaveCount(0)
    await client.context().close()
  })

  test('Configuración → Empresa muestra la sección Anticipo', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard/settings')
    await page.getByRole('button', { name: 'Empresa' }).click()
    await expect(page.getByLabel('Anticipo (%)')).toBeVisible()
    await expect(page.getByLabel('Liga de pago')).toBeVisible()
    await expect(page.getByLabel('Instrucciones de pago')).toBeVisible()
  })
})
```

- [ ] **Step 2: Correr el E2E**

Run: `cd $REPO/apps/web && PLAYWRIGHT_TEST_BASE_URL=http://localhost:3100 pnpm exec playwright test e2e/specs/25-public-quote.spec.ts`
Expected: `6 passed`. Si alguna falla, depurar con la traza (`playwright show-trace`) antes de tocar código; no ajustar la prueba para que pase si el comportamiento no cumple la spec.

- [ ] **Step 3: Regresión de lo existente**

Run:
```bash
cd $REPO/apps/web && PLAYWRIGHT_TEST_BASE_URL=http://localhost:3100 pnpm exec playwright test e2e/specs/22-public-profile.spec.ts e2e/specs/23-review-flow.spec.ts e2e/specs/24-quote-request.spec.ts e2e/specs/12-settings.spec.ts e2e/specs/04-quotes.spec.ts
cd $REPO && psql "$DB" -v ON_ERROR_STOP=1 -f apps/web/supabase/tests/public_quote_security.sql
psql "$DB" -v ON_ERROR_STOP=1 -f apps/web/supabase/tests/showcase_security.sql
```
Expected: todas en verde; ambos scripts SQL con `failed = 0`.

- [ ] **Step 4: Verificación completa**

Run:
```bash
cd $REPO/apps/web && pnpm exec vitest run && pnpm exec tsc --noEmit -p . && pnpm exec eslint . && pnpm build
```
Expected: todo en verde; `pnpm build` termina y lista la ruta `/c/[token]` y `/api/public/quotes/[token]/{pdf,respond,view}`.

- [ ] **Step 5: Revisión de la Review Focus**

Confirmar con evidencia (salida de pruebas) cada línea:
1. Vista previa de ligas → `user-agent.test.ts` y `reading the link does not change status` en verde.
2. Vista previa del negocio → pruebas SQL `owner …` y E2E "vista previa" en verde.
3. Reenvío de aceptada → `send-status.test.ts` en verde.
4. Reenvío de vencida → `resent expired quote link …` y `expired quote link lives at least 7 days` en verde.
5. Fecha DATE → `format.test.ts` en verde.

- [ ] **Step 6: Commit C (solo con aprobación del usuario)**

Mostrar al usuario `git status` y `git diff --stat`, ejecutar la skill `verify` y esperar un "sí" explícito. Solo entonces:
```bash
git add apps/web/hooks/use-quote-share-link.ts apps/web/components/dashboard/quote-share-link-panel.tsx apps/web/components/dashboard/quote-share-dialog.tsx \
  apps/web/lib/validations/settings.ts apps/web/lib/validations/settings.test.ts apps/web/lib/deposit/settings-form.ts apps/web/lib/deposit/settings-form.test.ts \
  apps/web/app/api/settings/organization/route.ts apps/web/components/settings/deposit-settings.tsx "apps/web/app/(dashboard)/dashboard/settings/page.tsx" \
  apps/web/lib/validations/cotizapro.ts apps/web/lib/validations/quote-deposit.test.ts apps/web/components/quotes/client-response-card.tsx "apps/web/app/(dashboard)/dashboard/quotes/[id]/page.tsx" \
  apps/web/lib/notifications apps/web/app/api/notifications/route.ts "apps/web/app/api/quotes/[id]/notifications/route.ts" apps/web/types/database.types.ts \
  apps/web/e2e/specs/25-public-quote.spec.ts
git commit -m "feat: liga en envío, anticipo en configuración y avisos al negocio"
```

No hacer `git push` sin una aprobación aparte. El despliegue de la migración 041 a producción queda fuera de este plan y se pide por separado.

---

## Self-Review

**1. Cobertura de la spec D1**

| Requisito (spec) | Tarea |
|---|---|
| D1.3 `quote_shares` (id, quote_id, organization_id, token_hash, expires_at, revoked_at, first_viewed_at, created_by, created_at), RLS ver/revocar, sin insert directo | 1 |
| D1.3 `deposit_percent` (50), `deposit_instructions` (500), `deposit_payment_url` en `update_org_settings` | 1, 11 |
| D1.3 `quotes.deposit_percent`, `quotes.accepted_by_name` (120) | 1, 12 |
| D1.3 `create_quote_share` (sesión, organización, revoca anterior, token una vez, vencimiento) | 1, 5 |
| D1.3 `get_public_quote` (campos permitidos; sin contacto, notas, costos ni materiales) | 1, 3 |
| D1.3 marca `first_viewed_at`, `viewed_at` y `sent → viewed` | 1 (`mark_public_quote_viewed`), 7, 8 |
| D1.3 `respond_public_quote` (accept/reject, desde sent/viewed, fechas y motivo, aviso, idempotente, `p_name`) | 1, 7 |
| D1.4 `/c` pública + prueba; página de servidor con marca, móvil primero, botones y confirmación con "Tu nombre"; tarjeta de anticipo; `noindex`, sin caché | 8 |
| D1.4 PDF `GET /api/public/quotes/[token]/pdf`; adiós al bucket `documents` | 6, 9 |
| D1.4 WhatsApp "Revísala y acéptala aquí: …"; correo "Ver y aceptar cotización" + PDF adjunto | 4, 9 |
| D1.4 diálogo con "Copiar" y "Revocar liga" | 5, 10 |
| D1.4 Configuración → Empresa: sección "Anticipo" | 11 |
| D1.4 detalle: "Vista por el cliente el …", "Aceptada desde la liga el …", % por cotización | 12 |
| D1.5 token 32 bytes y validación de formato; `defaultApiLimiter`; límite por IP; responder dos veces; vencida sin botón | 1, 2, 6, 7, 8 |
| D1.6 unitarias (anticipo y centavos, WhatsApp, token) | 2, 4 |
| D1.6 SQL (otra organización, revocada/vencida NULL, idempotencia, draft/cobrado) | 1 |
| D1.6 E2E (enviar → abrir sin sesión → aceptar → "Aceptada" en el tablero → `accepted_at` → analítica) | 14 |
| §5 decisiones 1, 2 y 6 | 1, 8, 11 |
| "la campana y el tablero ya escuchan cambios" | 1 (publicación Realtime), 13 |

Sin requisitos de D1 sin tarea.

**2. Placeholders:** revisado; cada paso de código trae el código completo o el reemplazo exacto con su ancla.

**3. Consistencia de tipos:** `PublicQuote.issued_on` (RPC y adaptador PDF), `deposit.percent` (RPC, esquema, tarjeta), `shareUrl` (WhatsApp, ruta de envío), `acceptUrl` (correo, ruta de envío), `createQuoteShareLink(supabase, quoteId, origin)` (Tareas 5 y 9), `statusAfterSend(string)`, `QuotePdfData` (Tareas 6 y 9), `RespondPublicQuoteInput` (Tareas 7 y 8), `ActiveShare` (hook y panel), `ClientActivity` (Tareas 3 y 12), `QuoteNotificationRow`/`BellItem` (Tarea 13): coinciden.

**4. Review Focus:** las cinco líneas tienen su prueba en la tarea dueña (1, 2, 9) y se confirman en la Tarea 14, Step 5.

## Decisiones tomadas donde la spec no era explícita

1. **La vista no se marca en `get_public_quote`.** La spec dice que la primera lectura marca la vista. Si fuera así, la vista previa que genera WhatsApp al pegar la liga la marcaría como "Vista" antes de que el cliente la abra. Por eso `get_public_quote` queda en solo lectura (STABLE) y se agrega `mark_public_quote_viewed`, que llama el navegador e ignora a los agentes de vista previa. Son cuatro RPCs en lugar de tres.
2. **Límite por IP:** `respond_public_quote` recibe un quinto parámetro, `p_ip_hash`, y la tabla interna `quote_share_events` permite hasta 20 respuestas por hora por IP, con el mismo patrón que `submit_quote_request`.
3. **Vista previa del negocio:** si un miembro de la organización abre la liga, no se marca "Vista" y no puede responder (`owner_preview`).
4. **Notas:** `quotes.notes` se trata como interna y no se publica. Sí se publican los términos y condiciones y el descuento, porque son parte de lo que el cliente acepta.
5. **Vencimiento de la liga:** `valid_until + 30 días`, pero como mínimo 7 días a partir de hoy. Así, si se reenvía una cotización vencida, la liga muestra "Vencida" en lugar de "Liga no disponible".
6. **Monto del anticipo:** la RPC regresa el porcentaje efectivo (el de la cotización, si no el de la empresa, si no 50) y el monto se calcula solo en TypeScript (`depositAmount`), para que la regla de centavos viva en un solo lugar.
7. **Avisos:** `quote_notifications` admite `client_accepted` y `client_rejected`, y se agrega a la publicación de Realtime. La campana ya estaba suscrita, pero la tabla no estaba publicada.
8. **Reenvío:** las cotizaciones en borrador, rechazadas o vencidas pasan a "Enviada"; las demás conservan su estado. Antes, cualquier envío la regresaba a "Enviada".
9. **Orden del envío:** el destinatario se valida antes de crear la liga, porque crearla revoca la anterior.
10. **"Aceptada desde la liga":** se deduce de `accepted_at`, que hoy solo escribe la RPC. No se agrega una columna de origen.
11. **Acciones manuales:** las cotizaciones "Vistas" también muestran Aceptar y Rechazar en el detalle. La API ya lo permitía.
12. **Commits:** en lugar de un commit por tarea, se hacen 3 commits agrupados, cada uno con aprobación del usuario, como pide su regla.
