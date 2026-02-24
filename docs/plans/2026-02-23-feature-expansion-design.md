# CotizaPro — Feature Expansion Design
**Date:** 2026-02-23
**Status:** Approved
**Approach:** Feature Sprints by Daily Impact (Option A)

---

## Context

CotizaPro MVP is complete (33/33 tasks). The system handles clients, service catalog, quotes (draft→accepted), reminders, analytics, PDF/WhatsApp/email delivery, and export. The next phase expands the product for both solo technicians and small teams (2-5 people).

---

## Sprint Order & Module Overview

| Sprint | Module | New Routes | DB Changes |
|--------|--------|------------|------------|
| 1 | Kanban + Extended States + Quick Access | None (view toggle) | Extend `quotes.status` enum |
| 2 | Payments / Anticipos | `/api/quotes/[id]/payments` | New `quote_payments` table |
| 3 | Work Calendar | `/api/calendar/events` | New `work_events` table |
| 4 | Templates UI + Promotions | UI on existing `/api/templates` | Add 2 columns to `quote_templates` |
| 5 | Income Analytics (Enhanced) | Extend `/api/analytics/trends` | None (uses quote_payments data) |
| 6 | Mobile UX + Quick Access FAB | None (UI polish) | None |

---

## Sprint 1: Kanban View + Extended Quote States + Quick Access

### Quote Status Lifecycle (Extended)

```
draft → sent → viewed → accepted → en_instalacion → completado → cobrado
                                 ↘ rejected
                                 ↘ expired
```

New statuses added: `en_instalacion`, `completado`, `cobrado`

### Database Migration

```sql
-- Extend status CHECK constraint (additive, retrocompatible)
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN (
    'draft','sent','viewed','accepted','rejected','expired',
    'en_instalacion','completado','cobrado'
  ));
```

### Kanban UI

**Route:** `/dashboard/quotes` (adds view toggle, no new route)

- Toggle control: "Lista | Kanban" in page header
- Kanban columns (left to right): Borrador | Enviadas | Vistas | Aceptadas | En Instalación | Completadas | Cobradas
- Collapsed accordeon: Rechazadas, Expiradas (visible on expand, not primary flow)
- Each card shows: client name, quote number, total amount, days since last update
- Badge: if quote has partial payments with pending balance → amber "Saldo Pendiente" badge
- Drag-and-drop between columns → PATCH `/api/quotes/[id]` with new status
- Transition rules: forward moves allowed freely; backward moves require confirmation dialog

### Quick Access (also implemented in Sprint 1)

**Desktop:** 3 shortcut buttons in dashboard header nav: `+ Cotización | + Cliente | + Evento`

**Mobile:** Floating Action Button (FAB) fixed bottom-right (`z-50`), expands on tap to show 3 options with icons and labels.

**Component:** `components/dashboard/quick-actions.tsx` — shared between header (desktop) and FAB (mobile)

---

## Sprint 2: Payments / Anticipos

### New Table: `quote_payments`

```sql
CREATE TABLE quote_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id         UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  amount           NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_type     TEXT NOT NULL CHECK (payment_type IN ('anticipo','parcial','liquidacion')),
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('efectivo','transferencia','cheque','otro')),
  payment_date     DATE NOT NULL,
  notes            TEXT,
  received_by      UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quote_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view payments"
  ON quote_payments FOR SELECT
  USING (organization_id = (auth.jwt()->>'organization_id')::UUID);

CREATE POLICY "org members can insert payments"
  ON quote_payments FOR INSERT
  WITH CHECK (organization_id = (auth.jwt()->>'organization_id')::UUID);

CREATE POLICY "org admins can delete payments"
  ON quote_payments FOR DELETE
  USING (
    organization_id = (auth.jwt()->>'organization_id')::UUID
    AND (auth.jwt()->>'role') IN ('owner','admin')
  );

CREATE INDEX idx_quote_payments_quote_id ON quote_payments(quote_id);
CREATE INDEX idx_quote_payments_org_id ON quote_payments(organization_id);
CREATE INDEX idx_quote_payments_payment_date ON quote_payments(payment_date);
```

### API Endpoints

- `GET /api/quotes/[id]/payments` — list payments for a quote, returns total_paid, total_pending
- `POST /api/quotes/[id]/payments` — register a payment (validates amount does not exceed remaining balance)
- `DELETE /api/quotes/[id]/payments/[paymentId]` — remove a payment (admin/owner only)
- `GET /api/quotes/[id]/payments/receipt/[paymentId]` — generate and return PDF receipt

### Quote Detail UI Changes (`/quotes/[id]`)

New "Pagos" section below quote items:
- Progress bar: `paid_amount / quote_total` with percentage
- Table: Date | Type | Method | Amount | Received by | Actions
- "Registrar Pago" button → modal form (amount, type, method, date, notes)
- Auto-suggestion: when `total_paid >= quote.total`, prompt to move status to `cobrado`
- "Comprobante PDF" button per payment row

### PDF Receipt (`lib/integrations/pdf.ts` extension)

`generatePaymentReceiptPDF(payment, quote, client, organization)` returns Buffer:
- Header: organization name + logo
- Body: Receipt #, date, client name, reference quote number, amount, payment type/method, notes
- Footer: "Firma de recibido" blank line, "Este comprobante es válido como recibo de pago"

---

## Sprint 3: Work Calendar / Agenda

### New Table: `work_events`

```sql
CREATE TABLE work_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_id         UUID REFERENCES quotes(id) ON DELETE SET NULL,
  assigned_to      UUID REFERENCES auth.users(id),
  title            TEXT NOT NULL,
  event_type       TEXT NOT NULL CHECK (event_type IN (
    'instalacion','medicion','visita_tecnica','mantenimiento','otro'
  )),
  scheduled_start  TIMESTAMPTZ NOT NULL,
  scheduled_end    TIMESTAMPTZ NOT NULL,
  address          TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente','en_camino','completado','cancelado'
  )),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_event_duration CHECK (scheduled_end > scheduled_start)
);

ALTER TABLE work_events ENABLE ROW LEVEL SECURITY;
-- RLS: same org pattern as other tables

CREATE INDEX idx_work_events_org_start ON work_events(organization_id, scheduled_start);
CREATE INDEX idx_work_events_client_id ON work_events(client_id);
CREATE INDEX idx_work_events_assigned_to ON work_events(assigned_to);
```

### API Endpoints

- `GET /api/calendar/events?start=ISO&end=ISO` — events in date range for calendar view
- `POST /api/calendar/events` — create work event
- `GET /api/calendar/events/[id]` — event detail
- `PATCH /api/calendar/events/[id]` — update (including status, rescheduling)
- `DELETE /api/calendar/events/[id]` — cancel/delete

### UI: `/dashboard/calendar`

**Week View (default):**
- 7-column grid, Mon-Sun, rows by hour (8am–8pm by default)
- Events rendered as positioned blocks with color by type:
  - Instalación: blue, Medición: amber, Visita técnica: purple, Mantenimiento: green, Otro: gray
- Click on empty slot → quick-create modal (pre-fills date/time)
- Click on event → side panel with details + edit + status change buttons

**Day View:**
- Single day, full hour breakdown, accessible from mobile
- Navigation arrows: previous/next day

**Sidebar navigation:** Calendar icon added between Recordatorios and Analytics

**Client Integration:** `/clients/[id]` page gets "Agendar Visita" button that pre-fills client in calendar event form

**Quote Integration:** When creating event, optional field "Cotización relacionada" filters to accepted/en_instalacion quotes for that client

**Team Support:** "Asignar a" dropdown visible when org has multiple members; calendar can filter by team member

---

## Sprint 4: Templates UI + Promotions

### DB Changes to `quote_templates`

```sql
ALTER TABLE quote_templates
  ADD COLUMN promotional_label TEXT,
  ADD COLUMN promotional_valid_until DATE;
```

### UI: `/dashboard/templates` (new route)

- Card grid of templates: name, category, usage count, discount %, promotional badge if active
- Create/Edit form: name, category, default items (table with quantity/service/price), notes, terms, discount, promo label + date
- "Usar Plantilla" button → redirects to `/quotes/new?template_id=UUID` which pre-populates all fields
- Active/inactive toggle per template

### Quote Creation Integration

- `/quotes/new` gets "Cargar desde plantilla" button (top of form)
- Selecting a template fills: items, notes, terms, discount, valid_until (calculated from template's `valid_days`)
- If template has active promo label: shown as amber banner "Promo activa: [label]"

---

## Sprint 5: Enhanced Income Analytics

### Analytics API Extensions

`GET /api/analytics/income?period=week|month&compare=true`

Returns:
```json
{
  "current_period": { "total_paid": 48000, "label": "Febrero 2026" },
  "previous_period": { "total_paid": 39000, "label": "Enero 2026" },
  "change_pct": 23.1,
  "weekly_breakdown": [
    { "week": "Feb 1-7", "amount": 12000 },
    { "week": "Feb 8-14", "amount": 18000 }
  ],
  "pipeline_value": 125000,
  "pending_balance": 35000
}
```

### Analytics UI Extensions (`/dashboard/analytics`)

New section "Ingresos" with:
- Monthly bar chart with current vs previous month overlay
- Weekly bars (current month)
- KPI cards: Pipeline Total | Saldo Pendiente | Cobrado este Mes | vs Mes Anterior (↑/↓ %)
- Data source: `quote_payments` (actual collected) + `quotes` totals for pipeline

---

## Sprint 6: Mobile UX Polish

### FAB Component

`components/dashboard/fab.tsx` — client component:
- Fixed position `bottom-6 right-6 z-50`
- Hidden on `lg:hidden` (desktop uses header shortcuts)
- Tap to expand: 3 action pills slide up with labels
- Options: + Nueva Cotización | + Cliente | + Evento de Agenda

### Quote Detail Mobile

- "Enviar por WhatsApp" and "Enviar por Email" buttons moved to sticky bottom bar on mobile
- Quote total and status badge always visible in fixed header when scrolling on mobile

### Dashboard Home Mobile

- Stats cards stack to 2x2 grid on mobile (currently single column)
- Recent activity limited to 5 items on mobile to reduce scroll

---

## Cross-Cutting Concerns

### TypeScript Types

New types in `types/database.types.ts`:
- `QuotePayment`, `QuotePaymentWithDetails`
- `WorkEvent`, `WorkEventWithDetails`
- Extended `QuoteStatus` union type

### Zod Schemas

New schemas in `lib/validations/cotizapro.ts`:
- `createQuotePaymentSchema`
- `createWorkEventSchema`, `updateWorkEventSchema`

### RLS Consistency

All new tables follow the established pattern:
- `organization_id` on every table
- RLS enabled, policies using `auth.jwt()->>'organization_id'`
- Role checks for admin-only operations (delete, sensitive updates)

### Backward Compatibility

- All 338 existing E2E tests remain valid (no breaking schema changes)
- New quote statuses are additive; existing status filters continue working
- API response shapes extended, not changed

---

## Estimated Scope

| Sprint | Migrations | API Files | UI Files | Complexity |
|--------|------------|-----------|----------|------------|
| 1: Kanban + FAB | 1 (extend enum) | 0 | 3 | Low |
| 2: Payments | 1 (new table) | 2 | 2 + modal | Medium |
| 3: Calendar | 1 (new table) | 5 | 4 (week+day+detail+form) | High |
| 4: Templates UI | 1 (2 columns) | 0 (backend exists) | 3 | Low |
| 5: Analytics+ | 0 | 1 (extend) | 1 (extend) | Low |
| 6: Mobile Polish | 0 | 0 | 3 components | Low |

**Total new DB tables:** 2 (`quote_payments`, `work_events`)
**Total new API routes:** ~10
**Total new/modified UI pages:** ~12
