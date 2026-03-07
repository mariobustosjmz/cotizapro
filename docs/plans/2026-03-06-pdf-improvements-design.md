# Sprint 7 — PDF Improvements Design

**Date:** 2026-03-06
**Status:** Approved

## Summary

Replace the jsPDF/autoTable PDF generator with `@react-pdf/renderer` to produce professional, branded quote PDFs using org settings (logo, brand color, company info).

## Architecture

**Library:** `@react-pdf/renderer` — server-side React component tree rendered to Buffer. No browser/Puppeteer required.

**Files changed:**
- `lib/integrations/pdf.ts` — replace `generateQuotePDF()` internals; public API unchanged
- `lib/pdf/QuotePDF.tsx` — React PDF document component (new)
- `lib/pdf/pdf-styles.ts` — StyleSheet definitions (new)

**Files unchanged:**
- `app/api/export/quote/[id]/route.ts` — no changes needed

## Visual Layout

Modern header band style:

```
┌──────────────────────────────────────────────────────┐
│  [BRAND COLOR BAND - full width]                     │
│  [Logo img or building icon]  Company Name           │
│                               Address | Phone | Email│
└──────────────────────────────────────────────────────┘
│                                                      │
│  COTIZACION #COT-2026-001          Fecha: 01/03/2026 │
│  Valida hasta: 31/03/2026                            │
│                                                      │
│  CLIENTE                                             │
│  Nombre del cliente                                  │
│  empresa@email.com | (555) 000-0000                  │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Descripcion    Cant.  Unidad  Precio   Subtotal      │
├──────────────────────────────────────────────────────┤
│  Servicio A     2      hrs     $500     $1,000        │
│  Servicio B     1      fijo    $2,000   $2,000        │
├──────────────────────────────────────────────────────┤
│                          Subtotal:      $3,000        │
│                          IVA (16%):     $480          │
│  [BRAND COLOR ROW]       TOTAL:         $3,480        │
└──────────────────────────────────────────────────────┘
│  Notas: ...                                          │
│  Terminos y condiciones: ...                         │
│  Pag. 1                                              │
└──────────────────────────────────────────────────────┘
```

## Data Flow

1. `GET /api/export/quote/[id]` fetches quote + org settings
2. Org settings already include: `logo_url`, `brand_color`, `company_address`, `company_phone`, `company_email`
3. `generateQuotePDF(quote, orgSettings)` calls `renderToBuffer(<QuotePDF ... />)`
4. Logo: if `logo_url` exists → `<Image src={logo_url} />`, else → inline SVG building icon
5. Brand color: defaults to `#2563EB` if not set in org settings

## Error Handling

- Logo fetch failure: silently falls back to building icon (handled inside React PDF)
- Missing org settings fields: sensible defaults (org.name for company name, etc.)
- PDF render failure: existing 500 handler in route catches it

## Testing

- Manual: download PDF from quote detail, verify branding matches org settings
- E2E: update `04-quotes.spec.ts` PDF export test to verify 200 response still passes
- No unit tests: PDF visual output is not unit-testable
