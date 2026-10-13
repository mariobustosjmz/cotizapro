# Cotización pública con "Aceptar" + anticipo, y cobro de CotizaPro con Mercado Pago — Diseño

- **Fecha:** 2026-10-13
- **Estado:** borrador para revisión (lote D). No hay código de esto todavía.
- **Alcance:** dos subproyectos independientes, cada uno con su propio plan e implementación:
  - **D1:** cotización pública que el cliente acepta desde WhatsApp, con anticipo.
  - **D2:** cobro del plan de CotizaPro con Mercado Pago semi-manual y límites de plan.

---

## 0. Qué se busca (entendimiento compartido)

**Lo que se pidió:**
- "Liga de la cotización con botón Aceptar y liga de pago del anticipo. El cliente acepta desde WhatsApp y el estado cambia solo."
- "Mercado Pago semi-manual: ligas por plan y un script para activar el plan."
- "Hacer cumplir los límites de cada plan (usuarios, funciones)."
- Restricciones vigentes: WhatsApp por ligas wa.me (sin API de Meta), y nada se promete si no está listo (lo pendiente dice "Próximamente").

**Supuestos (por confirmar en §5):**
- El anticipo **lo cobra el negocio**, no CotizaPro: CotizaPro solo muestra cuánto es y cómo pagarlo, y el negocio registra el pago como hoy, en la sección Pagos.
- El pago del plan lo verifica una persona (el operador de CotizaPro) y lo activa con un script; no hay webhook de Mercado Pago en v1.

**Éxito:**
- **D1:** el cliente abre la liga en su celular, ve la cotización con la marca del negocio y toca "Aceptar". La cotización pasa a "Aceptada" sin que nadie la cambie a mano, y el negocio lo ve en su tablero.
- **D2:** un negocio puede contratar Solo, Taller o Empresa pagando con Mercado Pago. El sistema respeta lo que incluye cada plan, y nadie puede cambiarse de plan sin pagar.

---

## D1. Cotización pública con "Aceptar" y anticipo

### D1.1 Estado actual (verificado en el código)

- **No hay página pública de cotización.** El mensaje de WhatsApp lleva la URL pública del PDF en el bucket `documents` (`app/api/quotes/[id]/send/route.ts:65-85`). Esa ruta se puede adivinar (organización + folio consecutivo), y el bucket no se crea en ninguna migración.
- **Columnas en `quotes` que nadie escribe:** `viewed_at`, `accepted_at`, `rejected_at` y `rejection_reason` (migración 002). Analítica y exportaciones ya leen `accepted_at`, así que hoy esas cifras salen vacías.
- **No existe el concepto de anticipo:** no hay porcentaje ni liga de pago. Solo existe el tipo de pago `anticipo` en `quote_payments` y texto libre en los términos.

### D1.2 Enfoques considerados

| Enfoque | Ventajas | Desventajas |
|---|---|---|
| **A. Token secreto por cotización con RPCs anónimas (recomendado)** | Mismo patrón ya probado en las reseñas (`034`: token de 24 bytes, se guarda solo el hash, RPC `SECURITY DEFINER`). Sin service role. Se puede revocar. | Una tabla y tres RPCs nuevas. |
| B. Página por `quote.id` (UUID) sin token | Muy simple. | El UUID no se puede revocar ni hacer vencer, y queda expuesto en cada liga. |
| C. Solo el PDF firmado (sin página) | Casi no hay que hacer nada. | No permite "Aceptar", ni marcar "vista", ni mostrar el anticipo. |

**Recomendación: A.**

### D1.3 Datos (migración 041)

- **Tabla `quote_shares`:**
  - `id`, `quote_id` (FK, `ON DELETE CASCADE`), `organization_id`;
  - `token_hash` (sha256, único), `expires_at`, `revoked_at`;
  - `first_viewed_at`, `created_by`, `created_at`;
  - RLS: los miembros de la organización ven y revocan; nadie lo inserta directo (solo la RPC).
- **`organizations.settings`**, nuevas claves permitidas en `update_org_settings`:
  - `deposit_percent`: entero de 0 a 100; **por omisión 50** (decisión 1). El negocio puede poner 0 para no pedir anticipo;
  - `deposit_instructions`: texto de hasta 500 caracteres, por ejemplo la CLABE y el banco;
  - `deposit_payment_url`: **una liga por negocio** (decisión 2), http(s) de Mercado Pago u otro, opcional. Se configura en Configuración → Empresa.
- **`quotes`, columna nueva opcional:**
  - `deposit_percent`, para cambiar el porcentaje en una cotización (por ejemplo 0 en un trabajo chico). No hay liga por cotización.
- **Aceptación:** `quotes.accepted_by_name` (texto opcional, hasta 120 caracteres; decisión 6).
- **RPCs:**
  - `create_quote_share(p_quote_id)`:
    - requiere sesión y que la cotización sea de la organización;
    - revoca la liga anterior y crea una nueva;
    - regresa el token **una sola vez**, igual que con las reseñas;
    - vence en `valid_until + 30 días`, o en 60 días si no hay vigencia.
  - `get_public_quote(p_token)`, anónima:
    - regresa solo lo necesario: nombre, logo y color del negocio; teléfono del negocio; nombre de pila del cliente; folio; partidas con descripción, cantidad y totales; subtotal, IVA y total; vigencia; estado; monto del anticipo; instrucciones y liga de pago;
    - la primera vez marca `first_viewed_at`, y también `quotes.viewed_at` con estado `sent → viewed` (la transición ya existe);
    - **no** regresa correo ni teléfono del cliente, notas internas, costos ni lista de materiales.
  - `respond_public_quote(p_token, p_action, p_reason, p_name)`, anónima (`p_name` opcional, se guarda en `accepted_by_name`):
    - `p_action` es `accept` o `reject`;
    - solo cambia desde `sent` o `viewed`, y escribe `accepted_at` o `rejected_at` y `rejection_reason`;
    - registra un aviso en `quote_notifications` para que el negocio lo vea, porque la campana y el tablero ya escuchan cambios en tiempo real;
    - es idempotente: si ya estaba aceptada, regresa el estado actual.

### D1.4 Interfaz

- **Ruta pública `/c/[token]`.**
  - Se agrega `'/c'` a `packages/auth/src/public-routes.ts` y su prueba.
  - Página de servidor con la marca del negocio (`brandCssVars`), pensada primero para celular. Muestra encabezado con logo, partidas, totales y vigencia.
  - **Botones:**
    - "Aceptar cotización": abre una confirmación con el campo opcional "Tu nombre";
    - "Tengo dudas", que abre WhatsApp al negocio;
    - "No me interesa", con motivo opcional.
  - **Si hay anticipo:** una tarjeta "Anticipo: $X (Y %)" con las instrucciones y el botón "Pagar anticipo" si existe la liga. Aclara: *"El pago lo recibe directamente {negocio}"*.
  - `noindex`, sin caché pública. La página deja de funcionar si la liga vence o se revoca.
- **PDF desde la página:** `GET /api/public/quotes/[token]/pdf` genera el PDF con los mismos datos de la RPC. Sustituye la URL adivinable del bucket `documents`.
- **Al enviar por WhatsApp o correo:**
  - el mensaje de WhatsApp lleva la liga `/c/...` en lugar de la del PDF: *"Revísala y acéptala aquí: …"*;
  - el correo (ya con plantilla de marca desde 2026-10-13) agrega el botón "Ver y aceptar cotización" con la misma liga, además del PDF adjunto;
  - el diálogo muestra la liga con "Copiar" y "Revocar liga".
- **Configuración → Empresa:** sección "Anticipo" con porcentaje, instrucciones y liga de pago.
- **Detalle de la cotización:**
  - leyenda "Vista por el cliente el …", y "Aceptada desde la liga el …" cuando aplique;
  - el porcentaje de anticipo se puede cambiar para esa cotización.

### D1.5 Errores y abuso

- **Token:** 32 bytes aleatorios; se valida su formato antes de consultar.
- **Límite de peticiones:** `defaultApiLimiter` en las rutas públicas, más un límite por IP en `respond_public_quote` con el mismo patrón de `submit_quote_request`.
- **Responder dos veces:** se muestra el estado actual sin error.
- **Cotización vencida:** la página la muestra con el aviso "Vencida: pide una actualización" y sin botón de aceptar.

### D1.6 Pruebas

- **Unitarias:** cálculo del anticipo y redondeo a centavos; armado del mensaje de WhatsApp; validación del token.
- **SQL, con transacción y rollback:**
  - un token de otra organización no da acceso;
  - una liga revocada o vencida regresa NULL;
  - aceptar dos veces es idempotente;
  - no se puede aceptar algo en `draft` ni en `cobrado`.
- **E2E local:** enviar → abrir la liga sin sesión → aceptar → la cotización aparece "Aceptada" en el tablero del negocio, con `accepted_at` escrito → la analítica la cuenta.

---

## D2. Cobro de CotizaPro con Mercado Pago (semi-manual) y límites de plan

### D2.1 Estado actual (verificado)

- **Sin Stripe configurado,** Facturación muestra los planes como "Próximamente" (`BillingClient.tsx`, `PlanSelector.tsx`). El código de Stripe queda inactivo.
- **Los límites no se aplican en ningún lado:**
  - las invitaciones no revisan lugares disponibles;
  - crear cotizaciones no revisa el tope mensual de Gratis ("5 al mes");
  - no hay control de funciones por plan.
- **Problemas de seguridad relacionados, encontrados en la revisión del 2026-10-13:**
  1. Un propietario puede cambiar `organizations.plan`, `subscription_status` y `stripe_customer_id` directo contra la base de datos.
  2. Las políticas "Service role" de `webhook_events`, `billing_history` y `usage_logs` están abiertas a cualquier rol (`true`).
  3. `create_organization_with_owner` confía en el `owner_id` que manda el cliente y anon la puede ejecutar.
  4. El webhook de Stripe usa el cliente anon, así que sus actualizaciones no tienen efecto (hoy no importa, porque Stripe está apagado).

### D2.2 Enfoques considerados

| Enfoque | Ventajas | Desventajas |
|---|---|---|
| **A. Ligas de suscripción de Mercado Pago por plan + activación manual con script (recomendado para arrancar)** | Se arranca en horas. Cobro mensual recurrente con tarjeta. Sin webhooks ni llaves en la app. | Una persona verifica el pago y lo activa. Los usuarios adicionales requieren una liga con monto personalizado. |
| B. API de Mercado Pago (preapproval) + webhook | Automático, y el monto incluye usuarios adicionales. | Más trabajo, webhook expuesto, credenciales; conviene cuando haya volumen. |
| C. Stripe | Ya está programado. | Requiere cuenta Stripe en MX y precios; el usuario prefirió Mercado Pago para empezar. |

**Recomendación: A ahora, con un diseño que deja listo el camino a B.**
- Las funciones `activate_plan` y `plan_limits` son las mismas que usaría un webhook.

### D2.3 Datos y seguridad (migración 042)

- **Ya resuelto en el hotfix de seguridad (migración 040):**
  - el trigger que bloquea cambios a `plan`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id` y `trial_ends_at` desde `authenticated` o `anon`;
  - el cierre de las políticas abiertas;
  - `create_organization_with_owner` con `auth.uid()`.
  
  042 agrega `current_period_end` a la lista del trigger.
- **Superadmin de plataforma (decisión 3):**
  - tabla `platform_admins (user_id PK → auth.users, created_at)`, sin políticas: nadie la lee desde la app;
  - el alta es por SQL en el servidor y queda documentada en el inventario;
  - función `is_platform_admin()`: SECURITY DEFINER, `search_path` fijo, solo para `authenticated`.
- **Columnas nuevas en `organizations`:**
  - `current_period_end TIMESTAMPTZ`;
  - `billing_provider TEXT`, con valores `'mercadopago_manual'` o `'stripe'`;
  - `billing_reference TEXT`, para el id o la referencia del pago en Mercado Pago.
- **Tabla `plan_activations`, para auditoría:** organización, plan anterior, plan nuevo, usuarios cobrados, monto, referencia, periodo, `activated_by` (uuid del superadmin) y fecha. Sin acceso directo desde la app.
- **RPCs de superadmin** (cada una valida `is_platform_admin()` y lanza `forbidden` si no):
  - `admin_list_organizations(p_search, p_limit, p_offset)`: nombre, slug, plan, estado, `current_period_end`, número de usuarios y fecha de alta;
  - `admin_activate_plan(p_org, p_plan, p_users, p_months, p_amount, p_reference)`: actualiza `plan`, `subscription_status = 'active'` y `current_period_end` (extiende desde el mayor de hoy y el fin actual), y registra en `plan_activations` dentro de la misma transacción;
  - `admin_suspend_plan(p_org, p_reason)`: deja el plan vencido de inmediato y lo registra.

### D2.4 Flujo (semi-manual)

1. **Facturación** muestra cada plan con "Contratar con Mercado Pago".
   - La liga sale de variables de entorno por plan: `MP_LINK_STARTER`, `MP_LINK_PRO` y `MP_LINK_ENTERPRISE`. Son ligas de suscripción creadas a mano en el panel de Mercado Pago.
   - Si el negocio ya usa más usuarios de los incluidos, en lugar de la liga se muestra "Te mandamos tu liga con el total exacto" y un botón de WhatsApp al soporte. El total ya lo calcula `monthlyCost()`.
   - Sin las variables, todo se queda como "Próximamente", como hoy.
2. **El negocio paga.** Mercado Pago avisa al operador por correo o desde su app.
3. **El operador activa el plan en la pantalla de superadmin `/admin`** (decisión 3):
   - la ruta está fuera del panel de la empresa; el servidor revisa `is_platform_admin()` y, si no lo es, responde 404;
   - muestra una tabla de empresas con búsqueda, plan, estado y "vence en N días";
   - el formulario "Activar o renovar" tiene plan, usuarios, meses y referencia de Mercado Pago. Muestra el total calculado con `monthlyCost()` y llama a `admin_activate_plan`;
   - tiene el historial de activaciones por empresa y el botón "Suspender", que pide confirmación.
4. **Renovación y vencimiento (decisión 4: bloqueo inmediato con avisos):**
   - Cada mes, Mercado Pago cobra solo y el operador renueva desde `/admin`.
   - **Avisos antes de vencer:**
     - banner en el panel desde 7 días antes: "Tu plan Taller vence en 3 días. Al vencer, la cuenta queda en solo lectura hasta renovar.", con botón "Renovar";
     - correo al propietario a los 7, 3 y 1 días y el día del vencimiento, con un cron diario que usa Resend.
   - **Al vencer:** la cuenta queda **en solo lectura de inmediato**, sin periodo de gracia. Se puede ver y descargar todo, pero no crear, editar ni enviar.
   - **Dónde se aplica:**
     - un helper `assertWritable(org)` en las rutas de API que escriben responde 402 con un mensaje en español;
     - un banner rojo fijo en el panel;
     - la función SQL `org_is_writable(org_id)` está disponible para RLS en una fase posterior.
   - Los datos nunca se borran. El plan Gratis no vence.

### D2.5 Límites de plan (qué se aplica en v1)

> **Decisión 5:** durante el piloto todo queda abierto para probar y explorar. La tabla se programa en `planLimits()` y se muestra en Facturación como información. Su aplicación se apaga con `PLAN_LIMITS_ENFORCED=false`, el valor por omisión. El único bloqueo activo en v1 es el de plan vencido (D2.4).

- **Fuente única:** `lib/plans/limits.ts`, derivado de `PLANS`, con la función `planLimits(planId)`. También se refleja en SQL con la función `org_plan_limits(org_id)` para los checks de base de datos.

| Límite | Gratis | Solo | Taller | Empresa | Dónde se aplica |
|---|---|---|---|---|---|
| Usuarios | 1 | 1 | 3 + $99 c/u | 10 + $99 c/u | Al crear invitación y al aceptarla. Gratis y Solo no pueden invitar y ven "Disponible en Taller". En Taller y Empresa se avisa el costo extra. |
| Cotizaciones por mes | 5 | ilimitadas | ilimitadas | ilimitadas | `POST /api/quotes`. La sexta muestra "Llegaste a 5 este mes" y un botón a Facturación. |
| Equipo con roles, fotos de obra, tablero por etapa | — | — | sí | sí | v1: se muestran con candado y "Disponible en Taller". Las rutas de API responden 402 con mensaje en español. |
| Plantillas, analítica, recordatorios | — | sí | sí | sí | Igual que la fila anterior. |

- **Cuentas que ya existen:**
  - Antes de aplicar, se revisa cuántas organizaciones excederían su plan.
  - Las cuentas de presentación y demo quedan en el plan que tienen asignado.
  - Ningún bloqueo borra datos; solo impide crear más.

### D2.6 Pruebas

- **Unitarias:** `planLimits`; el texto de cada bloqueo; el cálculo del monto en el script.
- **SQL:**
  - un propietario no puede cambiar `plan`;
  - un usuario que no es superadmin recibe `forbidden` en las RPCs `admin_*`;
  - la activación queda registrada en `plan_activations`;
  - renovar extiende desde el fin vigente.
- **Unitarias:** `daysUntilExpiry`, el texto del banner por rango de días y `assertWritable`.
- **E2E local:**
  - un no-superadmin que entra a `/admin` ve 404;
  - el superadmin activa Taller por 1 mes y la empresa ve "Plan Taller · vence el …";
  - con el periodo vencido, crear una cotización da 402 y aparece el banner rojo;
  - al renovar, el bloqueo desaparece;
  - a 3 días de vencer, aparece el banner amarillo.

---

## 3. Fuera de alcance

- Cobro automático del anticipo dentro de CotizaPro. El negocio usa su propia liga o transferencia.
- Webhook o API de Mercado Pago (enfoque B), CFDI y pago anual.
- Firma electrónica de la cotización. "Aceptar" registra la aceptación con fecha, sin valor de firma.

## 4. Orden sugerido

1. **Hotfix de seguridad, migración 040.** Incluye el trigger de columnas de facturación, el cierre de políticas abiertas, `create_organization_with_owner`, quitar a anon el acceso a funciones internas y pasar el webhook de Stripe a service role. Es pequeño, de riesgo alto y no depende de lo demás.
2. **D1 completo (migración 041).** Es lo que más ayuda a vender.
3. **D2 (migración 042):** superadmin, activación, avisos y bloqueo al vencer, y ligas de Mercado Pago en Facturación.

## 5. Decisiones (respondidas el 2026-10-13)

1. **Anticipo por omisión:** 50 %. El negocio lo cambia en Configuración y cada cotización puede ajustarlo.
2. **Liga de pago del anticipo:** una por negocio, junto con las instrucciones de pago, configurables en Configuración → Empresa.
3. **Activaciones:** pantalla de superadmin en `/admin`.
4. **Al vencer:** bloqueo inmediato a solo lectura, con avisos 7, 3 y 1 días antes (banner y correo) que explican cuánto falta y qué se limitará.
5. **Candados en el piloto:** ninguno. Todo queda abierto para probar; los límites quedan programados pero apagados.
6. **Aceptar desde la liga:** campo opcional "Tu nombre".
