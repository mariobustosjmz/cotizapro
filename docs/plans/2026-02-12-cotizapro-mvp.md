# CotizaPro MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an intelligent quote management system for maintenance service providers (HVAC, painting, plumbing, electrical) with client management, WhatsApp/email sending, and analytics dashboard.

**Architecture:** Next.js 16 App Router with Server Components for data fetching, Client Components for interactivity. Supabase for PostgreSQL database with RLS, Auth for multi-tenancy. Twilio for WhatsApp Business API. Stripe for billing. TailwindCSS + shadcn/ui for UI components.

**Tech Stack:** Next.js 16.1.6, React 19, TypeScript 5.x, Supabase, Stripe, Twilio WhatsApp API, Zod, TailwindCSS, shadcn/ui

---

## Week 1-2: Database Schema & Core Infrastructure

### Task 1: Database Migration - Clients Table

**Files:**
- Create: `supabase/migrations/002_cotizapro_schema.sql`

**Step 1: Write migration for clients table**

```sql
-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  whatsapp_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  notes TEXT,
  tags TEXT[], -- Array of tags like "high-value", "regular", etc
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clients in their organization"
  ON clients FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert clients in their organization"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update clients in their organization"
  ON clients FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete clients in their organization"
  ON clients FOR DELETE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_clients_organization ON clients(organization_id);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_email ON clients(email);

-- Updated_at trigger
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply migration**

Run: `npx supabase db push` (or apply via Supabase dashboard)
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/002_cotizapro_schema.sql
git commit -m "feat(db): add clients table with RLS policies"
```

---

### Task 2: Database Migration - Service Catalog Table

**Files:**
- Modify: `supabase/migrations/002_cotizapro_schema.sql`

**Step 1: Add service catalog table to migration**

```sql
-- Service catalog table
CREATE TABLE service_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- "hvac", "painting", "plumbing", "electrical", "other"
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  unit_type TEXT NOT NULL, -- "fixed", "per_hour", "per_sqm", "per_unit"
  estimated_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view services in their organization"
  ON service_catalog FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage services in their organization"
  ON service_catalog FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE INDEX idx_service_catalog_organization ON service_catalog(organization_id);
CREATE INDEX idx_service_catalog_category ON service_catalog(category);

CREATE TRIGGER update_service_catalog_updated_at
  BEFORE UPDATE ON service_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Service catalog table created

**Step 3: Commit**

```bash
git add supabase/migrations/002_cotizapro_schema.sql
git commit -m "feat(db): add service catalog table"
```

---

### Task 3: Database Migration - Quotes Table

**Files:**
- Modify: `supabase/migrations/002_cotizapro_schema.sql`

**Step 1: Add quotes table to migration**

```sql
-- Quotes table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL, -- Auto-generated: "COT-2026-001"
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft', -- "draft", "sent", "viewed", "accepted", "rejected", "expired"
  valid_until DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 16.00, -- IVA 16%
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms_and_conditions TEXT,
  created_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMPTZ,
  sent_via TEXT[], -- ["email", "whatsapp"]
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, quote_number)
);

-- Quote line items
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  service_id UUID REFERENCES service_catalog(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  unit_type TEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotes in their organization"
  ON quotes FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create quotes in their organization"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update quotes in their organization"
  ON quotes FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS for quote items
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quote items"
  ON quote_items FOR SELECT
  TO authenticated
  USING (quote_id IN (
    SELECT id FROM quotes WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage quote items"
  ON quote_items FOR ALL
  TO authenticated
  USING (quote_id IN (
    SELECT id FROM quotes WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Indexes
CREATE INDEX idx_quotes_organization ON quotes(organization_id);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

-- Triggers
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  count INTEGER;
  quote_num TEXT;
BEGIN
  year := EXTRACT(YEAR FROM NOW())::TEXT;

  SELECT COUNT(*) + 1 INTO count
  FROM quotes
  WHERE organization_id = org_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  quote_num := 'COT-' || year || '-' || LPAD(count::TEXT, 3, '0');

  RETURN quote_num;
END;
$$ LANGUAGE plpgsql;
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Quotes and quote_items tables created

**Step 3: Commit**

```bash
git add supabase/migrations/002_cotizapro_schema.sql
git commit -m "feat(db): add quotes and quote items tables"
```

---

### Task 4: Database Migration - Notifications Table

**Files:**
- Modify: `supabase/migrations/002_cotizapro_schema.sql`

**Step 1: Add notifications tracking table**

```sql
-- Notifications sent (for tracking WhatsApp/Email sends)
CREATE TABLE quote_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- "email", "whatsapp"
  recipient TEXT NOT NULL,
  status TEXT NOT NULL, -- "sent", "delivered", "failed", "read"
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

ALTER TABLE quote_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notifications for their quotes"
  ON quote_notifications FOR SELECT
  TO authenticated
  USING (quote_id IN (
    SELECT id FROM quotes WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE INDEX idx_quote_notifications_quote ON quote_notifications(quote_id);
CREATE INDEX idx_quote_notifications_status ON quote_notifications(status);
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Notifications table created

**Step 3: Commit**

```bash
git add supabase/migrations/002_cotizapro_schema.sql
git commit -m "feat(db): add quote notifications tracking table"
```

---

## Week 2-3: TypeScript Types & Zod Schemas

### Task 5: TypeScript Types for Database Models

**Files:**
- Create: `types/database.types.ts`

**Step 1: Write TypeScript types**

```typescript
export type Client = {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string
  whatsapp_phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  notes: string | null
  tags: string[] | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ServiceCategory = 'hvac' | 'painting' | 'plumbing' | 'electrical' | 'other'

export type ServiceCatalog = {
  id: string
  organization_id: string
  name: string
  category: ServiceCategory
  description: string | null
  unit_price: number
  unit_type: 'fixed' | 'per_hour' | 'per_sqm' | 'per_unit'
  estimated_duration_minutes: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'

export type Quote = {
  id: string
  organization_id: string
  quote_number: string
  client_id: string
  status: QuoteStatus
  valid_until: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_rate: number
  discount_amount: number
  total: number
  notes: string | null
  terms_and_conditions: string | null
  created_by: string | null
  sent_at: string | null
  sent_via: string[] | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export type QuoteItem = {
  id: string
  quote_id: string
  service_id: string | null
  description: string
  quantity: number
  unit_price: number
  unit_type: string
  subtotal: number
  sort_order: number
  created_at: string
}

export type QuoteWithItems = Quote & {
  items: QuoteItem[]
  client: Client
}

export type NotificationType = 'email' | 'whatsapp'
export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'read'

export type QuoteNotification = {
  id: string
  quote_id: string
  notification_type: NotificationType
  recipient: string
  status: NotificationStatus
  provider_message_id: string | null
  error_message: string | null
  sent_at: string
  delivered_at: string | null
  read_at: string | null
}
```

**Step 2: Commit**

```bash
git add types/database.types.ts
git commit -m "feat(types): add database types for CotizaPro"
```

---

### Task 6: Zod Schemas for Validation

**Files:**
- Create: `lib/validations/cotizapro.ts`

**Step 1: Write Zod schemas**

```typescript
import { z } from 'zod'

// Client schemas
export const createClientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos').max(20),
  whatsapp_phone: z.string().min(10).max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(10).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
})

export const updateClientSchema = createClientSchema.partial()

// Service catalog schemas
export const createServiceSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  category: z.enum(['hvac', 'painting', 'plumbing', 'electrical', 'other']),
  description: z.string().max(1000).optional().nullable(),
  unit_price: z.number().positive('El precio debe ser mayor a 0'),
  unit_type: z.enum(['fixed', 'per_hour', 'per_sqm', 'per_unit']),
  estimated_duration_minutes: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().default(true),
})

export const updateServiceSchema = createServiceSchema.partial()

// Quote item schema
export const quoteItemSchema = z.object({
  service_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'La descripción es requerida').max(500),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unit_price: z.number().positive('El precio debe ser mayor a 0'),
  unit_type: z.enum(['fixed', 'per_hour', 'per_sqm', 'per_unit']),
})

// Quote schemas
export const createQuoteSchema = z.object({
  client_id: z.string().uuid('Cliente inválido'),
  valid_until: z.string().datetime().or(z.date()),
  items: z.array(quoteItemSchema).min(1, 'Debe agregar al menos un servicio'),
  notes: z.string().max(2000).optional().nullable(),
  terms_and_conditions: z.string().max(5000).optional().nullable(),
  discount_rate: z.number().min(0).max(100).default(0),
})

export const updateQuoteSchema = z.object({
  client_id: z.string().uuid().optional(),
  valid_until: z.string().datetime().or(z.date()).optional(),
  items: z.array(quoteItemSchema).optional(),
  notes: z.string().max(2000).optional().nullable(),
  terms_and_conditions: z.string().max(5000).optional().nullable(),
  discount_rate: z.number().min(0).max(100).optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']).optional(),
})

// Send quote schema
export const sendQuoteSchema = z.object({
  quote_id: z.string().uuid(),
  send_via: z.array(z.enum(['email', 'whatsapp'])).min(1, 'Seleccione al menos un método de envío'),
  email_override: z.string().email().optional(),
  whatsapp_override: z.string().min(10).max(20).optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
export type QuoteItemInput = z.infer<typeof quoteItemSchema>
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>
export type SendQuoteInput = z.infer<typeof sendQuoteSchema>
```

**Step 2: Commit**

```bash
git add lib/validations/cotizapro.ts
git commit -m "feat(validation): add Zod schemas for CotizaPro"
```

---

## Week 3-4: Backend API - Clients Module

### Task 7: Clients API - GET /api/clients

**Files:**
- Create: `app/api/clients/route.ts`

**Step 1: Write the API route**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data: clients, error, count } = await query

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      clients,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Test the endpoint**

Run dev server: `npm run dev`
Test: `curl http://localhost:3000/api/clients` (should return 401 without auth)
Expected: 401 Unauthorized

**Step 3: Commit**

```bash
git add app/api/clients/route.ts
git commit -m "feat(api): add GET /api/clients endpoint"
```

---

### Task 8: Clients API - POST /api/clients

**Files:**
- Modify: `app/api/clients/route.ts`

**Step 1: Add POST handler**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClientSchema } from '@/lib/validations/cotizapro'

// ... existing GET handler ...

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse and validate body
    const body = await request.json()
    const validation = createClientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 })
    }

    // Insert client
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        ...validation.data,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add app/api/clients/route.ts
git commit -m "feat(api): add POST /api/clients endpoint"
```

---

### Task 9: Clients API - GET/PATCH/DELETE /api/clients/[id]

**Files:**
- Create: `app/api/clients/[id]/route.ts`

**Step 1: Write client detail endpoints**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateClientSchema } from '@/lib/validations/cotizapro'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateClientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 })
    }

    const { data: client, error } = await supabase
      .from('clients')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add app/api/clients/[id]/route.ts
git commit -m "feat(api): add client detail endpoints (GET/PATCH/DELETE)"
```

---

## Week 4-5: Backend API - Service Catalog & Quotes

### Task 10: Services API - Full CRUD

**Files:**
- Create: `app/api/services/route.ts`
- Create: `app/api/services/[id]/route.ts`

**Step 1: Write services list endpoint**

```typescript
// app/api/services/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSchema } from '@/lib/validations/cotizapro'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const active_only = searchParams.get('active') === 'true'

    let query = supabase
      .from('service_catalog')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('category')
      .order('name')

    if (category) {
      query = query.eq('category', category)
    }

    if (active_only) {
      query = query.eq('is_active', true)
    }

    const { data: services, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ services })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createServiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 })
    }

    const { data: service, error } = await supabase
      .from('service_catalog')
      .insert({
        ...validation.data,
        organization_id: profile.organization_id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Write service detail endpoints**

```typescript
// app/api/services/[id]/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateServiceSchema } from '@/lib/validations/cotizapro'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: service, error } = await supabase
      .from('service_catalog')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({ service })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = updateServiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 })
    }

    const { data: service, error } = await supabase
      .from('service_catalog')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ service })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('service_catalog')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 3: Commit**

```bash
git add app/api/services/route.ts app/api/services/[id]/route.ts
git commit -m "feat(api): add service catalog CRUD endpoints"
```

---

### Task 11: Quotes API - Create Quote with Items

**Files:**
- Create: `app/api/quotes/route.ts`

**Step 1: Write create quote endpoint**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createQuoteSchema } from '@/lib/validations/cotizapro'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = createQuoteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 })
    }

    const { items, discount_rate, ...quoteData } = validation.data

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price)
    }, 0)

    const discount_amount = subtotal * (discount_rate / 100)
    const subtotal_after_discount = subtotal - discount_amount
    const tax_rate = 16.00 // IVA 16%
    const tax_amount = subtotal_after_discount * (tax_rate / 100)
    const total = subtotal_after_discount + tax_amount

    // Generate quote number
    const { data: quoteNumberResult } = await supabase
      .rpc('generate_quote_number', { org_id: profile.organization_id })

    if (!quoteNumberResult) {
      return NextResponse.json({ error: 'Failed to generate quote number' }, { status: 500 })
    }

    // Insert quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        ...quoteData,
        organization_id: profile.organization_id,
        quote_number: quoteNumberResult,
        subtotal,
        tax_rate,
        tax_amount,
        discount_rate,
        discount_amount,
        total,
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single()

    if (quoteError) {
      console.error('Error creating quote:', quoteError)
      return NextResponse.json({ error: quoteError.message }, { status: 500 })
    }

    // Insert quote items
    const quoteItems = items.map((item, index) => ({
      quote_id: quote.id,
      service_id: item.service_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_type: item.unit_type,
      subtotal: item.quantity * item.unit_price,
      sort_order: index,
    }))

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems)

    if (itemsError) {
      // Rollback quote creation
      await supabase.from('quotes').delete().eq('id', quote.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // Fetch complete quote with items
    const { data: completeQuote } = await supabase
      .from('quotes')
      .select(`
        *,
        items:quote_items(*),
        client:clients(*)
      `)
      .eq('id', quote.id)
      .single()

    return NextResponse.json({ quote: completeQuote }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const client_id = searchParams.get('client_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('quotes')
      .select(`
        *,
        client:clients(id, name, email, phone),
        items:quote_items(count)
      `, { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (client_id) {
      query = query.eq('client_id', client_id)
    }

    const { data: quotes, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      quotes,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add app/api/quotes/route.ts
git commit -m "feat(api): add quote creation and listing endpoints"
```

---

### Task 12: Quotes API - Quote Detail & Update

**Files:**
- Create: `app/api/quotes/[id]/route.ts`

**Step 1: Write quote detail endpoints (code in next message due to length)**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateQuoteSchema } from '@/lib/validations/cotizapro'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        items:quote_items(*),
        client:clients(*),
        notifications:quote_notifications(*)
      `)
      .eq('id', id)
      .single()

    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    return NextResponse.json({ quote })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateQuoteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 })
    }

    const { items, discount_rate, ...updateData } = validation.data

    // If items are being updated, recalculate totals
    if (items) {
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price)
      }, 0)

      const discountRate = discount_rate ?? 0
      const discount_amount = subtotal * (discountRate / 100)
      const subtotal_after_discount = subtotal - discount_amount
      const tax_rate = 16.00
      const tax_amount = subtotal_after_discount * (tax_rate / 100)
      const total = subtotal_after_discount + tax_amount

      // Update quote with new totals
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          ...updateData,
          subtotal,
          tax_amount,
          discount_rate: discountRate,
          discount_amount,
          total,
        })
        .eq('id', id)

      if (quoteError) {
        return NextResponse.json({ error: quoteError.message }, { status: 500 })
      }

      // Delete existing items and insert new ones
      await supabase.from('quote_items').delete().eq('quote_id', id)

      const quoteItems = items.map((item, index) => ({
        quote_id: id,
        service_id: item.service_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_type: item.unit_type,
        subtotal: item.quantity * item.unit_price,
        sort_order: index,
      }))

      await supabase.from('quote_items').insert(quoteItems)
    } else {
      // Just update quote fields
      const { error: quoteError } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', id)

      if (quoteError) {
        return NextResponse.json({ error: quoteError.message }, { status: 500 })
      }
    }

    // Fetch updated quote
    const { data: quote } = await supabase
      .from('quotes')
      .select(`
        *,
        items:quote_items(*),
        client:clients(*)
      `)
      .eq('id', id)
      .single()

    return NextResponse.json({ quote })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow deleting draft quotes
    const { data: quote } = await supabase
      .from('quotes')
      .select('status')
      .eq('id', id)
      .single()

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    if (quote.status !== 'draft') {
      return NextResponse.json({
        error: 'Only draft quotes can be deleted'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add app/api/quotes/[id]/route.ts
git commit -m "feat(api): add quote detail endpoints (GET/PATCH/DELETE)"
```

---

## Week 5-6: Integrations - WhatsApp & Email

### Task 13: Twilio WhatsApp Integration

**Files:**
- Create: `lib/integrations/twilio.ts`
- Create: `app/api/quotes/[id]/send/route.ts`

**Step 1: Write Twilio service**

```typescript
// lib/integrations/twilio.ts
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken = process.env.TWILIO_AUTH_TOKEN!
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM! // e.g., "whatsapp:+14155238886"

const client = twilio(accountSid, authToken)

export type SendWhatsAppParams = {
  to: string // Phone number with country code, e.g., "+521234567890"
  message: string
  mediaUrl?: string // Optional PDF URL
}

export async function sendWhatsAppMessage({
  to,
  message,
  mediaUrl,
}: SendWhatsAppParams) {
  try {
    // Format phone number for WhatsApp
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

    const messageParams: any = {
      from: whatsappFrom,
      to: whatsappTo,
      body: message,
    }

    if (mediaUrl) {
      messageParams.mediaUrl = [mediaUrl]
    }

    const result = await client.messages.create(messageParams)

    return {
      success: true,
      messageId: result.sid,
      status: result.status,
    }
  } catch (error: any) {
    console.error('WhatsApp send error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export async function getMessageStatus(messageSid: string) {
  try {
    const message = await client.messages(messageSid).fetch()
    return {
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
    }
  } catch (error: any) {
    console.error('Error fetching message status:', error)
    return {
      status: 'unknown',
      error: error.message,
    }
  }
}
```

**Step 2: Add environment variables to .env.example**

Add to `.env.example`:
```
# Twilio WhatsApp
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**Step 3: Commit**

```bash
git add lib/integrations/twilio.ts .env.example
git commit -m "feat(integrations): add Twilio WhatsApp service"
```

---

### Task 14: Email Service with Resend

**Files:**
- Create: `lib/integrations/email.ts`

**Step 1: Install Resend**

Run: `npm install resend`

**Step 2: Write email service**

```typescript
// lib/integrations/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export type SendEmailParams = {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
  }>
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: SendEmailParams) {
  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'CotizaPro <noreply@cotizapro.com>',
      to,
      subject,
      html,
      attachments,
    })

    return {
      success: true,
      messageId: result.data?.id,
    }
  } catch (error: any) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export function generateQuoteEmailHTML(quote: any, pdfUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nueva Cotización</h1>
          </div>
          <div class="content">
            <h2>Hola ${quote.client.name},</h2>
            <p>Adjunto encontrarás la cotización <strong>${quote.quote_number}</strong> con los servicios solicitados.</p>
            <p><strong>Total:</strong> $${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</p>
            <p><strong>Válida hasta:</strong> ${new Date(quote.valid_until).toLocaleDateString('es-MX')}</p>
            <a href="${pdfUrl}" class="button">Ver Cotización (PDF)</a>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          </div>
          <div class="footer">
            <p>Este correo fue generado automáticamente por CotizaPro</p>
          </div>
        </div>
      </body>
    </html>
  `
}
```

**Step 3: Add to .env.example**

```
# Email (Resend)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=CotizaPro <noreply@cotizapro.com>
```

**Step 4: Commit**

```bash
npm install resend
git add lib/integrations/email.ts package.json package-lock.json .env.example
git commit -m "feat(integrations): add Resend email service"
```

---

### Task 15: PDF Generation Service

**Files:**
- Create: `lib/integrations/pdf.ts`

**Step 1: Install PDF library**

Run: `npm install jspdf jspdf-autotable`
Run: `npm install -D @types/jspdf-autotable`

**Step 2: Write PDF generation service**

```typescript
// lib/integrations/pdf.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { QuoteWithItems } from '@/types/database.types'

export async function generateQuotePDF(quote: QuoteWithItems): Promise<Buffer> {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text('COTIZACIÓN', 105, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`No. ${quote.quote_number}`, 105, 28, { align: 'center' })

  // Company info (placeholder - should come from organization settings)
  doc.setFontSize(9)
  doc.text('Tu Empresa', 20, 45)
  doc.text('Dirección de tu empresa', 20, 50)
  doc.text('Tel: (555) 123-4567', 20, 55)

  // Client info
  doc.text('CLIENTE:', 120, 45)
  doc.text(quote.client.name, 120, 50)
  if (quote.client.phone) {
    doc.text(`Tel: ${quote.client.phone}`, 120, 55)
  }
  if (quote.client.email) {
    doc.text(quote.client.email, 120, 60)
  }

  // Date and validity
  doc.text(`Fecha: ${new Date(quote.created_at).toLocaleDateString('es-MX')}`, 20, 70)
  doc.text(`Válida hasta: ${new Date(quote.valid_until).toLocaleDateString('es-MX')}`, 20, 75)

  // Items table
  const tableData = quote.items.map(item => [
    item.description,
    item.quantity.toString(),
    item.unit_type,
    `$${item.unit_price.toFixed(2)}`,
    `$${item.subtotal.toFixed(2)}`,
  ])

  autoTable(doc, {
    startY: 85,
    head: [['Descripción', 'Cantidad', 'Unidad', 'Precio Unit.', 'Subtotal']],
    body: tableData,
    foot: [
      ['', '', '', 'Subtotal:', `$${quote.subtotal.toFixed(2)}`],
      ...(quote.discount_amount > 0
        ? [['', '', '', `Descuento (${quote.discount_rate}%):`, `-$${quote.discount_amount.toFixed(2)}`]]
        : []
      ),
      ['', '', '', `IVA (${quote.tax_rate}%):`, `$${quote.tax_amount.toFixed(2)}`],
      ['', '', '', 'TOTAL:', `$${quote.total.toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
  })

  // Notes
  if (quote.notes) {
    const finalY = (doc as any).lastAutoTable.finalY || 85
    doc.setFontSize(10)
    doc.text('Notas:', 20, finalY + 15)
    doc.setFontSize(9)
    const splitNotes = doc.splitTextToSize(quote.notes, 170)
    doc.text(splitNotes, 20, finalY + 22)
  }

  // Terms and conditions
  if (quote.terms_and_conditions) {
    const finalY = (doc as any).lastAutoTable.finalY || 85
    const notesHeight = quote.notes ? 30 : 0
    doc.setFontSize(8)
    doc.text('Términos y Condiciones:', 20, finalY + 15 + notesHeight)
    const splitTerms = doc.splitTextToSize(quote.terms_and_conditions, 170)
    doc.text(splitTerms, 20, finalY + 20 + notesHeight)
  }

  // Convert to buffer
  const pdfBlob = doc.output('arraybuffer')
  return Buffer.from(pdfBlob)
}
```

**Step 3: Commit**

```bash
npm install jspdf jspdf-autotable
npm install -D @types/jspdf-autotable
git add lib/integrations/pdf.ts package.json package-lock.json
git commit -m "feat(integrations): add PDF generation service"
```

---

### Task 16: Send Quote API Endpoint

**Files:**
- Create: `app/api/quotes/[id]/send/route.ts`

**Step 1: Write send quote endpoint**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendQuoteSchema } from '@/lib/validations/cotizapro'
import { generateQuotePDF } from '@/lib/integrations/pdf'
import { sendEmail, generateQuoteEmailHTML } from '@/lib/integrations/email'
import { sendWhatsAppMessage } from '@/lib/integrations/twilio'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = sendQuoteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 })
    }

    const { send_via, email_override, whatsapp_override } = validation.data

    // Fetch quote with all details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        items:quote_items(*),
        client:clients(*)
      `)
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Generate PDF
    const pdfBuffer = await generateQuotePDF(quote)

    // Upload PDF to Supabase Storage
    const pdfFileName = `quotes/${quote.organization_id}/${quote.quote_number}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('PDF upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(pdfFileName)

    const results: any = {
      email: null,
      whatsapp: null,
    }

    // Send via email
    if (send_via.includes('email')) {
      const emailTo = email_override || quote.client.email

      if (!emailTo) {
        return NextResponse.json({
          error: 'Client has no email and no override provided'
        }, { status: 400 })
      }

      const emailResult = await sendEmail({
        to: emailTo,
        subject: `Cotización ${quote.quote_number}`,
        html: generateQuoteEmailHTML(quote, publicUrl),
        attachments: [{
          filename: `${quote.quote_number}.pdf`,
          content: pdfBuffer,
        }],
      })

      results.email = emailResult

      // Log notification
      await supabase.from('quote_notifications').insert({
        quote_id: id,
        notification_type: 'email',
        recipient: emailTo,
        status: emailResult.success ? 'sent' : 'failed',
        provider_message_id: emailResult.messageId,
        error_message: emailResult.error,
      })
    }

    // Send via WhatsApp
    if (send_via.includes('whatsapp')) {
      const whatsappTo = whatsapp_override || quote.client.whatsapp_phone || quote.client.phone

      if (!whatsappTo) {
        return NextResponse.json({
          error: 'Client has no WhatsApp number and no override provided'
        }, { status: 400 })
      }

      const message = `Hola ${quote.client.name},\n\nTe envío la cotización ${quote.quote_number}.\n\nTotal: $${quote.total.toLocaleString('es-MX')} MXN\nVálida hasta: ${new Date(quote.valid_until).toLocaleDateString('es-MX')}\n\nPuedes ver el PDF aquí: ${publicUrl}\n\n¡Gracias!`

      const whatsappResult = await sendWhatsAppMessage({
        to: whatsappTo,
        message,
        mediaUrl: publicUrl,
      })

      results.whatsapp = whatsappResult

      // Log notification
      await supabase.from('quote_notifications').insert({
        quote_id: id,
        notification_type: 'whatsapp',
        recipient: whatsappTo,
        status: whatsappResult.success ? 'sent' : 'failed',
        provider_message_id: whatsappResult.messageId,
        error_message: whatsappResult.error,
      })
    }

    // Update quote status to 'sent'
    await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_via: send_via,
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      results,
      pdf_url: publicUrl,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Create storage bucket in Supabase**

Via Supabase dashboard:
1. Go to Storage
2. Create bucket named "documents"
3. Set as public
4. Add RLS policies for organization-based access

**Step 3: Commit**

```bash
git add app/api/quotes/[id]/send/route.ts
git commit -m "feat(api): add send quote endpoint with email/WhatsApp"
```

---

## Week 6-7: Frontend - Dashboard & Components

### Task 17: Install shadcn/ui Components

**Step 1: Initialize shadcn/ui**

Run: `npx shadcn@latest init`

Select options:
- TypeScript: Yes
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Step 2: Add required components**

Run: `npx shadcn@latest add button card input label select table badge dropdown-menu dialog form`

**Step 3: Commit**

```bash
git add components/ui lib/utils.ts components.json tailwind.config.ts
git commit -m "feat(ui): initialize shadcn/ui and add base components"
```

---

---

## Week 7-9: Landing Page (Parallel Track)

### Task 18: Landing Page - Hero Section

**Files:**
- Create: `app/(marketing)/page.tsx`
- Create: `app/(marketing)/layout.tsx`

**Step 1: Create marketing layout**

```typescript
// app/(marketing)/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CotizaPro - Cotizador Inteligente para Servicios',
  description: 'Crea cotizaciones profesionales en minutos. Envía por WhatsApp y Email. Gestiona clientes y servicios.',
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
```

**Step 2: Create hero section**

```typescript
// app/(marketing)/page.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">CotizaPro</div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link href="/signup">
              <Button>Prueba Gratis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Cotizaciones Profesionales<br />
          <span className="text-blue-600">en Minutos</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          La herramienta perfecta para técnicos de mantenimiento. Crea, envía y gestiona cotizaciones por WhatsApp y Email.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              Comenzar Gratis
            </Button>
          </Link>
          <Link href="#demo">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Ver Demo
            </Button>
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          ✓ Sin tarjeta de crédito ✓ 14 días gratis ✓ Cancelación cuando quieras
        </p>
      </section>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add app/(marketing)/page.tsx app/(marketing)/layout.tsx
git commit -m "feat(landing): add hero section"
```

---

### Task 19: Landing Page - Features Section

**Files:**
- Modify: `app/(marketing)/page.tsx`

**Step 1: Add features section**

```typescript
// Add after Hero Section
{/* Features Section */}
<section className="container mx-auto px-4 py-20">
  <h2 className="text-4xl font-bold text-center mb-12">
    Todo lo que necesitas para cotizar
  </h2>
  <div className="grid md:grid-cols-3 gap-8">
    <div className="p-6 border rounded-lg bg-white">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">Cotizaciones Rápidas</h3>
      <p className="text-gray-600">
        Crea cotizaciones profesionales en PDF en menos de 2 minutos con tu catálogo de servicios.
      </p>
    </div>

    <div className="p-6 border rounded-lg bg-white">
      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">Envío por WhatsApp</h3>
      <p className="text-gray-600">
        Envía cotizaciones directo al WhatsApp de tus clientes con un solo clic. Rápido y conveniente.
      </p>
    </div>

    <div className="p-6 border rounded-lg bg-white">
      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">Gestión de Clientes</h3>
      <p className="text-gray-600">
        Mantén organizados todos tus clientes con historial de cotizaciones y notas.
      </p>
    </div>

    <div className="p-6 border rounded-lg bg-white">
      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">Cálculo Automático</h3>
      <p className="text-gray-600">
        IVA, descuentos y totales calculados automáticamente. Sin errores matemáticos.
      </p>
    </div>

    <div className="p-6 border rounded-lg bg-white">
      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">Dashboard de Ventas</h3>
      <p className="text-gray-600">
        Visualiza tus cotizaciones, conversiones y métricas en tiempo real.
      </p>
    </div>

    <div className="p-6 border rounded-lg bg-white">
      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">100% Móvil</h3>
      <p className="text-gray-600">
        Crea y envía cotizaciones desde tu celular. Funciona en cualquier dispositivo.
      </p>
    </div>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add app/(marketing)/page.tsx
git commit -m "feat(landing): add features section"
```

---

### Task 20: Landing Page - Social Proof & CTA

**Files:**
- Modify: `app/(marketing)/page.tsx`

**Step 1: Add social proof and final CTA**

```typescript
// Add before closing </div>
{/* Social Proof */}
<section className="bg-gray-50 py-20">
  <div className="container mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-12">
      Confían en CotizaPro
    </h2>
    <div className="grid md:grid-cols-3 gap-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
          <div>
            <div className="font-semibold">Juan Pérez</div>
            <div className="text-sm text-gray-600">Técnico HVAC</div>
          </div>
        </div>
        <p className="text-gray-700">
          "Antes tardaba 30 minutos en hacer una cotización a mano. Ahora las hago en 2 minutos y las envío directo por WhatsApp."
        </p>
        <div className="text-yellow-500 mt-4">★★★★★</div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
          <div>
            <div className="font-semibold">María González</div>
            <div className="text-sm text-gray-600">Pintora Profesional</div>
          </div>
        </div>
        <p className="text-gray-700">
          "Mis clientes aman recibir cotizaciones profesionales por WhatsApp. He cerrado 40% más ventas desde que uso CotizaPro."
        </p>
        <div className="text-yellow-500 mt-4">★★★★★</div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
          <div>
            <div className="font-semibold">Carlos Ramírez</div>
            <div className="text-sm text-gray-600">Plomero</div>
          </div>
        </div>
        <p className="text-gray-700">
          "La gestión de clientes es increíble. Tengo todo el historial organizado y puedo hacer seguimiento fácilmente."
        </p>
        <div className="text-yellow-500 mt-4">★★★★★</div>
      </div>
    </div>
  </div>
</section>

{/* Pricing */}
<section className="container mx-auto px-4 py-20">
  <h2 className="text-4xl font-bold text-center mb-12">
    Planes que se ajustan a tu negocio
  </h2>
  <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
    <div className="border rounded-lg p-8">
      <h3 className="text-2xl font-bold mb-2">Gratis</h3>
      <div className="text-4xl font-bold mb-4">$0<span className="text-lg text-gray-600">/mes</span></div>
      <ul className="space-y-3 mb-8">
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>10 cotizaciones/mes</span>
        </li>
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>5 clientes</span>
        </li>
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Envío por email</span>
        </li>
      </ul>
      <Button variant="outline" className="w-full">Comenzar Gratis</Button>
    </div>

    <div className="border-2 border-blue-600 rounded-lg p-8 relative">
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm">
        Más Popular
      </div>
      <h3 className="text-2xl font-bold mb-2">Pro</h3>
      <div className="text-4xl font-bold mb-4">$299<span className="text-lg text-gray-600">/mes</span></div>
      <ul className="space-y-3 mb-8">
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Cotizaciones ilimitadas</span>
        </li>
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Clientes ilimitados</span>
        </li>
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>WhatsApp + Email</span>
        </li>
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Dashboard completo</span>
        </li>
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Soporte prioritario</span>
        </li>
      </ul>
      <Button className="w-full">Comenzar Ahora</Button>
    </div>

    <div className="border rounded-lg p-8">
      <h3 className="text-2xl font-bold mb-2">Empresa</h3>
      <div className="text-4xl font-bold mb-4">$799<span className="text-lg text-gray-600">/mes</span></div>
      <ul className="space-y-3 mb-8">
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Todo en Pro +</span>
        </li>
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Múltiples usuarios</span>
        </li>
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>API acceso</span>
        </li>
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Logo personalizado</span>
        </li>
        <li className="flex items-start">
          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Soporte dedicado</span>
        </li>
      </ul>
      <Button variant="outline" className="w-full">Contactar Ventas</Button>
    </div>
  </div>
</section>

{/* Final CTA */}
<section className="bg-blue-600 text-white py-20">
  <div className="container mx-auto px-4 text-center">
    <h2 className="text-4xl font-bold mb-6">
      Comienza a cotizar profesionalmente hoy
    </h2>
    <p className="text-xl mb-8 max-w-2xl mx-auto">
      Únete a cientos de técnicos que ya están cerrando más ventas con cotizaciones profesionales.
    </p>
    <Link href="/signup">
      <Button size="lg" variant="secondary" className="text-lg px-8">
        Prueba Gratis por 14 Días
      </Button>
    </Link>
    <p className="text-sm mt-4 opacity-90">
      Sin tarjeta de crédito • Cancelación cuando quieras
    </p>
  </div>
</section>

{/* Footer */}
<footer className="border-t py-12">
  <div className="container mx-auto px-4 text-center text-gray-600">
    <p>&copy; 2026 CotizaPro. Todos los derechos reservados.</p>
  </div>
</footer>
```

**Step 2: Commit**

```bash
git add app/(marketing)/page.tsx
git commit -m "feat(landing): add social proof, pricing, and footer"
```

---

## Summary & Execution Approach

### Implementation Plan Complete ✅

**Total Tasks**: 20 tasks covering:
- ✅ Week 1-2: Database schema (4 tasks)
- ✅ Week 2-3: TypeScript types & validation (2 tasks)
- ✅ Week 3-4: Client API (3 tasks)
- ✅ Week 4-5: Services & Quotes API (3 tasks)
- ✅ Week 5-6: WhatsApp/Email/PDF integrations (4 tasks)
- ✅ Week 6-7: shadcn/ui setup (1 task)
- ✅ Week 7-9: Landing page (3 tasks - PARALLEL TRACK)

### What's NOT in this plan (for later phases):
- Frontend dashboard components (clients list, quote builder, dashboard)
- Authentication pages (login, signup)
- Testing (unit, E2E)
- Deployment configuration

### Recommended Execution Strategy:

**Phase 1 (Weeks 1-6): Backend MVP** - Tasks 1-16
- Database + APIs + Integrations
- Can be tested via API calls (Postman/curl)

**Phase 2 (Weeks 7-9): Landing Page** - Tasks 18-20 (PARALLEL)
- Marketing website to capture leads
- Can launch independently

**Phase 3 (Later): Frontend Dashboard**
- Not in current plan, requires separate planning

---

## Plan saved to: `docs/plans/2026-02-12-cotizapro-mvp.md`