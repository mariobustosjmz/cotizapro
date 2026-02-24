# Blue → Orange Color Migration Progress

**Objective:** Replace ALL `blue-*` Tailwind CSS accent classes with `orange-*` equivalents.
Orange (`#F97316`) is the ONLY accent color in the CotizaPro dashboard.

**Preserved semantic colors (do NOT change):**
- `red-*` → errors, urgent, rejected
- `green-*` → success, accepted, active
- `yellow-*` → pending, draft
- `purple-*` → viewed, snoozed
- `gray-*` → neutral/secondary

**Replacement mapping:**
- `text-blue-600` → `text-orange-600`
- `text-blue-700` → `text-orange-700`
- `bg-blue-100 text-blue-700` → `bg-orange-100 text-orange-700`
- `bg-blue-50` → `bg-orange-50`
- `border-blue-200` → `border-orange-200`
- `focus:ring-blue-500` → `focus:ring-orange-500`

---

## COMPLETED ✅

| File | Status |
|------|--------|
| `components/dashboard/sidebar.tsx` | ✅ Done |
| `components/dashboard/header.tsx` | ✅ Done |
| `app/(dashboard)/layout.tsx` | ✅ Done |
| `app/(dashboard)/dashboard/page.tsx` | ✅ Done |
| `app/(dashboard)/dashboard/clients/page.tsx` | ✅ Done |
| `app/(dashboard)/dashboard/clients/new/page.tsx` | ✅ Done |
| `app/(dashboard)/dashboard/quotes/page.tsx` | ✅ Done |
| `app/(dashboard)/dashboard/reminders/page.tsx` | ✅ Done |
| `app/(dashboard)/dashboard/reminders/new/page.tsx` | ✅ Done |
| `app/(dashboard)/dashboard/services/page.tsx` | ✅ Done |
| `app/(dashboard)/dashboard/services/new/page.tsx` | ✅ Done |

---

## IN PROGRESS / READY TO EDIT ⚡

Files re-read in current session — edits pending:

### `app/(dashboard)/dashboard/quotes/[id]/page.tsx`
- [ ] L154: `sent: 'bg-blue-100 text-blue-700'` → `'bg-orange-100 text-orange-700'`
- [ ] L306: `text-lg font-bold text-blue-600` → `text-orange-600`

### `app/(dashboard)/dashboard/clients/[id]/page.tsx`
- [ ] L338: `px-2 py-1 bg-blue-100 text-blue-700` → `bg-orange-100 text-orange-700`

### `app/(dashboard)/dashboard/reminders/[id]/page.tsx`
- [ ] L180: `normal: 'bg-blue-100 text-blue-700'` → `'bg-orange-100 text-orange-700'`
- [ ] L300: `focus:ring-blue-500` (reminder_type select) → `focus:ring-orange-500`
- [ ] L317: `focus:ring-blue-500` (priority select) → `focus:ring-orange-500`
- [ ] L345: `focus:ring-blue-500` (service_category select) → `focus:ring-orange-500`
- [ ] L448: `bg-blue-50 border border-blue-200` → `bg-orange-50 border-orange-200`
- [ ] L449: `text-blue-700` → `text-orange-700`
- [ ] L450: `text-blue-600` → `text-orange-600`

### `app/(dashboard)/dashboard/services/[id]/page.tsx`
- [ ] L225: `focus:ring-blue-500` (category select) → `focus:ring-orange-500`
- [ ] L243: `focus:ring-blue-500` (unit_type select) → `focus:ring-orange-500`
- [ ] L274: `focus:ring-blue-500` (is_active select) → `focus:ring-orange-500`

### `app/(dashboard)/dashboard/quotes/new/page.tsx`
- [ ] L211: `focus:ring-blue-500` (client_id select) → `focus:ring-orange-500`
- [ ] L222: `text-blue-600` (link) → `text-orange-600`
- [ ] L264: `focus:ring-blue-500` (service select) → `focus:ring-orange-500`
- [ ] L342: `text-lg font-bold text-blue-600` → `text-orange-600`

---

## PENDING — Not yet scanned ⏳

| File | Status |
|------|--------|
| `app/(dashboard)/dashboard/analytics/page.tsx` | ⏳ Unread |
| `app/(dashboard)/dashboard/team/page.tsx` | ⏳ Unread |
| `app/(dashboard)/dashboard/settings/page.tsx` | ⏳ Unread |
| `app/(dashboard)/dashboard/billing/page.tsx` | ⏳ Unread |
| `app/(dashboard)/dashboard/billing/BillingClient.tsx` | ⏳ Unread |
| `app/(dashboard)/dashboard/settings/custom-fields/page.tsx` | ⏳ Unread |
| `app/(dashboard)/dashboard/settings/custom-fields/new/page.tsx` | ⏳ Unread |
| `app/(dashboard)/dashboard/settings/custom-fields/[id]/page.tsx` | ⏳ Unread |

---

## FINAL STEP

- [ ] Run `npm run build` — must complete with 0 TypeScript/build errors

---

*Last updated: 2026-02-20*
