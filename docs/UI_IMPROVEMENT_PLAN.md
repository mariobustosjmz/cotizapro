# CotizaPro — Admin UI/UX Improvement Plan

> Aesthetic Direction: **Refined Dark-Premium**
> Goal: Impressive, clean, consistent — every action reachable in 2 clicks
> Brand accent: Orange `#f97316` on deep-dark `#0F1117` base

---

## Design Principles

| Principle | Rule |
|-----------|------|
| **Clarity** | Every element has one clear purpose. No decoration without function. |
| **Consistency** | Same icon = same meaning everywhere. Same spacing grid (4px base). |
| **Speed** | Critical actions always visible. No buried menus. |
| **Hierarchy** | Typography scale drives attention. Size and weight = importance. |
| **Feedback** | Every interaction returns visible state change within 150ms. |

---

## Phase 1 — Design System Tokens

> Foundation for all other phases. Must be done first.

### Tasks

- [x] **1.1** Create `lib/design-tokens.ts` — single source of truth for colors, spacing, radii
- [x] **1.2** Update `app/globals.css` — CSS custom properties for all tokens
  - Surface colors: `--surface-base`, `--surface-raised`, `--surface-sunken`
  - Sidebar-specific: `--sidebar-bg`, `--sidebar-border`, `--sidebar-item-hover`, `--sidebar-item-active`
  - Accent: `--accent-primary` (orange), `--accent-secondary`, `--accent-muted`
  - Text hierarchy: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-disabled`
  - Status: `--status-success`, `--status-warning`, `--status-error`, `--status-info`
  - Radius scale: `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px)
  - Shadow scale: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- [x] **1.3** Install `lucide-react` icon set — standardize all icons (no mixing sets)
- [x] **1.4** Create `components/ui/icon.tsx` — typed Icon wrapper component with consistent sizing
- [x] **1.5** Create `components/ui/badge.tsx` — status badge with semantic color mapping

---

## Phase 2 — Sidebar Redesign

> Current issues: flat hierarchy, no keyboard hints, redundant separators, small logo area

### Target UX
- Collapsible to icon-only rail (saves space on small screens)
- Group labels for navigation sections (clearly labeled)
- Active state: full-width highlight, not just text color change
- Keyboard shortcut hints visible on hover
- User avatar menu replaces bottom section

### Tasks

- [x] **2.1** Redesign sidebar layout — `components/dashboard/sidebar.tsx`
  - Add `isCollapsed` state with `localStorage` persistence
  - Collapse toggle button at bottom (Chevron icon, tooltip "Colapsar")
  - Width: `w-60` → `w-60` (expanded) / `w-16` (collapsed), smooth `transition-all duration-200`
- [x] **2.2** Improve logo area
  - Logo: orange square with "C" + "CotizaPro" wordmark side by side
  - Collapsed: icon only, centered
  - Height: `h-16` (was `h-14`) for more breathing room
- [x] **2.3** Navigation items — active state overhaul
  - Active item: `bg-orange-500/10 text-orange-400 border-l-2 border-orange-500`
  - Hover item: `bg-white/5 text-white`
  - Inactive item: `text-slate-400`
  - Add keyboard shortcut labels on hover (use `title` attribute + tooltip)
  - Icon size: `w-5 h-5` consistent
- [x] **2.4** Section grouping with labels
  ```
  [PRINCIPAL]
  - Dashboard         G → D
  - Clientes          G → C
  - Cotizaciones      G → Q
  - Recordatorios     G → R
  - Servicios         G → S

  [ANÁLISIS]
  - Analytics

  [CONFIGURACIÓN]
  - Mi Equipo
  - Configuración
  - Campos Extra
  ```
- [x] **2.5** User section at bottom
  - Avatar (initials, 32px circle, orange bg)
  - Name + role (truncated)
  - Dropdown on click: Perfil / Configuración / Cerrar sesión
  - Collapsed: avatar only with dropdown
- [x] **2.6** Add notification dot on "Recordatorios" if there are pending
- [x] **2.7** Add NEW QUOTE quick-action button in sidebar top area
  - Orange pill button: `+ Nueva Cotización`
  - Collapsed: `+` icon only
  - This removes the need to go to header for primary CTA

---

## Phase 3 — Header / Topbar Redesign

> Current issues: redundant "Nueva Cotización" (if in sidebar), no search, logout is too prominent

### Target UX
- Breadcrumb navigation (not just page title)
- Global search bar (opens command palette style)
- User actions: notifications + profile menu
- No logout button in toolbar (move to profile dropdown)

### Tasks

- [x] **3.1** Redesign header — `components/dashboard/header.tsx`
  - Height: keep `h-14`
  - Left: breadcrumb trail (Dashboard / Clientes / Juan García)
  - Center: search bar with keyboard shortcut hint `⌘K`
  - Right: notifications bell (with count badge) + profile avatar
- [x] **3.2** Implement breadcrumb component — `components/ui/breadcrumb.tsx`
  - Parse pathname into segments
  - Each segment is a link
  - Last segment is non-linked, bold
  - Chevron separator
- [x] **3.3** Implement Command Palette — `components/ui/command-palette.tsx`
  - Trigger: `⌘K` or search bar click
  - Modal overlay with input
  - Search clients, quotes, services, navigation
  - Group results by category
  - Keyboard navigation (↑↓ select, Enter go)
- [x] **3.4** Notifications dropdown
  - Bell icon with orange dot if pending
  - Dropdown: list of recent reminders/notifications
  - "Ver todos" link to reminders page
- [x] **3.5** Profile dropdown (top right)
  - Avatar + name
  - Items: Perfil, Configuración, Ayuda, Cerrar sesión
  - Logout moved here from toolbar

---

## Phase 4 — Form Components Overhaul

> Current issues: generic inputs, no clear error states, inconsistent spacing, no loading states

### Target UX
- Clear label + optional helper text pattern
- Inline validation (not just on submit)
- Loading spinners on async operations
- Consistent section headers inside forms
- Better select/dropdown components

### Tasks

- [x] **4.1** Redesign `components/ui/input.tsx`
  - Add `label`, `error`, `hint` props or use composition
  - Error state: red border + error icon + message below
  - Success state: green check for validated fields
  - Disabled state: clear visual difference
  - Prefix/suffix slot (e.g., $ prefix for money, icons)
- [x] **4.2** Create `components/ui/form-field.tsx` — label + input + error + hint compound
  - Pattern: `<FormField label="Nombre" error={errors.name} hint="Nombre completo del cliente">`
- [x] **4.3** Redesign `components/ui/select.tsx` — native select replacement
  - Custom styled dropdown with Radix UI Select
  - Searchable for long lists
- [x] **4.4** Create `components/ui/form-section.tsx` — section divider inside forms
  - Bold title + optional description + children
  - Visual separator before next section
- [x] **4.5** Update client form — `app/(dashboard)/dashboard/clients/new/page.tsx`
  - Apply FormField pattern
  - Add photo upload placeholder (optional)
  - Sections: "Información Personal" / "Datos de Contacto" / "Notas"
- [x] **4.6** Update quote form — `app/(dashboard)/dashboard/quotes/new/page.tsx`
  - Multi-step or sectioned layout:
    - Step 1: Cliente + Fecha validez
    - Step 2: Servicios (line items)
    - Step 3: Condiciones + Notas
  - Live total calculation always visible (sticky footer)
- [x] **4.7** Update service form — `app/(dashboard)/dashboard/services/new/page.tsx`
  - Unit type selector with visual icons (clock, area, etc.)
- [x] **4.8** Update reminder form — `app/(dashboard)/dashboard/reminders/new/page.tsx`
  - Date/time picker that is more visual
  - Relate to quote (searchable dropdown)
- [x] **4.9** Add loading states to all forms
  - Submit button shows spinner during async
  - Form disables during submission
  - Success toast on completion

---

## Phase 5 — List/Table Pages Overhaul

> Current issues: plain table layouts, no bulk actions, limited filtering

### Tasks

- [x] **5.1** Create filter components for all list pages
  - `reminders/filters.tsx` — status pills + search (ReminderFilters)
  - `services/filters.tsx` — unit_type pills + active/inactive pills + search (ServiceFilters)
  - `quotes/search-input.tsx` — search input (QuoteSearchInput)
  - `clients/search-input.tsx` — search input (ClientSearchInput)
- [x] **5.2** Add filter bar to all list pages
  - Reminders: filter by status (pending/completed/snoozed/cancelled) + title search
  - Quotes: filter by status pills + quote_number search
  - Services: filter by unit_type + active/inactive + name search
  - Clients: text search (already complete from prior phase)
- [x] **5.3** Search input on all list pages
  - DB-level `.ilike()` filtering — server-side on all pages
  - URL-param driven (searchParams) for shareable filtered views
- [x] **5.4** Add status badge component to table rows (using badge.tsx from Phase 1)
- [x] **5.5** Improve list page headers
  - Title + count (e.g., "Clientes · 24") — all 4 pages
  - Primary CTA button (right aligned)
  - Filter/search bar below

---

## Phase 6 — Dashboard Home Redesign

> Current issues: stats cards feel generic, activity list is plain

### Tasks

- [x] **6.1** Improve stats cards — `components/dashboard/stats-cards.tsx`
  - Larger number display
  - Trend arrow (↑↓) with percentage
  - Sparkline mini-chart (optional stretch)
  - Hover: subtle lift shadow
- [x] **6.2** Improve recent activity section
  - Show more context (client company, date, status)
  - Status color-coded left border on row
  - "Ver todas" footer link
- [x] **6.3** Add quick-actions panel
  - 3 cards: "Nueva Cotización" / "Nuevo Cliente" / "Nuevo Recordatorio"
  - Large icon + label + sub-label
- [x] **6.4** Add "Recordatorios urgentes" panel
  - If overdue reminders exist: orange warning banner at top

---

## Phase 7 — Micro-interactions & Polish

> Final polish pass after all components are updated

### Tasks

- [x] **7.1** Add page transitions — subtle fade when navigating between routes
- [x] **7.2** Add skeleton loaders for all async data sections
- [x] **7.3** Add toast notifications system — `components/ui/toast.tsx`
  - Success (green), Error (red), Warning (orange), Info (blue)
  - Auto-dismiss after 4 seconds
  - Stack multiple toasts
- [x] **7.4** Keyboard shortcut system
  - `G` then `D` → Dashboard
  - `G` then `C` → Clientes
  - `G` then `Q` → Cotizaciones
  - `G` then `R` → Recordatorios
  - `G` then `S` → Servicios
  - `N` then `C` → Nueva Cotización
  - `⌘K` → Command palette
- [x] **7.5** Accessibility audit
  - All interactive elements have aria labels
  - Focus rings visible
  - Color contrast ratios ≥ 4.5:1
  - Screen reader tested with main flows
- [x] **7.6** Responsive check
  - Dashboard usable at 1024px (min supported)
  - Sidebar auto-collapses at 1280px
  - Tables scroll horizontally below 768px

---

## Icon Standardization Map

All icons from `lucide-react`. Sizes: `w-4 h-4` (inline), `w-5 h-5` (nav), `w-6 h-6` (feature).

| Concept | Icon Name | Usage |
|---------|-----------|-------|
| Dashboard | `LayoutDashboard` | Nav + page header |
| Clients | `Users` | Nav + header |
| Quotes | `FileText` | Nav + header |
| Reminders | `Bell` | Nav + header + notifications |
| Services | `Briefcase` | Nav + header |
| Analytics | `BarChart3` | Nav + header |
| Team | `UsersRound` | Nav settings |
| Settings | `Settings2` | Nav settings |
| Custom Fields | `Sliders` | Nav settings |
| Add / New | `Plus` | All primary CTAs |
| Edit | `Pencil` | Row actions |
| Delete | `Trash2` | Destructive actions |
| Search | `Search` | Search bars |
| Filter | `Filter` | Filter toggles |
| Sort | `ArrowUpDown` | Column headers |
| Expand | `ChevronRight` | Breadcrumbs, collapsed states |
| Collapse | `ChevronDown` | Dropdowns, expanded states |
| Close | `X` | Modals, toasts |
| Check | `Check` | Success states, checkboxes |
| Alert | `AlertCircle` | Error states |
| Info | `Info` | Helper hints |
| Calendar | `Calendar` | Date pickers, reminders |
| Money | `DollarSign` | Price/revenue |
| Status Draft | `FileEdit` | Quote status |
| Status Sent | `Send` | Quote status |
| Status Accepted | `CheckCircle2` | Quote status |
| Status Rejected | `XCircle` | Quote status |
| Logout | `LogOut` | Profile dropdown |
| Profile | `UserCircle` | Profile items |
| Keyboard | `Keyboard` | Shortcut hints |
| Command | `Command` | ⌘K palette |

---

## Implementation Priority & Sequence

```
Phase 1 (Foundation)     ─── must complete before anything else
Phase 2 (Sidebar)        ─── core navigation, high impact
Phase 3 (Header)         ─── daily interaction, high impact
Phase 4 (Forms)          ─── CRUD quality, medium-high impact
Phase 5 (Lists/Tables)   ─── data presentation, medium impact
Phase 6 (Dashboard)      ─── first impression, medium impact
Phase 7 (Polish)         ─── final quality pass
```

**Estimated files to modify:**
- `app/globals.css` — Phase 1
- `components/dashboard/sidebar.tsx` — Phase 2
- `components/dashboard/header.tsx` — Phase 3
- `components/ui/input.tsx` — Phase 4
- `components/ui/button.tsx` — Phase 4 (minor)
- `components/ui/badge.tsx` — Phase 1 (new)
- `components/ui/form-field.tsx` — Phase 4 (new)
- `components/ui/breadcrumb.tsx` — Phase 3 (new)
- `components/ui/data-table.tsx` — Phase 5 (new)
- `components/ui/toast.tsx` — Phase 7 (new)
- All `app/(dashboard)/dashboard/*/page.tsx` — Phases 4–6

---

## Acceptance Criteria

Before marking any phase complete:
- [x] `npm run build` passes with zero TypeScript errors
- [x] All modified E2E test flows still pass
- [x] No `any` types introduced
- [x] Tested at 1280px and 1920px viewport widths
- [x] All interactive elements have visible focus states

---

*Last updated: 2026-02-22 | Status: Complete (Phases 1–7)*
