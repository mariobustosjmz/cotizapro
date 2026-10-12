# CotizaPro Plataforma — Diseño (wrap-up, deploy, motor de reglas, vitrina)

Fecha: 2026-10-11 · Rama: `feature/plataforma-motor-vitrina` · Estado: aprobado por secciones (1 y 2 en conversación; 3 a 6 redactadas en trabajo autónomo autorizado)

## 0. Contexto y decisiones de entrada

CotizaPro es la herramienta de trabajo y prospección de cualquiera que venda un servicio u oficio, sin importar su formalidad. Tres pilares iguales para todas las cuentas:

1. **Vitrina**: página pública propia, portafolio, reseñas verificadas, QR y botón "Pedir cotización".
2. **Cotizador configurable**: productos armados con bloques de cálculo y plantillas por giro.
3. **Operación**: clientes, Kanban, cobros, agenda, recordatorios, analytics (ya existe).

Decisiones tomadas por el usuario:

| Tema | Decisión |
|---|---|
| Base de datos producción | Segundo stack Supabase self-hosted propio en el VPS Hostinger compartido (B) |
| Dominio | `cotizapro.mariobustos.io`, API en `api.cotizapro.mariobustos.io` |
| Integraciones | Resend + cron activos; WhatsApp vía enlaces `wa.me`; Stripe apagado |
| Motor de vidrio | Modelo estándar configurable, validado con el primer pedido real (C) |
| Arquitectura del motor | Enfoque 2: motor de reglas data-driven |
| Libertad de reglas | Bloques predefinidos en código, parámetros en datos (A); fórmula libre queda para después |
| Tipos de cuenta | Persona, grupo, empresa; cambian valores iniciales, no capacidades |
| Giros | Plantillas de catálogo (vidrio, plomería, electricidad, HVAC, costura). MEGAGLASS es un caso de uso |
| Orden | Fase 0 → 1 → 2 → 3 |

## 1. Fases y alcance

- **Fase 0. Wrap-up, seed y simulaciones.** Limpieza del árbol, Supabase local, seed realista multi-cuenta reproducible, E2E existentes + jornadas nuevas, pruebas de uso guiadas, unit tests mínimos.
- **Fase 1. Deploy en el VPS.** Stack Supabase propio reducido, app Next.js detrás de Caddy, DNS, cron, respaldos, cuentas demo + cuenta real MEGAGLASS limpia, script de reseteo demo.
- **Fase 2. Motor de reglas y plantillas de giro.** Paquete puro `@cotizapro/quoting`, listas de precios, productos configurables, formulario de item dinámico, desglose y lista de materiales en PDF, onboarding con tipo de cuenta y giro.
- **Fase 3. Vitrina beta.** `/p/[slug]`, portafolio de fotos, reseñas verificadas con un clic al cobrar, "Pedir cotización" con bandeja de solicitudes, tarjeta QR en PDF, cambio de tipo de cuenta.
- **Fuera de alcance:** bot WhatsApp, órdenes de trabajo, CFDI, OpenPay, microcrédito, bloque de fórmula libre, directorio público.

**Criterio de éxito:** MEGAGLASS y al menos una persona de oficio real cotizan, cobran y reciben una reseña verificada en producción; al menos una solicitud llega por su página pública.

## 2. Modelo de datos (migraciones 033+, `gen_random_uuid()`)

### 2.1 Cuenta y giro
- `organizations.account_type TEXT NOT NULL DEFAULT 'company' CHECK IN ('person','group','company')`
- `organizations.trade TEXT` (clave de plantilla: `glass`, `plumbing`, `electrical`, `hvac`, `sewing`, `general`)
- `organizations.onboarding_completed_at TIMESTAMPTZ`

### 2.2 Motor
- `price_lists(id, organization_id, name, unit, dimensions TEXT[], rows JSONB, is_active, created_at, updated_at)`. `rows` = `[{ "keys": {"tipo":"claro","espesor":"6"}, "price": 450.00 }]`. RLS por organización; escritura owner/admin.
- `service_catalog.pricing_blocks JSONB` (definición de producto configurable; `NULL` = precio simple actual). Se elimina el CHECK cerrado de `category`.
- `quote_items.input JSONB`, `quote_items.breakdown JSONB`, `quote_items.pricing_snapshot JSONB`. `unit_type` acepta además `per_lm`. `quantity`, `unit_price`, `subtotal` siguen siendo la verdad para PDF, Kanban y analytics.

### 2.3 Vitrina
- `public_profiles(organization_id PK, display_name, headline, bio, service_area, city, whatsapp_phone, contact_email, logo_path, cover_path, is_published, show_prices, updated_at)`
- `job_photos(id, organization_id, quote_id, storage_path, kind CHECK IN ('before','after','other'), caption, is_public, sort_order, created_at)`
- `reviews(id, organization_id, quote_id UNIQUE, client_id, rating 1..5, comment, owner_reply, token_hash, token_expires_at, submitted_at, is_visible, created_at)`
- `quote_requests(id, organization_id, name, phone, email, message, details JSONB, status CHECK IN ('new','converted','discarded'), client_id, quote_id, ip_hash, created_at)`

### 2.4 Seguridad pública
- Lectura anónima por RLS solo de: perfiles publicados, fotos públicas de perfiles publicados, reseñas enviadas y visibles de perfiles publicados. Nunca precios internos ni datos de clientes. Nombre del cliente en reseñas: solo nombre de pila + inicial, calculado en una vista.
- Escritura anónima solo vía funciones `SECURITY DEFINER` con `search_path` fijo: `submit_review(token, rating, comment)` y `submit_quote_request(slug, name, phone, email, message, details)`. La app aplica límite por IP antes de llamarlas. Sin service role en rutas públicas.
- La creación del token de reseña la hace el dueño autenticado (`create_review_request(quote_id)`), solo si la cotización está `cobrado`; devuelve el token en claro una vez y guarda el hash SHA-256.

## 3. Motor de reglas por bloques (`packages/quoting`)

Paquete TypeScript puro, sin React ni Supabase, usado por el navegador (vista previa) y por el servidor (cálculo autoritativo al guardar). Dinero en centavos enteros; redondeo half-up por línea.

### 3.1 Producto configurable
```ts
interface ProductDefinition {
  readonly version: 1
  readonly unit: 'sqm' | 'lm' | 'unit' | 'hour' | 'fixed'
  readonly inputs: readonly InputField[]   // lo que captura el usuario
  readonly blocks: readonly Block[]        // cómo se calcula
}
type InputField =
  | { kind: 'number'; key; label; unit?: 'mm'|'cm'|'m'|'pz'|'h'; min?; max?; default? }
  | { kind: 'select'; key; label; options: {value,label}[] } // opciones fijas o
  | { kind: 'select'; key; label; fromPriceList: { listId; dimension } }
  | { kind: 'boolean'; key; label; default? }
```

### 3.2 Bloques (conjunto cerrado) y fase de ejecución
| Bloque | Fase | Qué hace |
|---|---|---|
| `area` | medida | ancho×alto por pieza, unidad de entrada, redondeo hacia arriba a múltiplo (`roundTo` m), mínimo facturable por pieza, × cantidad → `area_m2` |
| `perimeter` | medida | 2×(ancho+alto) por pieza × cantidad → `perimeter_lm` |
| `measure` | medida | toma un input numérico directo (`lm`, `pz`, `h`) → variable nombrada |
| `base_price` | material | medida × tarifa; tarifa fija o búsqueda en lista de precios por inputs |
| `surcharge` | proceso | recargo `percent` sobre material, `fixed`, o `per_measure`; condicional a un input (`when`) |
| `accessory` | accesorio | artículo con precio fijo o de lista; cantidad = n por pieza o por cada X ml; condicional |
| `waste` | ajuste | % sobre líneas de material (y opcionalmente proceso) |
| `labor` | mano de obra | fija, por pieza, por medida o % de materiales |
| `minimum_charge` | cierre | si el subtotal del item < mínimo, agrega línea de ajuste |

El esquema Zod valida que el orden de bloques respete las fases (medida → material → proceso → accesorio → ajuste → mano de obra → cierre) y que toda referencia (`input`, `listId`, variable de medida) exista.

### 3.3 Resultado
```ts
interface QuoteLineResult {
  measures: { area_m2?: number; perimeter_lm?: number; pieces: number; [k: string]: number | undefined }
  lines: { label; kind: 'material'|'process'|'accessory'|'labor'|'adjustment'; quantity; unit; unitPriceCents; amountCents }[]
  subtotalCents: number
  description: string        // "Cancel de baño templado 9 mm · 1.20 × 1.80 m · 2 pz"
  warnings: string[]         // p. ej. "precio no encontrado en lista para espesor 12"
  engineVersion: string
}
```
Errores de entrada devuelven `Result` tipado (`{ ok: false, errors }`), nunca excepciones.

### 3.4 Ejemplo: cancel de baño templado
Inputs: `ancho` mm, `alto` mm, `piezas`, `espesor` (lista "Vidrio templado"), `herraje` (acero/aluminio), `instalacion` booleano.
Bloques: `area(roundTo 0.05, minPerPiece 0.5)` → `base_price(area × lista[espesor])` → `surcharge(per_measure pulido canto × perimeter)` → `accessory(kit herraje × 1 por pieza, precio por herraje)` → `waste(10% material)` → `labor(when instalacion, por pieza)` → `minimum_charge(800)`.

### 3.5 Plantillas de giro
En código (`packages/quoting/src/templates/*.ts`), con versión y tests: `glass` (vidrio flotado claro/tintado 3–12 mm, templado, espejo, cancel de baño, ventana aluminio serie 2/3, pulido, canto, herrajes), `plumbing`, `electrical`, `hvac`, `sewing`, `general`. Al elegir giro se copian a la cuenta listas de precios y productos; después son datos editables.

### 3.6 Confianza
El cliente nunca envía precios. Al guardar una cotización el servidor recarga producto y listas de la organización, recalcula con el motor, guarda `input`, `breakdown`, `pricing_snapshot` y escribe `quantity/unit_price/subtotal` derivados.

## 4. UI

- **Onboarding**: paso nuevo "¿Cómo trabajas?" (persona, grupo, empresa) y "¿Tu giro?" (tarjetas); aplica plantilla y crea `public_profiles` en borrador.
- **Listas de precios** `/dashboard/price-lists`: tabla editable por dimensiones, ajuste masivo %, sin `<select>` nativo (Combobox).
- **Servicios**: interruptor "Producto configurable"; editor de entradas y bloques con formulario por tipo de bloque y **calculadora de prueba** en vivo.
- **Nueva cotización**: al elegir un producto configurable se muestra `ConfigurableItemForm` (entradas dinámicas, vista previa con el motor, desglose plegable). El archivo actual de 891 líneas no crece: el formulario y el desglose van a componentes propios.
- **PDF**: cada item muestra medidas; sección "Lista de materiales" agregada por artículo.
- **Vitrina pública** `/p/[slug]` (Server Component, SEO, OpenGraph): encabezado, servicios, portafolio, reseñas, botones WhatsApp y "Pedir cotización".
- **Reseña** `/r/[token]`: estrellas + comentario, sin cuenta.
- **Panel**: `/dashboard/vitrina` (editar perfil, publicar, vista previa, descargar tarjeta QR), `/dashboard/solicitudes` (bandeja, convertir en cliente + cotización borrador, descartar), en detalle de cotización: fotos antes/después y "Pedir reseña" cuando está cobrada (copia enlace, `wa.me`, correo).
- Reglas de formularios del proyecto: Combobox, fecha por defecto hoy, `*` en requeridos, Cancelar izquierda / Enviar derecha.

## 5. Deploy e infraestructura (VPS 2.25.244.18)

Regla de coexistencia §0 de la skill `hostinger-vps` en cada paso: estado real antes, respaldo fechado, smoke de todos los dominios antes y después, solo bloque propio.

| Pieza | Diseño |
|---|---|
| `/opt/cotizapro-supabase` | compose propio: `cotizapro-db` (misma imagen supabase/postgres ya en disco), `cotizapro-auth`, `cotizapro-rest`, `cotizapro-storage`, `cotizapro-realtime`. Sin Studio, Kong, analytics, vector, imgproxy ni edge functions. Puertos solo internos; db en `127.0.0.1:5434` para psql. |
| Gateway | Caddy enruta `api.cotizapro.mariobustos.io` `/auth/v1/*`→auth:9999, `/rest/v1/*`→rest:3000, `/storage/v1/*`→storage:5000, `/realtime/v1/*`→realtime:4000 (con `handle_path`). PostgREST valida el JWT `anon`/`authenticated`. |
| `/opt/cotizapro-deploy` | compose de `cotizapro-web` (Dockerfile del repo, build args `NEXT_PUBLIC_*`), `.env` 600. |
| Redes | servicios con nombre prefijado `cotizapro-*`; se unen a `tokenpass-deploy_default` para que Caddy los alcance; red interna `cotizapro_internal`. |
| Caddy | bloque `# >>> cotizapro` / `# <<< cotizapro` anexado conservando inode, registrado en `/opt/bin/caddy-guard.d/cotizapro.caddy`, `caddy reload`. |
| DNS | A `cotizapro` y `api.cotizapro` → 2.25.244.18 vía MCP hostinger-dns. |
| Auth | `GOTRUE_MAILER_AUTOCONFIRM=true` en beta (sin SMTP real) hasta tener llave Resend. `SITE_URL=https://cotizapro.mariobustos.io`. |
| Correo | `RESEND_API_KEY` propia de CotizaPro (pendiente de que el usuario la cree); script `/opt/bin/cotizapro-set-resend-key.sh`. |
| Cron | `/etc/cron.d/cotizapro`: recordatorios cada hora (curl con `CRON_SECRET`), respaldo `pg_dump` 03:50 con retención 14 días, reseteo de cuentas demo 04:30. |
| Código | `rsync` del árbol de trabajo (sin `node_modules`, `.next`) a `/opt/cotizapro/src`; versión previa en `/opt/cotizapro.prev`. Sin push a GitHub. |
| Inventario | alta en `~/.claude/docs/infra/hostinger-vps-inventario.md`. |

Presupuesto de RAM: objetivo < 1.5 GB para todo CotizaPro en reposo; se mide antes y después.

## 6. Pruebas y evidencia

- **Unit (Vitest)** en `packages/quoting`: cada bloque, validación de orden y referencias, casos dorados por plantilla (cancel de baño, ventana serie 3, espejo, plomería), redondeo de centavos. Objetivo ≥ 90 % en el paquete.
- **Unit app**: schemas Zod de cotizapro y nuevas rutas.
- **Seed** `apps/web/scripts/seed/` (TypeScript, supabase-js admin, idempotente por UUIDs fijos): MEGAGLASS (empresa, vidrio), Cuadrilla Voltaje (grupo, electricidad), Plomería Don Beto (persona), Costuras Lupita (persona), ClimaSol (empresa HVAC, existente). Clientes de Monterrey, 90 días de cotizaciones en todos los estados, pagos, agenda, recordatorios, plantillas, reseñas, fotos, solicitudes. Las cotizaciones de productos configurables se calculan con el motor.
- **E2E**: los 18 specs existentes + `20-workshop-journey`, `21-configurable-product`, `22-public-profile`, `23-review-flow`, `24-quote-request`.
- **Producción**: smoke de salud, vitrina de una cuenta demo, login demo, jornada E2E contra la cuenta demo.
- **Pruebas de uso** guiadas en navegador con capturas evaluadas, documentadas en el handoff.
