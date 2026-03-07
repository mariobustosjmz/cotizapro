# PDF Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the jsPDF/autoTable quote PDF generator with `@react-pdf/renderer` producing a branded, modern PDF that uses the org's logo, brand color, and company info from settings.

**Architecture:** New React PDF component tree in `lib/pdf/` renders the quote document. The public API of `generateQuotePDF()` in `lib/integrations/pdf.ts` gains an optional `orgSettings` param and delegates to `renderToBuffer()`. The API route fetches org settings and passes them through.

**Tech Stack:** `@react-pdf/renderer` (server-side PDF), existing Supabase org settings JSONB, Next.js API route

---

### Task 1: Install @react-pdf/renderer

**Files:**
- Modify: `apps/web/package.json` (via install command)

**Step 1: Install the package**

```bash
cd apps/web
npm install @react-pdf/renderer
npm install --save-dev @types/react-pdf 2>/dev/null || true
```

**Step 2: Verify install**

```bash
node -e "require('@react-pdf/renderer'); console.log('OK')"
```
Expected: `OK`

**Step 3: Commit**

```bash
cd ../..
git add apps/web/package.json apps/web/package-lock.json
git commit -m "chore: add @react-pdf/renderer"
```

---

### Task 2: Create PDF StyleSheet

**Files:**
- Create: `apps/web/lib/pdf/pdf-styles.ts`

**Step 1: Create the styles file**

```typescript
// apps/web/lib/pdf/pdf-styles.ts
import { StyleSheet, Font } from '@react-pdf/renderer'

// Default brand color if org has none configured
export const DEFAULT_BRAND_COLOR = '#2563EB'

export function createStyles(brandColor: string) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#111827',
      backgroundColor: '#FFFFFF',
    },
    // Header band
    headerBand: {
      backgroundColor: brandColor,
      padding: '20 24',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    logoImage: {
      width: 48,
      height: 48,
      objectFit: 'contain',
      borderRadius: 4,
    },
    logoIconContainer: {
      width: 48,
      height: 48,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCompanyBlock: {
      flex: 1,
    },
    headerCompanyName: {
      fontSize: 16,
      fontFamily: 'Helvetica-Bold',
      color: '#FFFFFF',
    },
    headerCompanyDetail: {
      fontSize: 8,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
    },
    // Body
    body: {
      padding: '20 24',
    },
    // Quote meta row
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    metaLabel: {
      fontSize: 8,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metaValue: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
      marginTop: 2,
    },
    metaValueSub: {
      fontSize: 9,
      color: '#374151',
      marginTop: 1,
    },
    // Section label
    sectionLabel: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    clientBlock: {
      marginBottom: 20,
    },
    clientName: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    clientDetail: {
      fontSize: 9,
      color: '#374151',
      marginTop: 2,
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      marginBottom: 12,
    },
    // Items table
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: brandColor,
      padding: '6 8',
      borderRadius: 2,
      marginBottom: 1,
    },
    tableHeaderCell: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#FFFFFF',
    },
    tableRow: {
      flexDirection: 'row',
      padding: '5 8',
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    tableRowAlt: {
      backgroundColor: '#F9FAFB',
    },
    tableCell: {
      fontSize: 9,
      color: '#374151',
    },
    // Column widths
    colDesc: { flex: 4 },
    colQty: { flex: 1, textAlign: 'right' },
    colUnit: { flex: 1.5, textAlign: 'center' },
    colPrice: { flex: 2, textAlign: 'right' },
    colSubtotal: { flex: 2, textAlign: 'right' },
    // Totals
    totalsBlock: {
      marginTop: 12,
      alignItems: 'flex-end',
    },
    totalsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 40,
      marginBottom: 3,
    },
    totalsLabel: {
      fontSize: 9,
      color: '#6B7280',
      width: 80,
      textAlign: 'right',
    },
    totalsValue: {
      fontSize: 9,
      color: '#111827',
      width: 80,
      textAlign: 'right',
    },
    totalFinalRow: {
      flexDirection: 'row',
      backgroundColor: brandColor,
      padding: '6 8',
      borderRadius: 2,
      marginTop: 4,
      gap: 40,
    },
    totalFinalLabel: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: '#FFFFFF',
      width: 80,
      textAlign: 'right',
    },
    totalFinalValue: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: '#FFFFFF',
      width: 80,
      textAlign: 'right',
    },
    // Notes / Terms
    notesBlock: {
      marginTop: 20,
    },
    notesText: {
      fontSize: 9,
      color: '#374151',
      lineHeight: 1.5,
    },
    // Footer
    footer: {
      position: 'absolute',
      bottom: 16,
      left: 24,
      right: 24,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    footerText: {
      fontSize: 8,
      color: '#9CA3AF',
    },
  })
}
```

**Step 2: Commit**

```bash
git add apps/web/lib/pdf/pdf-styles.ts
git commit -m "feat: add PDF stylesheet for branded quote layout"
```

---

### Task 3: Create QuotePDF React Component

**Files:**
- Create: `apps/web/lib/pdf/QuotePDF.tsx`

**Step 1: Create the component**

```tsx
// apps/web/lib/pdf/QuotePDF.tsx
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Path,
  Rect,
} from '@react-pdf/renderer'
import { createStyles, DEFAULT_BRAND_COLOR } from './pdf-styles'
import type { QuoteWithItems } from '@/types/database.types'

export interface OrgSettings {
  company_address?: string
  company_phone?: string
  company_email?: string
  logo_url?: string
  brand_color?: string
}

interface QuotePDFProps {
  quote: QuoteWithItems
  orgName: string
  orgSettings: OrgSettings
}

function BuildingIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24">
      <Rect x="2" y="3" width="20" height="18" rx="1" fill="rgba(255,255,255,0.3)" />
      <Rect x="6" y="7" width="3" height="3" fill="white" />
      <Rect x="11" y="7" width="3" height="3" fill="white" />
      <Rect x="6" y="12" width="3" height="3" fill="white" />
      <Rect x="11" y="12" width="3" height="3" fill="white" />
      <Rect x="9" y="17" width="6" height="4" fill="white" />
    </Svg>
  )
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function QuotePDF({ quote, orgName, orgSettings }: QuotePDFProps) {
  const brandColor = orgSettings.brand_color ?? DEFAULT_BRAND_COLOR
  const styles = createStyles(brandColor)

  const companyLines = [
    orgSettings.company_address,
    orgSettings.company_phone,
    orgSettings.company_email,
  ].filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header band */}
        <View style={styles.headerBand}>
          {orgSettings.logo_url ? (
            <Image src={orgSettings.logo_url} style={styles.logoImage} />
          ) : (
            <View style={styles.logoIconContainer}>
              <BuildingIcon />
            </View>
          )}
          <View style={styles.headerCompanyBlock}>
            <Text style={styles.headerCompanyName}>{orgName}</Text>
            {companyLines.map((line, i) => (
              <Text key={i} style={styles.headerCompanyDetail}>{line}</Text>
            ))}
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Quote meta + client */}
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Cotizacion</Text>
              <Text style={styles.metaValue}>#{quote.quote_number}</Text>
              <Text style={styles.metaValueSub}>Fecha: {formatDate(quote.created_at)}</Text>
              <Text style={styles.metaValueSub}>Valida hasta: {formatDate(quote.valid_until)}</Text>
            </View>
            <View style={styles.clientBlock}>
              <Text style={styles.metaLabel}>Cliente</Text>
              <Text style={styles.clientName}>{quote.client.name}</Text>
              {quote.client.email && (
                <Text style={styles.clientDetail}>{quote.client.email}</Text>
              )}
              {quote.client.phone && (
                <Text style={styles.clientDetail}>{quote.client.phone}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Items table */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Descripcion</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Cant.</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unidad</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio Unit.</Text>
            <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
          </View>

          {quote.items.map((item, index) => (
            <View
              key={item.id}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.tableCell, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colUnit]}>{item.unit_type}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{formatCurrency(Number(item.unit_price))}</Text>
              <Text style={[styles.tableCell, styles.colSubtotal]}>{formatCurrency(Number(item.subtotal))}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(quote.subtotal)}</Text>
            </View>
            {quote.discount_amount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Descuento ({quote.discount_rate}%):</Text>
                <Text style={styles.totalsValue}>-{formatCurrency(quote.discount_amount)}</Text>
              </View>
            )}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IVA ({quote.tax_rate}%):</Text>
              <Text style={styles.totalsValue}>{formatCurrency(quote.tax_amount)}</Text>
            </View>
            <View style={styles.totalFinalRow}>
              <Text style={styles.totalFinalLabel}>TOTAL:</Text>
              <Text style={styles.totalFinalValue}>{formatCurrency(quote.total)}</Text>
            </View>
          </View>

          {/* Notes */}
          {quote.notes && (
            <View style={styles.notesBlock}>
              <Text style={styles.sectionLabel}>Notas</Text>
              <Text style={styles.notesText}>{quote.notes}</Text>
            </View>
          )}

          {/* Terms */}
          {quote.terms_and_conditions && (
            <View style={styles.notesBlock}>
              <Text style={styles.sectionLabel}>Terminos y Condiciones</Text>
              <Text style={styles.notesText}>{quote.terms_and_conditions}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{orgName} — {quote.quote_number}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Pag. ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/lib/pdf/QuotePDF.tsx
git commit -m "feat: add QuotePDF React component with branded header band"
```

---

### Task 4: Update generateQuotePDF to use React PDF

**Files:**
- Modify: `apps/web/lib/integrations/pdf.ts`

**Step 1: Replace the file contents**

```typescript
// apps/web/lib/integrations/pdf.ts
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { QuotePDF, type OrgSettings } from '@/lib/pdf/QuotePDF'
import type { QuoteWithItems } from '@/types/database.types'

export async function generateQuotePDF(
  quote: QuoteWithItems,
  orgName: string = 'Tu Empresa',
  orgSettings: OrgSettings = {}
): Promise<Buffer> {
  const element = React.createElement(QuotePDF, { quote, orgName, orgSettings })
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
```

**Step 2: Commit**

```bash
git add apps/web/lib/integrations/pdf.ts
git commit -m "feat: wire generateQuotePDF to React PDF renderer"
```

---

### Task 5: Update API Route to Pass Org Settings

**Files:**
- Modify: `apps/web/app/api/export/quote/[id]/route.ts`

**Step 1: Fetch org settings and pass to generateQuotePDF**

Replace the block that calls `generateQuotePDF(typedQuote)` with:

```typescript
// After fetching the quote, fetch org settings
const { data: profile } = await supabase
  .from('profiles')
  .select('organization_id')
  .eq('id', user.id)
  .single()

const { data: org } = profile
  ? await supabase
      .from('organizations')
      .select('name, settings')
      .eq('id', profile.organization_id)
      .single()
  : { data: null }

const orgName: string = org?.name ?? 'Tu Empresa'
const orgSettings = (org?.settings ?? {}) as {
  company_address?: string
  company_phone?: string
  company_email?: string
  logo_url?: string
  brand_color?: string
}

const pdfBuffer = await generateQuotePDF(typedQuote, orgName, orgSettings)
```

The full updated route:

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateQuotePDF } from '@/lib/integrations/pdf'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import type { QuoteWithItems } from '@/types/database.types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/export/quote/[id]')
    }

    const [quoteResult, profileResult] = await Promise.all([
      supabase
        .from('quotes')
        .select(`*, items:quote_items(*), client:clients(*)`)
        .eq('id', id)
        .single(),
      supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single(),
    ])

    if (quoteResult.error || !quoteResult.data) {
      logger.error('Quote not found for PDF export', quoteResult.error, { quoteId: id })
      return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'GET /api/export/quote/[id]')
    }

    const quote = quoteResult.data
    const orgId = profileResult.data?.organization_id

    const { data: org } = orgId
      ? await supabase
          .from('organizations')
          .select('name, settings')
          .eq('id', orgId)
          .single()
      : { data: null }

    const orgName: string = org?.name ?? 'Tu Empresa'
    const orgSettings = (org?.settings ?? {}) as {
      company_address?: string
      company_phone?: string
      company_email?: string
      logo_url?: string
      brand_color?: string
    }

    const typedQuote: QuoteWithItems = {
      ...quote,
      items: quote.items ?? [],
      client: quote.client,
      subtotal: Number(quote.subtotal),
      tax_amount: Number(quote.tax_amount),
      tax_rate: Number(quote.tax_rate),
      discount_rate: Number(quote.discount_rate),
      discount_amount: Number(quote.discount_amount),
      total: Number(quote.total),
    }

    const pdfBuffer = await generateQuotePDF(typedQuote, orgName, orgSettings)

    logger.api('GET', `/api/export/quote/${id}`, 200, 0, { quoteNumber: quote.quote_number })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cotizacion-${quote.quote_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error: unknown) {
    logger.error('Unexpected error in GET /api/export/quote/[id]', error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to export PDF'),
      'GET /api/export/quote/[id]'
    )
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/app/api/export/quote/\[id\]/route.ts
git commit -m "feat: pass org name and settings to PDF generator"
```

---

### Task 6: Verify Build Passes

**Step 1: Run TypeScript check**

```bash
cd apps/web
npm run type-check 2>&1 | tail -20
```
Expected: no errors

**Step 2: Run build**

```bash
npm run build 2>&1 | tail -30
```
Expected: `✓ Compiled successfully`

**Step 3: Fix any type errors**

Common issues:
- `@react-pdf/renderer` style type conflicts → add `as any` only on conflicting spread styles
- `React.createElement` needs `React` import → ensure `import React from 'react'` is present

**Step 4: Commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve type errors in PDF components"
```

---

### Task 7: Manual Smoke Test

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Log in and open a quote**

Navigate to: `http://localhost:3000/dashboard/quotes`
Click any quote → click "Descargar PDF" or use the export button.

**Step 3: Verify PDF contents**

Open the downloaded PDF and check:
- [ ] Header band shows in brand color (default blue if not set)
- [ ] Company name appears in header
- [ ] Building icon appears if no logo set
- [ ] Quote number, dates, client info present
- [ ] Items table renders with alternating rows
- [ ] Totals row has colored background
- [ ] Page number in footer

**Step 4: Test with org settings**

Go to `http://localhost:3000/dashboard/settings` → Organization tab.
Set a brand color (e.g., `#DC2626` red) → Save.
Re-download PDF → verify header band color changed.

---

### Task 8: Update E2E Test

**Files:**
- Modify: `apps/web/e2e/specs/04-quotes.spec.ts`

**Step 1: Find the existing PDF export test**

```bash
grep -n "pdf\|PDF\|export\|download" apps/web/e2e/specs/04-quotes.spec.ts
```

**Step 2: Verify the test still passes**

```bash
cd apps/web
npx playwright test e2e/specs/04-quotes.spec.ts --reporter=line 2>&1 | tail -20
```
Expected: all tests pass (the API contract is unchanged — still returns `application/pdf`)

**Step 3: Commit if test file was updated**

```bash
git add apps/web/e2e/specs/04-quotes.spec.ts
git commit -m "test: verify PDF export E2E test passes with new renderer"
```

---

### Task 9: Remove Unused jsPDF Dependencies

Only after confirming the build and tests pass:

**Step 1: Remove old deps**

```bash
cd apps/web
npm uninstall jspdf jspdf-autotable
```

**Step 2: Verify build still passes**

```bash
npm run build 2>&1 | tail -10
```

**Step 3: Commit**

```bash
cd ../..
git add apps/web/package.json apps/web/package-lock.json
git commit -m "chore: remove jspdf and jspdf-autotable"
```

---

## Summary

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Install @react-pdf/renderer | chore: add dep |
| 2 | Create PDF StyleSheet | feat: pdf-styles.ts |
| 3 | Create QuotePDF component | feat: QuotePDF.tsx |
| 4 | Update generateQuotePDF | feat: wire to renderer |
| 5 | Update API route | feat: pass org settings |
| 6 | Verify build | fix: type errors if any |
| 7 | Manual smoke test | (no commit) |
| 8 | E2E test verification | test: e2e passes |
| 9 | Remove jsPDF | chore: remove old deps |
