# CotizaPro Feature Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend CotizaPro MVP with Kanban view, payment tracking, work calendar, templates UI, enhanced analytics, and mobile UX improvements across 6 focused sprints.

**Architecture:** All new features are additive to the existing Next.js 15 App Router + Supabase RLS stack. New DB tables (`quote_payments`, `work_events`) follow the established organization_id pattern. UI components extend existing routes where possible (quotes page gets Kanban toggle, analytics page gets income section) and add only 2 new routes (`/dashboard/calendar`, `/dashboard/templates`).

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase PostgreSQL + RLS, TailwindCSS, Zod validation, jsPDF (existing), Playwright E2E

**Design doc:** `docs/plans/2026-02-23-feature-expansion-design.md`

---

## Sprint 1: Kanban View + Extended Quote States + Quick Access

### Task 1.1: DB Migration — Extend Quote Status Enum

**Files:**
- Create: `supabase/migrations/020_extend_quote_status.sql`

**Step 1: Write the migration**

```sql
-- supabase/migrations/020_extend_quote_status.sql
-- Extend quotes.status CHECK constraint to include work lifecycle statuses
-- Additive change — all existing statuses remain valid

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN (
    'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired',
    'en_instalacion', 'completado', 'cobrado'
  ));
```

**Step 2: Apply migration**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" \
  -f supabase/migrations/020_extend_quote_status.sql
```

Expected: `ALTER TABLE`

**Step 3: Verify constraint**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" \
  -c "SELECT conname, consrc FROM pg_constraint WHERE conname = 'quotes_status_check';"
```

Expected: Row showing the constraint with all 9 statuses.

**Step 4: Commit**

```bash
git add supabase/migrations/020_extend_quote_status.sql
git commit -m "feat(db): extend quote status enum with en_instalacion, completado, cobrado"
```

---

### Task 1.2: TypeScript — Extended QuoteStatus Type

**Files:**
- Modify: `lib/validations/cotizapro.ts`
- Modify: `types/database.types.ts` (if QuoteStatus type exists there)

**Step 1: Update Zod schema in `lib/validations/cotizapro.ts`**

Find the existing `quoteStatusSchema` (or `status` enum in `createQuoteSchema`) and extend it:

```typescript
export const quoteStatusSchema = z.enum([
  'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired',
  'en_instalacion', 'completado', 'cobrado',
]);

export type QuoteStatus = z.infer<typeof quoteStatusSchema>;
```

**Step 2: Check for status type in `types/database.types.ts`**

If a `QuoteStatus` type is defined there, update it to match. Search first:

```bash
grep -r "QuoteStatus\|quote.*status" types/ --include="*.ts"
```

**Step 3: Verify TypeScript compiles**

```bash
npm run type-check
```

Expected: No errors related to status type.

**Step 4: Commit**

```bash
git add lib/validations/cotizapro.ts types/
git commit -m "feat(types): extend QuoteStatus with work lifecycle statuses"
```

---

### Task 1.3: API — Allow PATCH to New Statuses

**Files:**
- Modify: `app/api/quotes/[id]/route.ts`

**Step 1: Read the current PATCH handler**

Read `app/api/quotes/[id]/route.ts` to understand current validation.

**Step 2: Verify the PATCH handler uses the Zod schema**

The PATCH handler should use `quoteStatusSchema` for validation. If it has a hardcoded enum, update it to use `quoteStatusSchema` from `lib/validations/cotizapro.ts`.

Look for something like:
```typescript
// Find this pattern
status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'])
// Replace with
status: quoteStatusSchema.optional()
```

**Step 3: Add backward-move confirmation guard (server-side)**

The API should allow all status transitions. Backward-move confirmation is handled on the frontend. No server-side blocking needed.

**Step 4: Run type-check**

```bash
npm run type-check
```

**Step 5: Commit**

```bash
git add app/api/quotes/[id]/route.ts
git commit -m "feat(api): allow new quote work statuses in PATCH endpoint"
```

---

### Task 1.4: UI — Kanban Board Component

**Files:**
- Create: `components/dashboard/quotes-kanban.tsx`

**Step 1: Write the Kanban component**

```typescript
// components/dashboard/quotes-kanban.tsx
'use client'

import { useState, useCallback } from 'react'
import { QuoteStatus } from '@/lib/validations/cotizapro'

interface KanbanQuote {
  id: string
  quote_number: string
  clients: { name: string | null; company_name: string | null } | null
  total_amount: number
  status: QuoteStatus
  updated_at: string
  has_pending_balance?: boolean
}

const KANBAN_COLUMNS: { key: QuoteStatus; label: string }[] = [
  { key: 'draft', label: 'Borrador' },
  { key: 'sent', label: 'Enviadas' },
  { key: 'viewed', label: 'Vistas' },
  { key: 'accepted', label: 'Aceptadas' },
  { key: 'en_instalacion', label: 'En Instalación' },
  { key: 'completado', label: 'Completadas' },
  { key: 'cobrado', label: 'Cobradas' },
]

const COLLAPSED_COLUMNS: { key: QuoteStatus; label: string }[] = [
  { key: 'rejected', label: 'Rechazadas' },
  { key: 'expired', label: 'Expiradas' },
]

// Forward transitions allowed freely; backward requires confirmation
function isBackwardMove(from: QuoteStatus, to: QuoteStatus): boolean {
  const order = KANBAN_COLUMNS.map(c => c.key)
  return order.indexOf(to) < order.indexOf(from)
}

interface Props {
  quotes: KanbanQuote[]
  onStatusChange: (quoteId: string, newStatus: QuoteStatus) => Promise<void>
}

export function QuotesKanban({ quotes, onStatusChange }: Props) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [confirmMove, setConfirmMove] = useState<{
    quoteId: string
    from: QuoteStatus
    to: QuoteStatus
  } | null>(null)

  const handleDragStart = useCallback((quoteId: string) => {
    setDragging(quoteId)
  }, [])

  const handleDrop = useCallback(
    async (targetStatus: QuoteStatus) => {
      if (!dragging) return
      const quote = quotes.find(q => q.id === dragging)
      if (!quote || quote.status === targetStatus) {
        setDragging(null)
        return
      }
      if (isBackwardMove(quote.status, targetStatus)) {
        setConfirmMove({ quoteId: dragging, from: quote.status, to: targetStatus })
        setDragging(null)
        return
      }
      setDragging(null)
      await onStatusChange(dragging, targetStatus)
    },
    [dragging, quotes, onStatusChange]
  )

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / 86400000)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map(col => {
        const colQuotes = quotes.filter(q => q.status === col.key)
        return (
          <div
            key={col.key}
            className="flex-shrink-0 w-64 bg-gray-50 rounded-lg p-3"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
              <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                {colQuotes.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {colQuotes.map(quote => (
                <div
                  key={quote.id}
                  draggable
                  onDragStart={() => handleDragStart(quote.id)}
                  className="bg-white rounded-md p-3 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                >
                  <div className="text-xs font-mono text-gray-400 mb-1">
                    #{quote.quote_number}
                  </div>
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {quote.clients?.company_name ?? quote.clients?.name ?? '—'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-gray-900">
                      ${Number(quote.total_amount).toLocaleString('es-MX')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {daysSince(quote.updated_at)}d
                    </span>
                  </div>
                  {quote.has_pending_balance && (
                    <span className="mt-1 inline-block text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                      Saldo Pendiente
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Collapsed columns */}
      <details className="flex-shrink-0">
        <summary className="cursor-pointer text-sm text-gray-500 px-2 py-1">
          Archivadas ({COLLAPSED_COLUMNS.reduce((acc, c) => acc + quotes.filter(q => q.status === c.key).length, 0)})
        </summary>
        <div className="flex gap-3 mt-2">
          {COLLAPSED_COLUMNS.map(col => (
            <div key={col.key} className="w-64 bg-gray-100 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">{col.label}</h3>
              {quotes.filter(q => q.status === col.key).map(quote => (
                <div key={quote.id} className="bg-white rounded p-2 text-xs text-gray-600 mb-1">
                  #{quote.quote_number} — {quote.clients?.name ?? '—'}
                </div>
              ))}
            </div>
          ))}
        </div>
      </details>

      {/* Backward move confirmation dialog */}
      {confirmMove && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Mover hacia atrás</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Confirmas mover esta cotización de{' '}
              <strong>{KANBAN_COLUMNS.find(c => c.key === confirmMove.from)?.label}</strong>{' '}
              a <strong>{KANBAN_COLUMNS.find(c => c.key === confirmMove.to)?.label}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmMove(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const { quoteId, to } = confirmMove
                  setConfirmMove(null)
                  await onStatusChange(quoteId, to)
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Run type-check**

```bash
npm run type-check
```

**Step 3: Commit**

```bash
git add components/dashboard/quotes-kanban.tsx
git commit -m "feat(ui): add QuotesKanban drag-and-drop component"
```

---

### Task 1.5: UI — Integrate Kanban into Quotes Page

**Files:**
- Modify: `app/(dashboard)/dashboard/quotes/page.tsx`

**Step 1: Read current quotes page**

Read `app/(dashboard)/dashboard/quotes/page.tsx` to understand current structure.

**Step 2: Add view toggle state and import**

Add view toggle (Lista / Kanban) to the page header. Since this is a Server Component, the toggle needs to be a Client Component wrapper or use URL search params.

Use URL search param approach (no `useState` in Server Component):

```typescript
// In the page component, read search params
const view = searchParams?.view === 'kanban' ? 'kanban' : 'list'
```

**Step 3: Add toggle buttons in page header**

```tsx
// Toggle buttons — links that change the ?view= param
<div className="flex gap-1 border border-gray-200 rounded-lg p-1">
  <Link
    href="/dashboard/quotes?view=list"
    className={`px-3 py-1 text-sm rounded-md transition-colors ${
      view === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    Lista
  </Link>
  <Link
    href="/dashboard/quotes?view=kanban"
    className={`px-3 py-1 text-sm rounded-md transition-colors ${
      view === 'kanban' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    Kanban
  </Link>
</div>
```

**Step 4: Create client wrapper for Kanban**

Create `components/dashboard/quotes-kanban-wrapper.tsx` as a client component that:
- Receives quotes as props
- Calls `fetch('/api/quotes/:id', { method: 'PATCH', body: JSON.stringify({ status }) })` on drag
- Uses `useRouter().refresh()` to re-fetch after status change

```typescript
// components/dashboard/quotes-kanban-wrapper.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { QuotesKanban } from './quotes-kanban'
import { QuoteStatus } from '@/lib/validations/cotizapro'

interface Props {
  quotes: Parameters<typeof QuotesKanban>[0]['quotes']
}

export function QuotesKanbanWrapper({ quotes }: Props) {
  const router = useRouter()

  const handleStatusChange = useCallback(async (quoteId: string, newStatus: QuoteStatus) => {
    await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    router.refresh()
  }, [router])

  return <QuotesKanban quotes={quotes} onStatusChange={handleStatusChange} />
}
```

**Step 5: Render conditionally in quotes page**

```tsx
{view === 'kanban' ? (
  <QuotesKanbanWrapper quotes={quotesData} />
) : (
  // existing list table
)}
```

**Step 6: Run type-check and build**

```bash
npm run type-check && npm run build
```

**Step 7: Commit**

```bash
git add app/(dashboard)/dashboard/quotes/page.tsx \
        components/dashboard/quotes-kanban-wrapper.tsx
git commit -m "feat(ui): integrate kanban view toggle in quotes page"
```

---

### Task 1.6: UI — Quick Access Component

**Files:**
- Create: `components/dashboard/quick-actions.tsx`
- Modify: `components/dashboard/header.tsx`
- Create: `components/dashboard/fab.tsx`
- Modify: `app/(dashboard)/layout.tsx`

**Step 1: Create `quick-actions.tsx`**

```typescript
// components/dashboard/quick-actions.tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'

const QUICK_LINKS = [
  { href: '/dashboard/quotes/new', label: '+ Cotización' },
  { href: '/dashboard/clients/new', label: '+ Cliente' },
  { href: '/dashboard/calendar/new', label: '+ Evento' },
]

export function QuickActions({ variant }: { variant: 'header' | 'fab' }) {
  if (variant === 'header') {
    return (
      <div className="hidden lg:flex items-center gap-2">
        {QUICK_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    )
  }
  return null
}
```

**Step 2: Add `QuickActions` to `header.tsx`**

Read `components/dashboard/header.tsx`, then add `<QuickActions variant="header" />` in the header nav area.

**Step 3: Create `fab.tsx`**

```typescript
// components/dashboard/fab.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, X, FileText, Users, Calendar } from 'lucide-react'

const FAB_OPTIONS = [
  { href: '/dashboard/quotes/new', label: 'Nueva Cotización', icon: FileText },
  { href: '/dashboard/clients/new', label: 'Nuevo Cliente', icon: Users },
  { href: '/dashboard/calendar/new', label: 'Nuevo Evento', icon: Calendar },
]

export function FAB() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50 lg:hidden">
      <div className={`flex flex-col-reverse gap-3 mb-3 transition-all ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        {FAB_OPTIONS.map(opt => (
          <Link
            key={opt.href}
            href={opt.href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 bg-white border border-gray-200 shadow-lg rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <opt.icon className="w-4 h-4" />
            {opt.label}
          </Link>
        ))}
      </div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
        aria-label={open ? 'Cerrar menú' : 'Acciones rápidas'}
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  )
}
```

**Step 4: Add `FAB` to dashboard layout**

Read `app/(dashboard)/layout.tsx`, then add `<FAB />` before the closing `</body>` or at the end of the layout wrapper.

**Step 5: Run build**

```bash
npm run build
```

**Step 6: Commit**

```bash
git add components/dashboard/quick-actions.tsx \
        components/dashboard/fab.tsx \
        components/dashboard/header.tsx \
        app/(dashboard)/layout.tsx
git commit -m "feat(ui): add quick access shortcuts and mobile FAB"
```

---

## Sprint 2: Payments / Anticipos

### Task 2.1: DB Migration — quote_payments Table

**Files:**
- Create: `supabase/migrations/021_create_quote_payments.sql`

**Step 1: Write the migration**

```sql
-- supabase/migrations/021_create_quote_payments.sql

CREATE TABLE quote_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id         UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  amount           NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_type     TEXT NOT NULL CHECK (payment_type IN ('anticipo', 'parcial', 'liquidacion')),
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('efectivo', 'transferencia', 'cheque', 'otro')),
  payment_date     DATE NOT NULL,
  notes            TEXT,
  received_by      UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quote_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view payments"
  ON quote_payments FOR SELECT
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "org members can insert payments"
  ON quote_payments FOR INSERT
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "org admins can delete payments"
  ON quote_payments FOR DELETE
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
    AND (auth.jwt() ->> 'role') IN ('owner', 'admin')
  );

CREATE INDEX idx_quote_payments_quote_id ON quote_payments(quote_id);
CREATE INDEX idx_quote_payments_org_id ON quote_payments(organization_id);
CREATE INDEX idx_quote_payments_payment_date ON quote_payments(payment_date);
```

**Step 2: Apply migration**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" \
  -f supabase/migrations/021_create_quote_payments.sql
```

Expected: `CREATE TABLE`, `ALTER TABLE`, 3x `CREATE POLICY`, 3x `CREATE INDEX`

**Step 3: Verify table exists**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" \
  -c "\d quote_payments"
```

**Step 4: Commit**

```bash
git add supabase/migrations/021_create_quote_payments.sql
git commit -m "feat(db): add quote_payments table with RLS"
```

---

### Task 2.2: Zod Schemas for Payments

**Files:**
- Modify: `lib/validations/cotizapro.ts`

**Step 1: Add payment schemas**

```typescript
// Add to lib/validations/cotizapro.ts

export const createQuotePaymentSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0'),
  payment_type: z.enum(['anticipo', 'parcial', 'liquidacion']),
  payment_method: z.enum(['efectivo', 'transferencia', 'cheque', 'otro']),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  notes: z.string().max(500).optional(),
})

export type CreateQuotePaymentInput = z.infer<typeof createQuotePaymentSchema>
```

**Step 2: Add TypeScript types**

If `types/database.types.ts` exists, add:

```typescript
export interface QuotePayment {
  id: string
  organization_id: string
  quote_id: string
  amount: string // numeric columns return as string from Supabase
  payment_type: 'anticipo' | 'parcial' | 'liquidacion'
  payment_method: 'efectivo' | 'transferencia' | 'cheque' | 'otro'
  payment_date: string
  notes: string | null
  received_by: string | null
  created_at: string
}
```

**Step 3: Run type-check**

```bash
npm run type-check
```

**Step 4: Commit**

```bash
git add lib/validations/cotizapro.ts types/
git commit -m "feat(types): add QuotePayment schemas and types"
```

---

### Task 2.3: API — Payments Route

**Files:**
- Create: `app/api/quotes/[id]/payments/route.ts`
- Create: `app/api/quotes/[id]/payments/[paymentId]/route.ts`

**Step 1: Create GET + POST handler**

```typescript
// app/api/quotes/[id]/payments/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createQuotePaymentSchema } from '@/lib/validations/cotizapro'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: quoteId } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: payments, error } = await supabase
    .from('quote_payments')
    .select('id, amount, payment_type, payment_method, payment_date, notes, received_by, created_at')
    .eq('quote_id', quoteId)
    .order('payment_date', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch quote total for pending calculation
  const { data: quote } = await supabase
    .from('quotes')
    .select('total_amount')
    .eq('id', quoteId)
    .single()

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0
  const totalPending = quote ? Math.max(0, Number(quote.total_amount) - totalPaid) : null

  return NextResponse.json({ data: payments, total_paid: totalPaid, total_pending: totalPending })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: quoteId } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = user.user_metadata?.organization_id
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const body = await req.json()
  const parsed = createQuotePaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // Validate amount doesn't exceed remaining balance
  const { data: existing } = await supabase
    .from('quote_payments')
    .select('amount')
    .eq('quote_id', quoteId)
    .limit(100)

  const { data: quote } = await supabase
    .from('quotes')
    .select('total_amount')
    .eq('id', quoteId)
    .single()

  if (quote) {
    const alreadyPaid = (existing ?? []).reduce((s, p) => s + Number(p.amount), 0)
    const remaining = Number(quote.total_amount) - alreadyPaid
    if (parsed.data.amount > remaining + 0.01) {
      return NextResponse.json(
        { error: `El monto excede el saldo pendiente ($${remaining.toFixed(2)})` },
        { status: 422 }
      )
    }
  }

  const { data, error } = await supabase
    .from('quote_payments')
    .insert({
      organization_id: orgId,
      quote_id: quoteId,
      received_by: user.id,
      ...parsed.data,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
```

**Step 2: Create DELETE handler**

```typescript
// app/api/quotes/[id]/payments/[paymentId]/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const { paymentId } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('quote_payments')
    .delete()
    .eq('id', paymentId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

**Step 3: Run type-check**

```bash
npm run type-check
```

**Step 4: Commit**

```bash
git add app/api/quotes/[id]/payments/
git commit -m "feat(api): add payments CRUD endpoints for quotes"
```

---

### Task 2.4: UI — Payment Section in Quote Detail

**Files:**
- Modify: `app/(dashboard)/dashboard/quotes/[id]/page.tsx`
- Create: `components/dashboard/payment-section.tsx`

**Step 1: Read current quote detail page**

Read `app/(dashboard)/dashboard/quotes/[id]/page.tsx`.

**Step 2: Create `payment-section.tsx` (client component)**

```typescript
// components/dashboard/payment-section.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Payment {
  id: string
  amount: string
  payment_type: 'anticipo' | 'parcial' | 'liquidacion'
  payment_method: 'efectivo' | 'transferencia' | 'cheque' | 'otro'
  payment_date: string
  notes: string | null
}

const TYPE_LABELS = { anticipo: 'Anticipo', parcial: 'Parcial', liquidacion: 'Liquidación' }
const METHOD_LABELS = { efectivo: 'Efectivo', transferencia: 'Transferencia', cheque: 'Cheque', otro: 'Otro' }

export function PaymentSection({ quoteId, quoteTotalAmount }: { quoteId: string; quoteTotalAmount: number }) {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [totalPaid, setTotalPaid] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    payment_type: 'anticipo' as Payment['payment_type'],
    payment_method: 'efectivo' as Payment['payment_method'],
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const fetchPayments = useCallback(async () => {
    const res = await fetch(`/api/quotes/${quoteId}/payments`)
    const json = await res.json()
    setPayments(json.data ?? [])
    setTotalPaid(json.total_paid ?? 0)
  }, [quoteId])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/quotes/${quoteId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    })
    setLoading(false)
    if (res.ok) {
      setShowModal(false)
      fetchPayments()
      if (totalPaid + Number(form.amount) >= quoteTotalAmount) {
        router.refresh()
      }
    }
  }

  const pct = Math.min(100, (totalPaid / quoteTotalAmount) * 100)
  const pending = Math.max(0, quoteTotalAmount - totalPaid)

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Pagos</h3>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Registrar Pago
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Pagado: ${totalPaid.toLocaleString('es-MX')}</span>
          <span>Pendiente: ${pending.toLocaleString('es-MX')}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}% cobrado</div>
      </div>

      {/* Payments table */}
      {payments.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-gray-500 text-xs">
              <th className="text-left py-1 pr-3">Fecha</th>
              <th className="text-left py-1 pr-3">Tipo</th>
              <th className="text-left py-1 pr-3">Método</th>
              <th className="text-right py-1">Monto</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 pr-3 text-gray-700">{p.payment_date}</td>
                <td className="py-2 pr-3 text-gray-700">{TYPE_LABELS[p.payment_type]}</td>
                <td className="py-2 pr-3 text-gray-500">{METHOD_LABELS[p.payment_method]}</td>
                <td className="py-2 text-right font-medium">${Number(p.amount).toLocaleString('es-MX')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl space-y-4">
            <h3 className="text-base font-semibold">Registrar Pago</h3>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Monto *</label>
              <input
                type="number" step="0.01" required
                value={form.amount}
                onChange={e => setForm(v => ({ ...v, amount: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Tipo *</label>
              <select
                value={form.payment_type}
                onChange={e => setForm(v => ({ ...v, payment_type: e.target.value as Payment['payment_type'] }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="anticipo">Anticipo</option>
                <option value="parcial">Pago Parcial</option>
                <option value="liquidacion">Liquidación</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Método *</label>
              <select
                value={form.payment_method}
                onChange={e => setForm(v => ({ ...v, payment_method: e.target.value as Payment['payment_method'] }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="cheque">Cheque</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Fecha *</label>
              <input
                type="date" required
                value={form.payment_date}
                onChange={e => setForm(v => ({ ...v, payment_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Notas</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(v => ({ ...v, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Add `PaymentSection` to quote detail page**

In `app/(dashboard)/dashboard/quotes/[id]/page.tsx`, after the quote items section:

```tsx
import { PaymentSection } from '@/components/dashboard/payment-section'

// Inside JSX, after quote items:
<PaymentSection quoteId={quote.id} quoteTotalAmount={Number(quote.total_amount)} />
```

**Step 4: Run build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add components/dashboard/payment-section.tsx \
        app/(dashboard)/dashboard/quotes/[id]/page.tsx
git commit -m "feat(ui): add payment tracking section to quote detail"
```

---

## Sprint 3: Work Calendar / Agenda

### Task 3.1: DB Migration — work_events Table

**Files:**
- Create: `supabase/migrations/022_create_work_events.sql`

**Step 1: Write the migration**

```sql
-- supabase/migrations/022_create_work_events.sql

CREATE TABLE work_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_id         UUID REFERENCES quotes(id) ON DELETE SET NULL,
  assigned_to      UUID REFERENCES auth.users(id),
  title            TEXT NOT NULL,
  event_type       TEXT NOT NULL CHECK (event_type IN (
    'instalacion', 'medicion', 'visita_tecnica', 'mantenimiento', 'otro'
  )),
  scheduled_start  TIMESTAMPTZ NOT NULL,
  scheduled_end    TIMESTAMPTZ NOT NULL,
  address          TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente', 'en_camino', 'completado', 'cancelado'
  )),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_event_duration CHECK (scheduled_end > scheduled_start)
);

ALTER TABLE work_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view events"
  ON work_events FOR SELECT
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "org members can insert events"
  ON work_events FOR INSERT
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "org members can update events"
  ON work_events FOR UPDATE
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "org admins can delete events"
  ON work_events FOR DELETE
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::UUID
    AND (auth.jwt() ->> 'role') IN ('owner', 'admin')
  );

CREATE INDEX idx_work_events_org_start ON work_events(organization_id, scheduled_start);
CREATE INDEX idx_work_events_client_id ON work_events(client_id);
CREATE INDEX idx_work_events_assigned_to ON work_events(assigned_to);
```

**Step 2: Apply migration**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" \
  -f supabase/migrations/022_create_work_events.sql
```

**Step 3: Verify**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" \
  -c "\d work_events"
```

**Step 4: Commit**

```bash
git add supabase/migrations/022_create_work_events.sql
git commit -m "feat(db): add work_events table with RLS for calendar"
```

---

### Task 3.2: Zod Schemas for Work Events

**Files:**
- Modify: `lib/validations/cotizapro.ts`

**Step 1: Add event schemas**

```typescript
export const createWorkEventSchema = z.object({
  client_id: z.string().uuid(),
  quote_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  event_type: z.enum(['instalacion', 'medicion', 'visita_tecnica', 'mantenimiento', 'otro']),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
})

export const updateWorkEventSchema = createWorkEventSchema.partial().extend({
  status: z.enum(['pendiente', 'en_camino', 'completado', 'cancelado']).optional(),
})

export type CreateWorkEventInput = z.infer<typeof createWorkEventSchema>
export type UpdateWorkEventInput = z.infer<typeof updateWorkEventSchema>
```

**Step 2: Run type-check**

```bash
npm run type-check
```

**Step 3: Commit**

```bash
git add lib/validations/cotizapro.ts
git commit -m "feat(types): add work event Zod schemas"
```

---

### Task 3.3: API — Calendar Events Routes

**Files:**
- Create: `app/api/calendar/events/route.ts`
- Create: `app/api/calendar/events/[id]/route.ts`

**Step 1: Create GET + POST handler**

```typescript
// app/api/calendar/events/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createWorkEventSchema } from '@/lib/validations/cotizapro'

export async function GET(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  let query = supabase
    .from('work_events')
    .select('id, title, event_type, scheduled_start, scheduled_end, status, address, notes, client_id, quote_id, assigned_to, clients(name, company_name)')
    .order('scheduled_start', { ascending: true })
    .limit(200)

  if (start) query = query.gte('scheduled_start', start)
  if (end) query = query.lte('scheduled_start', end)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = user.user_metadata?.organization_id
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const body = await req.json()
  const parsed = createWorkEventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase
    .from('work_events')
    .insert({ organization_id: orgId, ...parsed.data })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
```

**Step 2: Create PATCH + DELETE handler**

```typescript
// app/api/calendar/events/[id]/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { updateWorkEventSchema } from '@/lib/validations/cotizapro'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = updateWorkEventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase
    .from('work_events')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('work_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

**Step 3: Run type-check**

```bash
npm run type-check
```

**Step 4: Commit**

```bash
git add app/api/calendar/
git commit -m "feat(api): add calendar work events CRUD endpoints"
```

---

### Task 3.4: UI — Calendar Page (Week + Day View)

**Files:**
- Create: `app/(dashboard)/dashboard/calendar/page.tsx`
- Create: `app/(dashboard)/dashboard/calendar/new/page.tsx`
- Create: `components/dashboard/calendar-week-view.tsx`
- Create: `components/dashboard/work-event-form.tsx`
- Modify: `components/dashboard/sidebar.tsx`

**Step 1: Create the week view component**

```typescript
// components/dashboard/calendar-week-view.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface WorkEvent {
  id: string
  title: string
  event_type: 'instalacion' | 'medicion' | 'visita_tecnica' | 'mantenimiento' | 'outro'
  scheduled_start: string
  scheduled_end: string
  status: string
  clients: { name: string | null; company_name: string | null } | null
}

const EVENT_COLORS: Record<string, string> = {
  instalacion: 'bg-blue-100 border-blue-400 text-blue-800',
  medicion: 'bg-amber-100 border-amber-400 text-amber-800',
  visita_tecnica: 'bg-purple-100 border-purple-400 text-purple-800',
  mantenimiento: 'bg-green-100 border-green-400 text-green-800',
  otro: 'bg-gray-100 border-gray-400 text-gray-800',
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8am to 8pm

function getWeekDays(baseDate: Date): Date[] {
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - ((baseDate.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function CalendarWeekView({ events, initialDate }: { events: WorkEvent[]; initialDate: Date }) {
  const router = useRouter()
  const [weekBase, setWeekBase] = useState(initialDate)
  const weekDays = getWeekDays(weekBase)

  const getEventsForDayHour = useCallback((day: Date, hour: number) => {
    return events.filter(e => {
      const start = new Date(e.scheduled_start)
      return (
        start.toDateString() === day.toDateString() &&
        start.getHours() === hour
      )
    })
  }, [events])

  const prevWeek = () => setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek = () => setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })

  const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={prevWeek} className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-50">← Anterior</button>
        <span className="text-sm font-medium text-gray-700">
          {weekDays[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} –{' '}
          {weekDays[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button onClick={nextWeek} className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-50">Siguiente →</button>
        <button
          onClick={() => setWeekBase(new Date())}
          className="px-3 py-1 border rounded-lg text-sm bg-blue-50 text-blue-700 hover:bg-blue-100"
        >
          Hoy
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-auto border rounded-xl">
        <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)', minWidth: '700px' }}>
          {/* Header row */}
          <div className="border-b border-r bg-gray-50 p-2" />
          {weekDays.map((day, i) => (
            <div key={i} className="border-b border-r bg-gray-50 p-2 text-center">
              <div className="text-xs text-gray-500">{DAY_LABELS[i]}</div>
              <div className={`text-sm font-semibold ${day.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-800'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}

          {/* Hour rows */}
          {HOURS.map(hour => (
            <>
              <div key={`h${hour}`} className="border-b border-r p-2 text-xs text-gray-400 text-right">
                {hour}:00
              </div>
              {weekDays.map((day, di) => {
                const slotEvents = getEventsForDayHour(day, hour)
                return (
                  <div
                    key={`${hour}-${di}`}
                    className="border-b border-r p-1 min-h-[48px] cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/dashboard/calendar/new?date=${day.toISOString().split('T')[0]}&hour=${hour}`)}
                  >
                    {slotEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); router.push(`/dashboard/calendar/${ev.id}`) }}
                        className={`text-xs p-1 rounded border-l-2 mb-0.5 cursor-pointer truncate ${EVENT_COLORS[ev.event_type] ?? EVENT_COLORS.otro}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Create calendar page**

```typescript
// app/(dashboard)/dashboard/calendar/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarWeekView } from '@/components/dashboard/calendar-week-view'
import Link from 'next/link'

export default async function CalendarPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const { data: events } = await supabase
    .from('work_events')
    .select('id, title, event_type, scheduled_start, scheduled_end, status, clients(name, company_name)')
    .gte('scheduled_start', weekStart.toISOString())
    .lte('scheduled_start', weekEnd.toISOString())
    .order('scheduled_start', { ascending: true })
    .limit(200)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Agenda</h1>
        <Link
          href="/dashboard/calendar/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Nuevo Evento
        </Link>
      </div>
      <CalendarWeekView events={events ?? []} initialDate={now} />
    </div>
  )
}
```

**Step 3: Create `work-event-form.tsx`**

```typescript
// components/dashboard/work-event-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Client { id: string; name: string | null; company_name: string | null }

interface Props {
  clients: Client[]
  defaultDate?: string
  defaultHour?: number
  defaultClientId?: string
}

export function WorkEventForm({ clients, defaultDate, defaultHour, defaultClientId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    client_id: defaultClientId ?? '',
    event_type: 'instalacion' as const,
    scheduled_start: `${defaultDate ?? new Date().toISOString().split('T')[0]}T${String(defaultHour ?? 9).padStart(2, '0')}:00`,
    scheduled_end: `${defaultDate ?? new Date().toISOString().split('T')[0]}T${String((defaultHour ?? 9) + 1).padStart(2, '0')}:00`,
    address: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        scheduled_start: new Date(form.scheduled_start).toISOString(),
        scheduled_end: new Date(form.scheduled_end).toISOString(),
      }),
    })
    setLoading(false)
    if (res.ok) router.push('/dashboard/calendar')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
        <input
          required value={form.title}
          onChange={e => setForm(v => ({ ...v, title: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
        <select
          required value={form.client_id}
          onChange={e => setForm(v => ({ ...v, client_id: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Seleccionar cliente...</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.company_name ?? c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de evento *</label>
        <select
          value={form.event_type}
          onChange={e => setForm(v => ({ ...v, event_type: e.target.value as typeof form.event_type }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="instalacion">Instalación</option>
          <option value="medicion">Medición</option>
          <option value="visita_tecnica">Visita Técnica</option>
          <option value="mantenimiento">Mantenimiento</option>
          <option value="otro">Otro</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Inicio *</label>
          <input
            type="datetime-local" required value={form.scheduled_start}
            onChange={e => setForm(v => ({ ...v, scheduled_start: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fin *</label>
          <input
            type="datetime-local" required value={form.scheduled_end}
            onChange={e => setForm(v => ({ ...v, scheduled_end: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
        <input
          value={form.address}
          onChange={e => setForm(v => ({ ...v, address: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Calle, colonia, ciudad..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          rows={3} value={form.notes}
          onChange={e => setForm(v => ({ ...v, notes: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
          {loading ? 'Guardando...' : 'Crear Evento'}
        </button>
      </div>
    </form>
  )
}
```

**Step 4: Create new event page**

```typescript
// app/(dashboard)/dashboard/calendar/new/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WorkEventForm } from '@/components/dashboard/work-event-form'

export default async function NewCalendarEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; hour?: string; client_id?: string }>
}) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name')
    .order('name', { ascending: true })
    .limit(200)

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Nuevo Evento</h1>
      <WorkEventForm
        clients={clients ?? []}
        defaultDate={sp.date}
        defaultHour={sp.hour ? Number(sp.hour) : undefined}
        defaultClientId={sp.client_id}
      />
    </div>
  )
}
```

**Step 5: Add Calendar link to sidebar**

Read `components/dashboard/sidebar.tsx`. Find the `reminders` nav item and add a Calendar item after it:

```tsx
{ href: '/dashboard/calendar', label: 'Agenda', icon: CalendarIcon }
```

Import `Calendar as CalendarIcon` from `lucide-react`.

**Step 6: Run build**

```bash
npm run build
```

**Step 7: Commit**

```bash
git add app/(dashboard)/dashboard/calendar/ \
        components/dashboard/calendar-week-view.tsx \
        components/dashboard/work-event-form.tsx \
        components/dashboard/sidebar.tsx
git commit -m "feat(calendar): add work calendar with week view and event creation"
```

---

## Sprint 4: Templates UI + Promotions

### Task 4.1: DB Migration — Add Promo Columns to quote_templates

**Files:**
- Create: `supabase/migrations/023_add_promo_to_templates.sql`

**Step 1: Write the migration**

```sql
-- supabase/migrations/023_add_promo_to_templates.sql

ALTER TABLE quote_templates
  ADD COLUMN IF NOT EXISTS promotional_label TEXT,
  ADD COLUMN IF NOT EXISTS promotional_valid_until DATE;
```

**Step 2: Apply migration**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" \
  -f supabase/migrations/023_add_promo_to_templates.sql
```

**Step 3: Commit**

```bash
git add supabase/migrations/023_add_promo_to_templates.sql
git commit -m "feat(db): add promotional fields to quote_templates"
```

---

### Task 4.2: UI — Templates Management Page

**Files:**
- Create: `app/(dashboard)/dashboard/templates/page.tsx`
- Create: `app/(dashboard)/dashboard/templates/new/page.tsx`
- Modify: `components/dashboard/sidebar.tsx`

**Step 1: Read existing templates API to understand data shape**

```bash
grep -r "template" app/api/ --include="*.ts" -l
```

Read the existing templates API route to understand the response shape.

**Step 2: Create templates list page**

```typescript
// app/(dashboard)/dashboard/templates/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TemplatesPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: templates } = await supabase
    .from('quote_templates')
    .select('id, name, category, is_active, discount_percentage, promotional_label, promotional_valid_until, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Plantillas</h1>
        <Link href="/dashboard/templates/new" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          + Nueva Plantilla
        </Link>
      </div>

      {(!templates || templates.length === 0) ? (
        <div className="text-center py-16 text-gray-500">
          <p className="mb-4">No hay plantillas todavía.</p>
          <Link href="/dashboard/templates/new" className="text-blue-600 hover:underline">Crear primera plantilla</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => {
            const promoActive = t.promotional_label && t.promotional_valid_until && t.promotional_valid_until >= today
            return (
              <Link
                key={t.id}
                href={`/dashboard/quotes/new?template_id=${t.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{t.name}</h3>
                  {!t.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5 ml-2 flex-shrink-0">Inactiva</span>
                  )}
                </div>
                {t.category && <div className="text-xs text-gray-500 mb-2">{t.category}</div>}
                {t.discount_percentage && (
                  <div className="text-xs text-green-700">Descuento: {t.discount_percentage}%</div>
                )}
                {promoActive && (
                  <div className="mt-2 text-xs bg-amber-100 text-amber-700 rounded px-2 py-1">
                    Promo: {t.promotional_label} (hasta {t.promotional_valid_until})
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Add Templates link to sidebar**

Read `components/dashboard/sidebar.tsx`. Add a Templates link (e.g., between Services and Reminders or at a logical position):

```tsx
{ href: '/dashboard/templates', label: 'Plantillas', icon: LayoutTemplate }
```

Import `LayoutTemplate` from `lucide-react`.

**Step 4: Run build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add app/(dashboard)/dashboard/templates/ \
        components/dashboard/sidebar.tsx
git commit -m "feat(ui): add templates management page with promotional display"
```

---

## Sprint 5: Enhanced Income Analytics

### Task 5.1: API — Income Analytics Endpoint

**Files:**
- Create: `app/api/analytics/income/route.ts`

**Step 1: Create the income analytics endpoint**

```typescript
// app/api/analytics/income/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'month'

  const now = new Date()

  // Current period boundaries
  let currentStart: Date, currentEnd: Date, prevStart: Date, prevEnd: Date

  if (period === 'week') {
    const dayOfWeek = (now.getDay() + 6) % 7
    currentStart = new Date(now); currentStart.setDate(now.getDate() - dayOfWeek); currentStart.setHours(0,0,0,0)
    currentEnd = new Date(currentStart); currentEnd.setDate(currentStart.getDate() + 7)
    prevStart = new Date(currentStart); prevStart.setDate(currentStart.getDate() - 7)
    prevEnd = new Date(currentStart)
  } else {
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
    currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    prevEnd = currentStart
  }

  // Fetch payments for current period
  const { data: currentPayments } = await supabase
    .from('quote_payments')
    .select('amount, payment_date')
    .gte('payment_date', currentStart.toISOString().split('T')[0])
    .lt('payment_date', currentEnd.toISOString().split('T')[0])
    .limit(1000)

  // Fetch payments for previous period
  const { data: prevPayments } = await supabase
    .from('quote_payments')
    .select('amount')
    .gte('payment_date', prevStart.toISOString().split('T')[0])
    .lt('payment_date', prevEnd.toISOString().split('T')[0])
    .limit(1000)

  // Pipeline: sum of non-cobrado, non-rejected, non-expired quotes
  const { data: pipelineQuotes } = await supabase
    .from('quotes')
    .select('total_amount')
    .not('status', 'in', '("cobrado","rejected","expired","completado")')
    .limit(1000)

  // Pending balance: accepted/en_instalacion/completado minus paid
  const { data: pendingQuotes } = await supabase
    .from('quotes')
    .select('id, total_amount')
    .in('status', ['accepted', 'en_instalacion', 'completado'])
    .limit(500)

  const currentTotal = (currentPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const prevTotal = (prevPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const changePct = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : null
  const pipeline = (pipelineQuotes ?? []).reduce((s, q) => s + Number(q.total_amount), 0)

  // Weekly breakdown for monthly period
  let weeklyBreakdown: { week: string; amount: number }[] = []
  if (period === 'month' && currentPayments) {
    const weeks: Record<string, number> = {}
    currentPayments.forEach(p => {
      const d = new Date(p.payment_date)
      const weekNum = Math.floor((d.getDate() - 1) / 7) + 1
      const key = `Semana ${weekNum}`
      weeks[key] = (weeks[key] ?? 0) + Number(p.amount)
    })
    weeklyBreakdown = Object.entries(weeks).map(([week, amount]) => ({ week, amount }))
  }

  const monthLabel = (d: Date) => d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  return NextResponse.json({
    current_period: { total_paid: currentTotal, label: period === 'week' ? 'Esta semana' : monthLabel(currentStart) },
    previous_period: { total_paid: prevTotal, label: period === 'week' ? 'Semana anterior' : monthLabel(prevStart) },
    change_pct: changePct !== null ? Math.round(changePct * 10) / 10 : null,
    weekly_breakdown: weeklyBreakdown,
    pipeline_value: pipeline,
  })
}
```

**Step 2: Run type-check**

```bash
npm run type-check
```

**Step 3: Commit**

```bash
git add app/api/analytics/income/route.ts
git commit -m "feat(api): add income analytics endpoint with period comparison"
```

---

### Task 5.2: UI — Income Section in Analytics Page

**Files:**
- Modify: `app/(dashboard)/dashboard/analytics/page.tsx` (or create analytics section component)
- Create: `components/dashboard/income-analytics.tsx`

**Step 1: Read current analytics page**

Read `app/(dashboard)/dashboard/analytics/page.tsx` to understand current structure.

**Step 2: Create income analytics client component**

```typescript
// components/dashboard/income-analytics.tsx
'use client'

import { useState, useEffect } from 'react'

interface IncomeData {
  current_period: { total_paid: number; label: string }
  previous_period: { total_paid: number; label: string }
  change_pct: number | null
  weekly_breakdown: { week: string; amount: number }[]
  pipeline_value: number
}

export function IncomeAnalytics() {
  const [period, setPeriod] = useState<'month' | 'week'>('month')
  const [data, setData] = useState<IncomeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/income?period=${period}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [period])

  if (loading) return <div className="animate-pulse h-48 bg-gray-100 rounded-xl" />
  if (!data) return null

  const isPositive = data.change_pct !== null && data.change_pct >= 0

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Ingresos</h2>
        <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
          {(['month', 'week'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                period === p ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              {p === 'month' ? 'Mes' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Cobrado ({data.current_period.label})</div>
          <div className="text-xl font-bold text-gray-900">
            ${data.current_period.total_paid.toLocaleString('es-MX')}
          </div>
          {data.change_pct !== null && (
            <div className={`text-xs mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(data.change_pct)}% vs {data.previous_period.label}
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Período anterior</div>
          <div className="text-xl font-bold text-gray-700">
            ${data.previous_period.total_paid.toLocaleString('es-MX')}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Pipeline activo</div>
          <div className="text-xl font-bold text-blue-700">
            ${data.pipeline_value.toLocaleString('es-MX')}
          </div>
        </div>
      </div>

      {/* Weekly breakdown bars */}
      {data.weekly_breakdown.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">Desglose semanal</div>
          <div className="flex items-end gap-2 h-24">
            {data.weekly_breakdown.map((w, i) => {
              const max = Math.max(...data.weekly_breakdown.map(x => x.amount))
              const pct = max > 0 ? (w.amount / max) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-gray-600">${(w.amount / 1000).toFixed(0)}k</div>
                  <div
                    className="w-full bg-blue-400 rounded-t"
                    style={{ height: `${Math.max(4, pct)}%` }}
                  />
                  <div className="text-xs text-gray-400 truncate w-full text-center">{w.week}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Add IncomeAnalytics to analytics page**

In `app/(dashboard)/dashboard/analytics/page.tsx`, at the bottom of the JSX:

```tsx
import { IncomeAnalytics } from '@/components/dashboard/income-analytics'

// At end of page content:
<IncomeAnalytics />
```

**Step 4: Run build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add app/api/analytics/income/route.ts \
        components/dashboard/income-analytics.tsx \
        app/(dashboard)/dashboard/analytics/page.tsx
git commit -m "feat(analytics): add income section with period comparison and weekly breakdown"
```

---

## Sprint 6: Mobile UX Polish

### Task 6.1: Quote Detail — Sticky Send Bar on Mobile

**Files:**
- Modify: `app/(dashboard)/dashboard/quotes/[id]/page.tsx`

**Step 1: Read current quote detail page**

Check if the WhatsApp/Email send buttons exist. Add a sticky bottom bar visible only on mobile:

```tsx
{/* Mobile sticky action bar */}
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3 lg:hidden z-30">
  {/* WhatsApp button */}
  <a
    href={`https://wa.me/${quote.clients?.phone ?? ''}?text=...`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg text-sm font-medium"
  >
    WhatsApp
  </a>
  {/* Email button */}
  <button className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
    Enviar Email
  </button>
</div>

{/* Bottom padding so content isn't hidden behind sticky bar on mobile */}
<div className="h-20 lg:hidden" />
```

**Step 2: Run build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/(dashboard)/dashboard/quotes/[id]/page.tsx
git commit -m "feat(mobile): add sticky send actions bar on quote detail for mobile"
```

---

### Task 6.2: Dashboard Home — 2x2 Stats Grid on Mobile

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

**Step 1: Read current dashboard page**

Read `app/(dashboard)/dashboard/page.tsx` to find the stats cards section.

**Step 2: Update stats grid classes**

Find the stats cards container div. Change from single-column to 2x2 on mobile:

```tsx
// Before
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

// After
<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
```

**Step 3: Limit recent activity to 5 on mobile**

If there's a recent activity section, add `lg:` variant classes or pass a limit:

```tsx
// If it's a server-side query, always limit to 10 (fine for all screens)
// If rendered as a list, slice on mobile via CSS is not possible
// Option: query 5 items, let desktop show all 5 (acceptable for MVP)
```

**Step 4: Run build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add app/(dashboard)/dashboard/page.tsx
git commit -m "feat(mobile): improve dashboard stats grid to 2x2 on mobile"
```

---

### Task 6.3: Final — Build Verification

**Step 1: Run full build**

```bash
npm run build
```

Expected: No type errors, no build errors.

**Step 2: Run type-check**

```bash
npm run type-check
```

**Step 3: Start dev server and smoke-test manually**

```bash
npm run dev
```

Verify:
- `/dashboard/quotes?view=kanban` shows Kanban board
- `/dashboard/calendar` shows week view
- `/dashboard/templates` shows templates grid
- `/dashboard/analytics` shows income section
- FAB appears on mobile viewport (< 1024px)
- Quote detail shows Payments section

**Step 4: Final commit**

```bash
git add .
git commit -m "chore: verify all sprint 1-6 features build successfully"
```

---

## Post-Implementation: E2E Tests

After all sprints are working, add E2E coverage for critical new flows:

1. **Kanban**: Navigate to quotes, switch to kanban view, verify cards appear
2. **Payment**: Open a quote, register a payment, verify progress bar updates
3. **Calendar**: Create a work event, verify it appears in the week view
4. **Templates**: Navigate to templates page, verify list loads

Run existing suite to ensure no regressions:

```bash
npx playwright test --reporter=list
```

Expected: All 338 existing tests pass.

---

## Summary

| Sprint | Tasks | Migrations | New Files |
|--------|-------|------------|-----------|
| 1: Kanban + FAB | 1.1–1.6 | `020_extend_quote_status.sql` | kanban.tsx, fab.tsx, quick-actions.tsx |
| 2: Payments | 2.1–2.4 | `021_create_quote_payments.sql` | payments/route.ts, payment-section.tsx |
| 3: Calendar | 3.1–3.4 | `022_create_work_events.sql` | calendar/route.ts, calendar views |
| 4: Templates | 4.1–4.2 | `023_add_promo_to_templates.sql` | templates/page.tsx |
| 5: Analytics | 5.1–5.2 | none | income/route.ts, income-analytics.tsx |
| 6: Mobile | 6.1–6.3 | none | sticky bar, 2x2 grid |
