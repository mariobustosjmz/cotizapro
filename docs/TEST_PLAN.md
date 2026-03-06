# CotizaPro — Full Module Test Plan
Generated: 2026-03-03 | Tester: Playwright Live Session

Legend: ✅ PASS | ❌ FAIL | ⚠️ ISSUE | ⬜ PENDING

---

## MODULE 0 — Auth / Login

**Route:** `/login`

### Forms
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 0.1 | Email field | Input text | ✅ | |
| 0.2 | Password field | Input text | ✅ | |
| 0.3 | Login button | Submit form | ✅ | Redirects to /dashboard |
| 0.4 | Invalid credentials | Show error | ✅ | Shows error=invalid-credentials param |
| 0.5 | Link "Términos de servicio" | Navigate | ❌ | 404 — /terminos does not exist |
| 0.6 | Link "Política de privacidad" | Navigate | ❌ | 404 — /privacidad does not exist |
| 0.7 | Link "Regístrate" | Navigate | ⬜ | Not tested |
| 0.8 | Link "Olvidaste tu contraseña" | Navigate | ⬜ | Not tested |

### Issues Found
- `/terminos` returns 404
- `/privacidad` returns 404

---

## MODULE 1 — Dashboard

**Route:** `/dashboard`

### Stats Cards
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 1.1 | Total Clientes card | Display count | ✅ | Shows 11 |
| 1.2 | Total Cotizaciones card | Display count | ✅ | Shows 23 |
| 1.3 | Ingresos Aceptados card | Display total | ✅ | Shows $73,000 |
| 1.4 | Cotizaciones Pendientes card | Display count | ✅ | |

### Tables / Lists
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 1.5 | Recent quotes list | Display | ✅ | |
| 1.6 | Quote row click | Navigate to detail | ⬜ | Not tested |
| 1.7 | Upcoming reminders section | Display | ⬜ | Not tested |

### Buttons / Actions
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 1.8 | "+ Cotización" quick button | Navigate to /quotes/new | ✅ | |
| 1.9 | "+ Cliente" quick button | Navigate to /clients/new | ✅ | |
| 1.10 | "+ Evento" quick button | Navigate to /calendar/new | ✅ | |
| 1.11 | Notificaciones bell | Open panel | ⬜ | Not tested |
| 1.12 | Cambiar tema | Toggle dark/light | ⬜ | Not tested |
| 1.13 | Expandir barra lateral | Expand sidebar | ⬜ | Not tested |
| 1.14 | Menú de usuario | Open user menu | ⬜ | Not tested |

### Issues Found
- Page title shows "Create Next App" — should be "CotizaPro"
- WebSocket/Realtime connection errors in console (Supabase realtime WS on local)

---

## MODULE 2 — Clientes

**Route:** `/dashboard/clients`

### List View
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 2.1 | Clients table | Display list | ✅ | Shows 12 clients |
| 2.2 | Search box | Filter by name/company | ✅ | Filters correctly |
| 2.3 | Column: Nombre / Empresa | Display | ✅ | |
| 2.4 | Column: Contacto (phone, email) | Display | ✅ | |
| 2.5 | Column: Dirección | Display | ✅ | |
| 2.6 | Column: Etiquetas | Display tags | ✅ | |
| 2.7 | "Ver" link | Navigate to detail | ✅ | |
| 2.8 | Row click | Navigate to detail | ✅ | |
| 2.9 | "+ Nuevo" button | Navigate to /clients/new | ✅ | |

### Create Form (`/dashboard/clients/new`)
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 2.10 | Nombre Completo* field | Input | ✅ | |
| 2.11 | Empresa field | Input | ✅ | |
| 2.12 | Email field | Input | ✅ | |
| 2.13 | Teléfono* field | Input | ✅ | |
| 2.14 | WhatsApp field | Input | ✅ | |
| 2.15 | Calle field | Input | ✅ | |
| 2.16 | Ciudad field | Input | ✅ | |
| 2.17 | Estado field | Input | ✅ | |
| 2.18 | Código Postal field | Input | ✅ | |
| 2.19 | Etiquetas field | Comma-separated tags | ✅ | |
| 2.20 | Notas textarea | Input | ✅ | |
| 2.21 | Guardar button | POST /api/clients | ✅ | Returns 201, redirects to list |
| 2.22 | Cancel / Back button | Navigate back | ⬜ | Not tested |
| 2.23 | Custom fields section | Display/Input | ⬜ | Not tested |
| 2.24 | Required field validation | Show error on empty | ⬜ | Not tested |

### Detail View (`/dashboard/clients/[id]`)
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 2.25 | Contact info display | Show all fields | ✅ | |
| 2.26 | Address display | Show | ✅ | |
| 2.27 | Tags display | Show chips | ✅ | |
| 2.28 | Notes display | Show text | ✅ | |
| 2.29 | Created date | Show | ✅ | |
| 2.30 | "Editar" button | Open inline edit form | ✅ | |
| 2.31 | Edit: modify field + Guardar | PATCH /api/clients/[id] | ✅ | Saves and redirects to list |
| 2.32 | Edit: Cancelar button | Close edit form | ⬜ | Not tested |
| 2.33 | "Eliminar" button | Show confirm dialog | ✅ | |
| 2.34 | Confirm delete | DELETE /api/clients/[id] | ✅ | Redirects to list |
| 2.35 | Cancel delete | Dismiss dialog | ⬜ | Not tested |
| 2.36 | Quotes for this client | Display list | ⬜ | Not tested |
| 2.37 | Back button (←) | Navigate to /clients | ✅ | |

### Issues Found
- None — all tested operations work correctly

---

## MODULE 3 — Cotizaciones

**Route:** `/dashboard/quotes`

### List View
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 3.1 | Quotes table | Display list | ✅ | 23 quotes shown |
| 3.2 | Status badges | Display correct colors | ✅ | |
| 3.3 | Stats row (borradores, enviadas, aceptadas, rechazadas) | Display counts | ✅ | |
| 3.4 | Search by number | Filter | ⬜ | Not tested |
| 3.5 | Filter: Todas | Show all | ✅ | |
| 3.6 | Filter: Borradores | Filter by draft | ⬜ | Not tested |
| 3.7 | Filter: Enviadas | Filter | ⬜ | Not tested |
| 3.8 | Filter: Vistas | Filter | ⬜ | Not tested |
| 3.9 | Filter: Aceptadas | Filter | ⬜ | Not tested |
| 3.10 | Filter: Rechazadas | Filter | ⬜ | Not tested |
| 3.11 | Filter: Expiradas | Filter | ⬜ | Not tested |
| 3.12 | Filter: En Instalación | Filter | ⬜ | Not tested |
| 3.13 | Filter: Completadas | Filter | ⬜ | Not tested |
| 3.14 | Filter: Cobradas | Filter | ⬜ | Not tested |
| 3.15 | "Ver" link | Navigate to detail | ⬜ | Not tested |
| 3.16 | "Lista" view toggle | Show table | ✅ | |
| 3.17 | "Kanban" view toggle | Show kanban board | ⬜ | Not tested |
| 3.18 | "+ Nueva" button | Navigate to /quotes/new | ⬜ | Not tested |

### Create Form (`/dashboard/quotes/new`)
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 3.19 | Cliente selector | Search/select client | ⬜ | |
| 3.20 | Título field | Input | ⬜ | |
| 3.21 | Número de cotización | Auto-generated or input | ⬜ | |
| 3.22 | Válida hasta | Date picker | ⬜ | |
| 3.23 | Add item row | Select service, qty, price | ⬜ | |
| 3.24 | Delete item row | Remove line | ⬜ | |
| 3.25 | Subtotal calculation | Auto-calculate | ⬜ | |
| 3.26 | IVA / Tax calculation | Auto-calculate | ⬜ | |
| 3.27 | Total display | Auto-calculate | ⬜ | |
| 3.28 | Términos y condiciones | Textarea | ⬜ | |
| 3.29 | Notas internas | Textarea | ⬜ | |
| 3.30 | Promotional label | Input | ⬜ | |
| 3.31 | Guardar como borrador | POST → draft status | ⬜ | |
| 3.32 | Guardar y enviar | POST → sent status | ⬜ | |
| 3.33 | Cancel / Back | Navigate back | ⬜ | |
| 3.34 | Required validation | Show errors | ⬜ | |

### Detail View (`/dashboard/quotes/[id]`)
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 3.35 | Quote header info | Display | ⬜ | |
| 3.36 | Line items table | Display | ⬜ | |
| 3.37 | Totals section | Display | ⬜ | |
| 3.38 | Status badge | Display | ⬜ | |
| 3.39 | "Editar" button | Open edit | ⬜ | |
| 3.40 | Status change actions | Change status buttons | ⬜ | |
| 3.41 | QuickActions FAB | Floating action button | ⬜ | |
| 3.42 | Payments section | Display payments | ⬜ | |
| 3.43 | Add payment | Open modal, POST | ⬜ | |
| 3.44 | Delete payment | DELETE (owner/admin only) | ⬜ | |
| 3.45 | Payment progress bar | Display | ⬜ | |
| 3.46 | Sticky send bar (mobile) | Display on scroll | ⬜ | |
| 3.47 | "Eliminar" quote | DELETE with confirm | ⬜ | |
| 3.48 | Print / PDF export | Generate PDF | ⬜ | |
| 3.49 | Send by email | Email action | ⬜ | |

### Kanban View (`/dashboard/quotes?view=kanban`)
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 3.50 | Kanban columns by status | Display | ⬜ | |
| 3.51 | Drag card to new column | Change status | ⬜ | |
| 3.52 | Card click | Navigate to detail | ⬜ | |

---

## MODULE 4 — Recordatorios

**Route:** `/dashboard/reminders`

### List View
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 4.1 | Reminders list | Display | ⬜ | Not yet tested |
| 4.2 | Filter by status | Active/Done | ⬜ | |
| 4.3 | Filter by date | Date range | ⬜ | |
| 4.4 | "+ Nuevo" button | Open create | ⬜ | |

### Create/Edit Form
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 4.5 | Título field | Input | ⬜ | |
| 4.6 | Fecha/Hora | DateTime picker | ⬜ | |
| 4.7 | Related quote selector | Link to quote | ⬜ | |
| 4.8 | Notas field | Textarea | ⬜ | |
| 4.9 | Guardar button | POST /api/reminders | ⬜ | |
| 4.10 | Mark as done | PATCH status | ⬜ | |
| 4.11 | Delete reminder | DELETE | ⬜ | |
| 4.12 | Edit reminder | PATCH | ⬜ | |

---

## MODULE 5 — Agenda / Calendar

**Route:** `/dashboard/calendar`

### Week View
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 5.1 | Week grid display | Show 7-day grid | ⬜ | Not yet tested |
| 5.2 | Navigate previous week | Arrow left | ⬜ | |
| 5.3 | Navigate next week | Arrow right | ⬜ | |
| 5.4 | Today button | Jump to today | ⬜ | |
| 5.5 | Event cards on grid | Display events | ⬜ | |
| 5.6 | Event click | Show detail | ⬜ | |

### Create Form (`/dashboard/calendar/new`)
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 5.7 | Título field | Input | ⬜ | |
| 5.8 | Fecha inicio | DateTime picker | ⬜ | |
| 5.9 | Fecha fin | DateTime picker | ⬜ | |
| 5.10 | Tipo de evento | Select type | ⬜ | |
| 5.11 | Related client | Link to client | ⬜ | |
| 5.12 | Related quote | Link to quote | ⬜ | |
| 5.13 | Notas field | Textarea | ⬜ | |
| 5.14 | Guardar button | POST /api/work-events | ⬜ | |
| 5.15 | Edit event | PATCH | ⬜ | |
| 5.16 | Delete event | DELETE | ⬜ | |

---

## MODULE 6 — Servicios

**Route:** `/dashboard/services`

### List View
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 6.1 | Service catalog table | Display | ⬜ | Not yet tested |
| 6.2 | Columns: name, description, unit_price, unit_type | Display | ⬜ | |
| 6.3 | Search / filter | Filter by name | ⬜ | |
| 6.4 | "+ Nuevo" button | Open create | ⬜ | |

### Create/Edit Form
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 6.5 | Nombre* field | Input | ⬜ | |
| 6.6 | Descripción field | Textarea | ⬜ | |
| 6.7 | Precio (unit_price)* | Number input | ⬜ | |
| 6.8 | Tipo (unit_type)* | Select: fixed/per_hour/per_sqm/per_unit | ⬜ | |
| 6.9 | Activo toggle | Enable/disable | ⬜ | |
| 6.10 | Guardar button | POST /api/services | ⬜ | |
| 6.11 | Edit service | PATCH | ⬜ | |
| 6.12 | Delete service | DELETE | ⬜ | |
| 6.13 | Required validation | Show errors | ⬜ | |

---

## MODULE 7 — Templates

**Route:** `/dashboard/templates`

### List View
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 7.1 | Templates list | Display | ⬜ | Not yet tested |
| 7.2 | Template cards/rows | Show name, description | ⬜ | |
| 7.3 | "+ Nuevo" button | Open create modal | ⬜ | |

### Create/Edit Modal
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 7.4 | Nombre field | Input | ⬜ | |
| 7.5 | Descripción field | Textarea | ⬜ | |
| 7.6 | Términos y condiciones | Textarea | ⬜ | |
| 7.7 | Promotional label field | Input | ⬜ | |
| 7.8 | Promotional valid until | Date picker | ⬜ | |
| 7.9 | Line items | Add/remove items | ⬜ | |
| 7.10 | Guardar button | POST /api/templates | ⬜ | |
| 7.11 | Edit template | PATCH /api/templates/[id] | ⬜ | |
| 7.12 | Delete template | DELETE | ⬜ | |
| 7.13 | Use template in new quote | Apply to quote form | ⬜ | |

---

## MODULE 8 — Analytics

**Route:** `/dashboard/analytics`

### Income Charts
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 8.1 | Income chart | Display | ⬜ | Not yet tested |
| 8.2 | Period filter (month/quarter/year) | Filter data | ⬜ | |
| 8.3 | Status breakdown | By status | ⬜ | |
| 8.4 | Total ingresos | Display KPI | ⬜ | |
| 8.5 | Ingresos aceptados | Display KPI | ⬜ | |
| 8.6 | Export data button | CSV/PDF | ⬜ | |

---

## MODULE 9 — Equipo

**Route:** `/dashboard/team`

### Team List
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 9.1 | Team members list | Display | ⬜ | Not yet tested |
| 9.2 | Member roles display | owner/admin/member/viewer | ⬜ | |
| 9.3 | Invite button | Open invite form | ⬜ | |
| 9.4 | Invite form: Email field | Input email | ⬜ | |
| 9.5 | Invite form: Role select | Select role | ⬜ | |
| 9.6 | Send invite button | POST invitation | ⬜ | |
| 9.7 | Pending invitations list | Display | ⬜ | |
| 9.8 | Resend invite | Resend email | ⬜ | |
| 9.9 | Revoke invite | Delete invitation | ⬜ | |
| 9.10 | Remove member | DELETE | ⬜ | |
| 9.11 | Change role | PATCH role | ⬜ | |

---

## MODULE 10 — Configuración

**Route:** `/dashboard/settings`

### Settings Form
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 10.1 | Organization name field | Input | ⬜ | Not yet tested |
| 10.2 | Logo upload | File input | ⬜ | |
| 10.3 | Default tax (IVA) | Number input | ⬜ | |
| 10.4 | Default currency | Select | ⬜ | |
| 10.5 | Default terms | Textarea | ⬜ | |
| 10.6 | Default notes | Textarea | ⬜ | |
| 10.7 | Quote number format | Input pattern | ⬜ | |
| 10.8 | Guardar button | PATCH /api/settings | ⬜ | |
| 10.9 | Profile section: full name | Input | ⬜ | |
| 10.10 | Profile: password change | Input current + new pwd | ⬜ | |
| 10.11 | Profile: Guardar | PATCH /api/profile | ⬜ | |

---

## MODULE 11 — Campos Extra

**Route:** `/dashboard/settings/custom-fields`

### Custom Fields CRUD
| # | Element | Action | Status | Notes |
|---|---------|--------|--------|-------|
| 11.1 | Custom fields list | Display by entity type | ⬜ | Not yet tested |
| 11.2 | Entity type tabs (client, quote, etc.) | Switch tabs | ⬜ | |
| 11.3 | "+ Nuevo campo" button | Open create | ⬜ | |
| 11.4 | Field name input | Input | ⬜ | |
| 11.5 | Field type select (text, number, date, select) | Select | ⬜ | |
| 11.6 | Required toggle | Enable/disable | ⬜ | |
| 11.7 | Active toggle | Enable/disable | ⬜ | |
| 11.8 | Guardar button | POST /api/custom-fields | ⬜ | |
| 11.9 | Edit field | PATCH | ⬜ | |
| 11.10 | Delete field | DELETE | ⬜ | |
| 11.11 | Custom fields appear in client form | Verify integration | ⬜ | |
| 11.12 | Custom fields appear in quote form | Verify integration | ⬜ | |

---

## GLOBAL ISSUES (found across all modules)

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| G1 | Page title "Create Next App" on all pages | Medium | ⬜ PENDING FIX |
| G2 | `/terminos` returns 404 | Low | ⬜ PENDING FIX |
| G3 | `/privacidad` returns 404 | Low | ⬜ PENDING FIX |
| G4 | WebSocket/Realtime errors in console (local only) | Low | ⬜ KNOWN (local Supabase) |

---

## PROGRESS SUMMARY

| Module | Total Items | Tested | Pass | Fail | Issues |
|--------|-------------|--------|------|------|--------|
| Auth | 8 | 6 | 4 | 2 | /terminos, /privacidad 404 |
| Dashboard | 14 | 5 | 5 | 0 | Page title wrong |
| Clientes | 37 | 26 | 24 | 0 | — |
| Cotizaciones | 52 | 5 | 5 | 0 | — |
| Recordatorios | 12 | 0 | — | — | Not started |
| Agenda | 16 | 0 | — | — | Not started |
| Servicios | 13 | 0 | — | — | Not started |
| Templates | 13 | 0 | — | — | Not started |
| Analytics | 6 | 0 | — | — | Not started |
| Equipo | 11 | 0 | — | — | Not started |
| Configuración | 11 | 0 | — | — | Not started |
| Campos Extra | 12 | 0 | — | — | Not started |
| **TOTAL** | **205** | **42** | **38** | **2** | **4 issues** |
