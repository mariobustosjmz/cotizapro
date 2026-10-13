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

### D1.3 Datos (migración 040)

- **Tabla `quote_shares`:**
  - `id`, `quote_id` (FK, `ON DELETE CASCADE`), `organization_id`;
  - `token_hash` (sha256, único), `expires_at`, `revoked_at`;
  - `first_viewed_at`, `created_by`, `created_at`;
  - RLS: los miembros de la organización ven y revocan; nadie lo inserta directo (solo la RPC).
- **`organizations.settings`**, nuevas claves permitidas en `update_org_settings`:
  - `deposit_percent`: entero de 0 a 100; por omisión, sin anticipo;
  - `deposit_instructions`: texto de hasta 500 caracteres, por ejemplo la CLABE y el banco;
  - `deposit_payment_url`: liga http(s) de Mercado Pago u otro, opcional.
- **`quotes`, columnas nuevas opcionales:**
  - `deposit_percent`, para cambiar el porcentaje en una cotización;
  - `deposit_payment_url`, para una liga específica de esa cotización.
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
  - `respond_public_quote(p_token, p_action, p_reason)`, anónima:
    - `p_action` es `accept` o `reject`;
    - solo cambia desde `sent` o `viewed`, y escribe `accepted_at` o `rejected_at` y `rejection_reason`;
    - registra un aviso en `quote_notifications` para que el negocio lo vea, porque la campana y el tablero ya escuchan cambios en tiempo real;
    - es idempotente: si ya estaba aceptada, regresa el estado actual.

### D1.4 Interfaz

- **Ruta pública `/c/[token]`.**
  - Se agrega `'/c'` a `packages/auth/src/public-routes.ts` y su prueba.
  - Página de servidor con la marca del negocio (`brandCssVars`), pensada primero para celular. Muestra encabezado con logo, partidas, totales y vigencia.
  - **Botones:**
    - "Aceptar cotización" (pide confirmar);
    - "Tengo dudas", que abre WhatsApp al negocio;
    - "No me interesa", con motivo opcional.
  - **Si hay anticipo:** una tarjeta "Anticipo: $X (Y %)" con las instrucciones y el botón "Pagar anticipo" si existe la liga. Aclara: *"El pago lo recibe directamente {negocio}"*.
  - `noindex`, sin caché pública. La página deja de funcionar si la liga vence o se revoca.
- **PDF desde la página:** `GET /api/public/quotes/[token]/pdf` genera el PDF con los mismos datos de la RPC. Sustituye la URL adivinable del bucket `documents`.
- **Al enviar por WhatsApp:**
  - el mensaje lleva la liga `/c/...` en lugar de la del PDF: *"Revísala y acéptala aquí: …"*;
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

### D2.3 Datos y seguridad (migración 041)

- **Trigger en `organizations`:** bloquea cambios a `plan`, `subscription_status`, `stripe_customer_id`, `trial_ends_at` y `current_period_end` cuando la petición viene de `authenticated` o `anon`. Es el mismo patrón que el trigger de `profiles` en la migración 037.
- **Columnas nuevas en `organizations`:**
  - `current_period_end TIMESTAMPTZ`;
  - `billing_provider TEXT`, con valores `'mercadopago_manual'` o `'stripe'`;
  - `billing_reference TEXT`, para el id o la referencia del pago en Mercado Pago.
- **Tabla `plan_activations`, para auditoría:** organización, plan anterior, plan nuevo, usuarios cobrados, monto, referencia, periodo, `activated_by` (texto del operador) y fecha. Sin acceso desde la app.
- **Cierre de los hallazgos de seguridad 2 y 3:**
  - quitar las políticas abiertas, porque service_role no las necesita;
  - `create_organization_with_owner` usa `auth.uid()`, fija `search_path` y se revoca a anon.

### D2.4 Flujo (semi-manual)

1. **Facturación** muestra cada plan con "Contratar con Mercado Pago".
   - La liga sale de variables de entorno por plan: `MP_LINK_STARTER`, `MP_LINK_PRO` y `MP_LINK_ENTERPRISE`. Son ligas de suscripción creadas a mano en el panel de Mercado Pago.
   - Si el negocio ya usa más usuarios de los incluidos, en lugar de la liga se muestra "Te mandamos tu liga con el total exacto" y un botón de WhatsApp al soporte. El total ya lo calcula `monthlyCost()`.
   - Sin las variables, todo se queda como "Próximamente", como hoy.
2. **El negocio paga.** Mercado Pago avisa al operador por correo o desde su app.
3. **El operador activa el plan** con `pnpm --filter web plan:activate --org <slug> --plan pro --users 5 --ref <id-mp> --months 1`. El script:
   - usa service role y solo corre en el servidor;
   - valida el plan, calcula el total con `monthlyCost()` y pide confirmación;
   - actualiza `plan`, `subscription_status = 'active'` y `current_period_end`;
   - registra la activación en `plan_activations`.
4. **Renovación y vencimiento:**
   - Cada mes, Mercado Pago cobra solo y el operador vuelve a correr el script con `--months 1`.
   - Si `current_period_end` pasó hace más de 7 días, el plan baja a Gratis automáticamente con un cron diario.
   - Los datos no se borran: lo que excede Gratis queda **en solo lectura**. Ver la pregunta 4.

### D2.5 Límites de plan (qué se aplica en v1)

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
  - la activación del script queda registrada;
  - el cron baja de plan solo después del periodo de gracia.
- **E2E local:**
  - en Gratis, la sexta cotización del mes se bloquea;
  - en Solo, invitar se bloquea;
  - en Taller, la cuarta persona muestra el aviso de costo extra;
  - al activar con el script, el bloqueo desaparece.

---

## 3. Fuera de alcance

- Cobro automático del anticipo dentro de CotizaPro. El negocio usa su propia liga o transferencia.
- Webhook o API de Mercado Pago (enfoque B), CFDI y pago anual.
- Firma electrónica de la cotización. "Aceptar" registra la aceptación con fecha, sin valor de firma.

## 4. Orden sugerido

1. **D2.3: seguridad de la facturación (trigger y políticas).** Es pequeño, de riesgo alto y no depende de lo demás. Puede ir en el siguiente hotfix.
2. **D1 completo.** Es lo que más ayuda a vender.
3. **D2.4–D2.5:** ligas de Mercado Pago, script y límites.

## 5. Preguntas abiertas (necesito tu decisión)

1. **Anticipo por omisión.** ¿Sin anticipo hasta que el negocio lo configure (recomendado), o 50 % por omisión?
2. **Liga de pago del anticipo.** ¿Basta una liga fija por negocio más instrucciones de transferencia (recomendado para v1), o hace falta una liga por cotización desde el inicio?
3. **¿Quién opera las activaciones?** ¿Solo tú con el script en el servidor, o quieres una pantalla de administración? La pantalla es más trabajo y requiere un rol de superadmin.
4. **Al vencer un plan:** ¿7 días de gracia y luego Gratis en solo lectura (recomendado), o bloqueo inmediato?
5. **Funciones con candado en v1.** ¿Aplicamos toda la tabla D2.5 o solo usuarios y cotizaciones por mes, dejando lo demás abierto mientras arranca el piloto?
6. **Aceptar desde la liga.** ¿Pedimos el nombre de quien acepta (recomendado, para el registro) o basta el clic?
