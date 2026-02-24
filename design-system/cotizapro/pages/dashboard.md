# Dashboard Page Overrides

> **PROJECT:** CotizaPro
> **Generated:** 2026-02-17 20:10:33 | **Updated:** 2026-02-17
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Structure:** Fixed sidebar (w-64) + full-height content area — NOT a marketing page layout
- **Max Width:** Full-width within content area; data tables can span 100%
- **Sidebar width:** `w-64` (256px), fixed, `border-r border-slate-200`
- **Content padding:** `p-6` or `p-8` inside the main content area
- **Sections (marketing layout NOT used here):** Dashboard uses sidebar-nav + content zones

### Spacing Overrides

- **Content Density:** High — optimize for information display
- **Nav item spacing:** `space-y-1` between nav links, `px-3 py-2` per item

### Typography Overrides

- No overrides — use Master typography (Geist Sans)
- Dashboard headings: `text-xl` or `text-2xl font-bold text-slate-900`
- Section labels: `text-xs font-semibold text-slate-400 uppercase tracking-wider`

### Color Overrides

- **Strategy:** Minimalist — white surface + Brand primary (#1E40AF blue-800) + accents only
- **Sidebar background:** `bg-white` with `border-r border-slate-200`
- **Active nav item:** `bg-blue-50 text-blue-700` (Master pattern — use exactly this)
- **Inactive nav item:** `text-slate-600 hover:bg-slate-100` with `duration-200 cursor-pointer`
- **Logo icon background:** `bg-blue-800` (#1E40AF — NOT blue-600)

### Status Badge Colors (for quote/reminder statuses)

| Status | Background | Text | Tailwind |
|--------|------------|------|----------|
| Draft / Borrador | `#EFF6FF` | `#1E40AF` | `bg-blue-50 text-blue-800` |
| Sent / Enviado | `#FFF7ED` | `#C2410C` | `bg-orange-50 text-orange-700` |
| Approved / Aprobado | `#F0FDF4` | `#15803D` | `bg-green-50 text-green-700` |
| Rejected / Rechazado | `#FEF2F2` | `#B91C1C` | `bg-red-50 text-red-700` |
| Expired / Expirado | `#F8FAFC` | `#475569` | `bg-slate-50 text-slate-600` |

### Component Overrides

- **z-index scale (use ONLY these values):**
  - `z-10` — Sticky table headers, in-page overlays
  - `z-20` — Dropdowns, tooltips
  - `z-30` — Modals, dialogs
  - `z-50` — Toast notifications, global alerts
- **No arbitrary z-index values** (e.g., `z-[999]`, `z-[9999]`)
- **No auto-play video** in dashboard panels

---

## Page-Specific Components

### Sidebar Nav Item

```tsx
// Active state
<Link className="bg-blue-50 text-blue-700 flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium">

// Inactive state
<Link className="text-slate-600 hover:bg-slate-100 flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer">
```

### Logo Mark

```tsx
// Logo icon — must use bg-blue-800 (#1E40AF)
<div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center text-white font-bold">
  C
</div>
```

### KPI / Stat Card

```tsx
<div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
  <p className="text-sm font-medium text-slate-500">Label</p>
  <p className="text-3xl font-bold text-slate-900 mt-1">Value</p>
  <p className="text-xs text-slate-400 mt-1">Sub-label or delta</p>
</div>
```

### Status Badge

```tsx
// Use the status color table above
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
  Aprobado
</span>
```

### Data Table Row

```tsx
// Row hover: subtle bg lift, no layout shift
<tr className="hover:bg-slate-50 transition-colors duration-150 cursor-pointer">
```

---

## Recommendations

- **Row highlighting:** `hover:bg-slate-50 transition-colors duration-150` on table rows
- **Loading states:** Use skeleton screens (`animate-pulse bg-slate-200 rounded`) — never blank space
- **Filter animations:** Smooth `transition-all duration-200` on filter panel open/close
- **Tooltips:** Appear on hover with `z-20`, `shadow-lg`, `bg-slate-900 text-white text-xs rounded px-2 py-1`
- **Empty states:** Show icon + heading + CTA button when list is empty
- **CTA Placement:** Primary action button top-right of content header (e.g., "Nueva Cotización")
- **Data Entry:** Allow multi-select on table rows for bulk actions
