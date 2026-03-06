# CotizaPro — Testing Checklist
> Complete inventory of all modules, pages, forms, tables, and interactive elements
> Generated: 2026-03-03 | Status legend: ✅ Passed · ❌ Failed · ⚠️ Bug Found · 🔲 Not Tested

---

## INDEX

1. [Landing Page / Marketing](#1-landing-page--marketing)
2. [Authentication Module](#2-authentication-module)
3. [Dashboard Home](#3-dashboard-home)
4. [Clients Module](#4-clients-module)
5. [Quotes Module](#5-quotes-module)
6. [Services / Catalog Module](#6-services--catalog-module)
7. [Reminders Module](#7-reminders-module)
8. [Calendar Module](#8-calendar-module)
9. [Templates Module](#9-templates-module)
10. [Analytics Module](#10-analytics-module)
11. [Team Module](#11-team-module)
12. [Settings Module](#12-settings-module)
13. [Billing Module](#13-billing-module)
14. [Notifications](#14-notifications)
15. [Export Features](#15-export-features)
16. [API Endpoints Reference](#16-api-endpoints-reference)

---

## 1. Landing Page / Marketing

**Route:** `/`
**File:** `app/(marketing)/page.tsx`

### Page Elements
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 1.1 | Page title | Meta | Shows "CotizaPro" | ⚠️ Bug | Shows "Create Next App" |
| 1.2 | Hero section | Display | Marketing content visible | 🔲 | |
| 1.3 | CTA "Iniciar Sesión" | Button/Link | Navigates to `/login` | 🔲 | |
| 1.4 | CTA "Registrarse" | Button/Link | Navigates to `/signup` | 🔲 | |
| 1.5 | Features section | Display | Feature cards visible | 🔲 | |
| 1.6 | Pricing section | Display | Pricing plans visible | 🔲 | |
| 1.7 | Footer links | Links | All links functional | 🔲 | |
| 1.8 | `/terminos` route | Page | Terms page loads | ❌ Bug | 404 not found |
| 1.9 | `/privacidad` route | Page | Privacy page loads | ❌ Bug | 404 not found |

---

## 2. Authentication Module

**Routes:** `/login`, `/signup`, `/forgot-password`, `/onboarding`
**Files:** `app/(auth)/*/page.tsx`

### 2.1 Login Page `/login`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 2.1.1 | Email field | Input | Accepts valid email | ✅ | |
| 2.1.2 | Password field | Input | Masked input | ✅ | |
| 2.1.3 | "Iniciar Sesión" button | Submit | Logs in, redirects to `/dashboard` | ✅ | |
| 2.1.4 | Wrong credentials | Error | Shows error message | ✅ | |
| 2.1.5 | "¿Olvidaste tu contraseña?" link | Link | Navigates to `/forgot-password` | 🔲 | |
| 2.1.6 | "Crear cuenta" link | Link | Navigates to `/signup` | 🔲 | |
| 2.1.7 | Empty form submit | Validation | Shows required field errors | 🔲 | |

### 2.2 Signup Page `/signup`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 2.2.1 | Full name field | Input | Required | 🔲 | |
| 2.2.2 | Email field | Input | Valid email format | 🔲 | |
| 2.2.3 | Password field | Input | Min 8 chars | 🔲 | |
| 2.2.4 | "Crear cuenta" button | Submit | Creates account | 🔲 | |
| 2.2.5 | "Iniciar Sesión" link | Link | Navigates to `/login` | 🔲 | |
| 2.2.6 | Duplicate email | Error | Shows email taken error | 🔲 | |

### 2.3 Forgot Password `/forgot-password`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 2.3.1 | Email field | Input | Accepts email | 🔲 | |
| 2.3.2 | "Enviar" button | Submit | Sends reset email | 🔲 | |
| 2.3.3 | Success message | Display | Confirm email sent | 🔲 | |

### 2.4 Onboarding `/onboarding`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 2.4.1 | Organization name field | Input | Required | 🔲 | |
| 2.4.2 | Organization slug field | Input | Auto-generated from name | 🔲 | |
| 2.4.3 | "Continuar" button | Submit | Creates org, redirects to dashboard | 🔲 | |

---

## 3. Dashboard Home

**Route:** `/dashboard`
**File:** `app/(dashboard)/dashboard/page.tsx`
**Components:** `dashboard-stats.tsx`, `fab.tsx`, `stats-cards.tsx`, `realtime-refresh.tsx`

### Stats & KPI Cards
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 3.1 | Clientes card | KPI | Shows total client count | ✅ | |
| 3.2 | Cotizaciones card | KPI | Shows total quote count | ✅ | |
| 3.3 | Ingresos card | KPI | Shows total income | ✅ | |
| 3.4 | Recordatorios card | KPI | Shows pending reminder count | ✅ | |
| 3.5 | Responsive grid 2-col mobile | Layout | 2×2 on mobile, 4-col on desktop | ✅ | |

### Recent Quotes Table
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 3.6 | Quote number column | Data | Clickable link to quote detail | 🔲 | |
| 3.7 | Client name column | Data | Shows client name | ✅ | |
| 3.8 | Total column | Data | Formatted currency | ✅ | |
| 3.9 | Status badge | Badge | Color-coded (gray/orange/green/red) | ✅ | |
| 3.10 | Days column | Data | Days since update | 🔲 | |

### Quick Actions (FAB)
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 3.11 | FAB trigger button | Button | Opens action menu | ✅ | |
| 3.12 | Nueva Cotización | Link | → `/dashboard/quotes/new` | ✅ | |
| 3.13 | Nuevo Cliente | Link | → `/dashboard/clients/new` | ✅ | |
| 3.14 | Nuevo Recordatorio | Link | → `/dashboard/reminders/new` | ✅ | |
| 3.15 | Ver Analytics | Link | → `/dashboard/analytics` | ✅ | |

### Reminders Panel
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 3.16 | Upcoming reminders list | List | Shows next N reminders | 🔲 | |
| 3.17 | Overdue alert banner | Alert | Red banner for past-due reminders | 🔲 | |
| 3.18 | Realtime refresh | Auto | Badge indicator, auto-refresh | 🔲 | |

### Sidebar Navigation
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 3.19 | Dashboard link | NavLink | Active on `/dashboard` | ✅ | |
| 3.20 | Clientes link | NavLink | → `/dashboard/clients` | ✅ | |
| 3.21 | Cotizaciones link | NavLink | → `/dashboard/quotes` | ✅ | |
| 3.22 | Servicios link | NavLink | → `/dashboard/services` | ✅ | |
| 3.23 | Recordatorios link | NavLink | → `/dashboard/reminders` | ✅ | |
| 3.24 | Calendario link | NavLink | → `/dashboard/calendar` | ✅ | |
| 3.25 | Plantillas link | NavLink | → `/dashboard/templates` | ✅ | |
| 3.26 | Analíticas link | NavLink | → `/dashboard/analytics` | ✅ | |
| 3.27 | Equipo link | NavLink | → `/dashboard/team` | ✅ | |
| 3.28 | Configuración link | NavLink | → `/dashboard/settings` | ✅ | |
| 3.29 | Facturación link | NavLink | → `/dashboard/billing` | ✅ | |
| 3.30 | Notification bell | Icon | Opens notification panel | 🔲 | |
| 3.31 | User menu / logout | Menu | Shows user, logout option | ✅ | |
| 3.32 | Cerrar sesión | Button | Logs out, redirects to `/login` | ✅ | |

---

## 4. Clients Module

**Routes:** `/dashboard/clients`, `/dashboard/clients/new`, `/dashboard/clients/[id]`
**Files:** `app/(dashboard)/dashboard/clients/`
**Components:** `clients-list-content.tsx`

### 4.1 Client List `/dashboard/clients`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 4.1.1 | Search input | Filter | Filters clients by name/email | ✅ | |
| 4.1.2 | "Nuevo Cliente" button | Button | → `/dashboard/clients/new` | ✅ | |
| 4.1.3 | Client table | Table | Lists all clients | ✅ | |
| 4.1.4 | Name column | Data | Clickable → client detail | ✅ | |
| 4.1.5 | Email column | Data | Shows email | ✅ | |
| 4.1.6 | Phone column | Data | Shows phone | ✅ | |
| 4.1.7 | Company column | Data | Shows company name | ✅ | |
| 4.1.8 | Quotes count column | Data | # of associated quotes | 🔲 | |
| 4.1.9 | "Ver" / detail button | Button | → `/dashboard/clients/[id]` | ✅ | |
| 4.1.10 | Export clients button | Button | Downloads CSV | 🔲 | |
| 4.1.11 | Empty state | Display | "No hay clientes" message | 🔲 | |
| 4.1.12 | Pagination | Nav | Navigate pages of results | 🔲 | |

### 4.2 New Client `/dashboard/clients/new`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 4.2.1 | Name field | Input | Required | ✅ | |
| 4.2.2 | Email field | Input | Valid email, optional | ✅ | |
| 4.2.3 | Phone field | Input | Optional | ✅ | |
| 4.2.4 | Company name field | Input | Optional | ✅ | |
| 4.2.5 | Address field | Textarea | Optional | 🔲 | |
| 4.2.6 | Notes field | Textarea | Optional | 🔲 | |
| 4.2.7 | Custom fields section | Dynamic | Shows org custom fields | 🔲 | |
| 4.2.8 | "Guardar" button | Submit | Creates client, redirects to list | ✅ | |
| 4.2.9 | "Cancelar" button | Button | Returns to client list | ✅ | |
| 4.2.10 | Required field validation | Validation | Shows error if name empty | 🔲 | |

### 4.3 Client Detail `/dashboard/clients/[id]`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 4.3.1 | Client info display | Display | Name, email, phone, company | ✅ | |
| 4.3.2 | "Editar" button | Button | Opens edit form / in-place edit | 🔲 | |
| 4.3.3 | "Eliminar" button | Button | Confirm dialog → deletes client | 🔲 | |
| 4.3.4 | Edit inline fields | Form | Editable name/email/phone/company | 🔲 | |
| 4.3.5 | "Guardar cambios" button | Submit | Saves edits via PATCH API | 🔲 | |
| 4.3.6 | Associated quotes list | Table | All quotes for this client | 🔲 | |
| 4.3.7 | "Nueva Cotización" shortcut | Button | → `/dashboard/quotes/new?clientId=…` | 🔲 | |
| 4.3.8 | Custom fields display/edit | Dynamic | Org-specific fields | 🔲 | |

---

## 5. Quotes Module

**Routes:** `/dashboard/quotes`, `/dashboard/quotes/new`, `/dashboard/quotes/[id]`, `/dashboard/quotes/[id]/edit`
**Files:** `app/(dashboard)/dashboard/quotes/`
**Components:** `quotes-list-content.tsx`, `quotes-kanban.tsx`, `quotes-kanban-wrapper.tsx`, `payment-section.tsx`, `quote-share-dialog.tsx`

### 5.1 Quote List `/dashboard/quotes`

#### View Controls
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 5.1.1 | Search input | Filter | Filters by quote # / client | ✅ | |
| 5.1.2 | Status filter dropdown | Filter | Filters by status | 🔲 | |
| 5.1.3 | List view toggle | Toggle | Shows table view | ✅ | |
| 5.1.4 | Kanban view toggle | Toggle | Shows kanban board | ✅ | |
| 5.1.5 | "Nueva Cotización" button | Button | → `/dashboard/quotes/new` | ✅ | |
| 5.1.6 | Export quotes button | Button | Downloads CSV | 🔲 | |

#### List Table
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 5.1.7 | Quote # column | Data | Clickable → quote detail | ✅ | |
| 5.1.8 | Client column | Data | Client name | ✅ | |
| 5.1.9 | Total column | Data | Formatted currency | ✅ | |
| 5.1.10 | Status column | Badge | Color-coded status badge | ✅ | |
| 5.1.11 | Date column | Data | Creation date | ✅ | |
| 5.1.12 | Valid until column | Data | Expiry date | 🔲 | |
| 5.1.13 | "Ver" button | Button | → quote detail | ✅ | |
| 5.1.14 | Pagination | Nav | Pages through results | 🔲 | |

#### Kanban Board
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 5.1.15 | Borrador column | Column | Shows draft quotes | ✅ | |
| 5.1.16 | Enviada column | Column | Shows sent quotes | ✅ | |
| 5.1.17 | Aceptada column | Column | Shows accepted quotes | ✅ | |
| 5.1.18 | En Instalación column | Column | Shows in-install quotes | ✅ | |
| 5.1.19 | Completada column | Column | Shows completed quotes | ✅ | |
| 5.1.20 | Cobrada column | Column | Shows paid quotes | ✅ | |
| 5.1.21 | Rechazada column | Column | Shows rejected quotes | ⚠️ Bug | Missing "Rechazadas" column |
| 5.1.22 | Drag & drop cards | Interaction | Move quote between columns | 🔲 | |
| 5.1.23 | Quote card click | Interaction | → quote detail | 🔲 | |

### 5.2 New Quote `/dashboard/quotes/new`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 5.2.1 | Client selector | Select/Search | Required, searchable client list | 🔲 | |
| 5.2.2 | Title field | Input | Quote title | 🔲 | |
| 5.2.3 | Valid until date | DatePicker | Expiry date required | 🔲 | |
| 5.2.4 | Notes / Description | Textarea | Optional | 🔲 | |
| 5.2.5 | Terms & Conditions | Textarea | Optional | 🔲 | |
| 5.2.6 | "Añadir Servicio" | Button | Adds new line item row | 🔲 | |
| 5.2.7 | Line item: Service selector | Select | Picks from service catalog | 🔲 | |
| 5.2.8 | Line item: Description | Input | Editable description | 🔲 | |
| 5.2.9 | Line item: Quantity | Number | Positive number | 🔲 | |
| 5.2.10 | Line item: Unit price | Number | Price per unit | 🔲 | |
| 5.2.11 | Line item: Discount | Number | % discount 0-100 | 🔲 | |
| 5.2.12 | Line item: Subtotal | Calculated | Auto-calculated | 🔲 | |
| 5.2.13 | "Eliminar fila" button | Button | Removes line item | 🔲 | |
| 5.2.14 | Subtotal display | Calculated | Sum of line items | 🔲 | |
| 5.2.15 | IVA/Tax display | Calculated | Tax amount | 🔲 | |
| 5.2.16 | Total display | Calculated | Grand total | 🔲 | |
| 5.2.17 | "Guardar Cotización" button | Submit | Creates quote, → detail page | 🔲 | |
| 5.2.18 | "Cancelar" button | Button | Returns to quotes list | 🔲 | |

### 5.3 Quote Detail `/dashboard/quotes/[id]`

#### Header Actions
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 5.3.1 | Quote number display | Display | Shows quote #, client, date | ✅ | |
| 5.3.2 | Status badge | Badge | Current status color-coded | ✅ | |
| 5.3.3 | "Editar" button | Button | → `/dashboard/quotes/[id]/edit` | 🔲 | |
| 5.3.4 | "Enviar" button | Button | Opens send dialog | ⚠️ Bug | PDF preview CSP error (dev only) |
| 5.3.5 | Status change buttons | Buttons | Aceptar / Rechazar / etc. | 🔲 | |
| 5.3.6 | "Aceptar" button | Button | Sets status to `aceptada` | 🔲 | |
| 5.3.7 | "Rechazar" button | Button | Sets status to `rechazada` | 🔲 | |
| 5.3.8 | "En Instalación" button | Button | Sets status to `en_instalacion` | 🔲 | |
| 5.3.9 | "Completar" button | Button | Sets status to `completado` | 🔲 | |
| 5.3.10 | "Cobrar" button | Button | Sets status to `cobrado` | 🔲 | |
| 5.3.11 | Sticky send bar (mobile) | Bar | Fixed bottom bar on mobile | 🔲 | |

#### Quote Content
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 5.3.12 | Client info section | Display | Client name, email, phone | ✅ | |
| 5.3.13 | Line items table | Table | Service, qty, price, subtotal | ✅ | |
| 5.3.14 | Totals section | Display | Subtotal, taxes, total | ✅ | |
| 5.3.15 | Notes section | Display | Quote notes if any | 🔲 | |
| 5.3.16 | Terms section | Display | T&C if any | 🔲 | |

#### Send Dialog
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 5.3.17 | PDF preview | iFrame | Shows PDF preview | ⚠️ Bug | Blocked by CSP (blob: URL) |
| 5.3.18 | Email send option | Option | Send via email | 🔲 | |
| 5.3.19 | WhatsApp send button | Button | Opens WhatsApp deep-link | 🔲 | |
| 5.3.20 | Copy link button | Button | Copies share URL | 🔲 | |
| 5.3.21 | Download PDF button | Button | Downloads PDF file | 🔲 | |
| 5.3.22 | "Enviar" submit button | Submit | Sends notification | ⚠️ Bug | "Envío con errores parciales" toast |

#### Payment Section (component: `payment-section.tsx`)
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 5.3.23 | Payment progress bar | Progress | % paid of total | ✅ | Fixed |
| 5.3.24 | Paid / Total amounts | Display | `$X / $Y` formatted | ✅ | Fixed |
| 5.3.25 | "Pagado completamente" banner | Alert | Green banner when 100% paid | 🔲 | |
| 5.3.26 | "Registrar Pago" button | Button | Opens payment modal | ✅ | Fixed |
| 5.3.27 | Payment modal: Monto field | Number | Required, positive | ✅ | Fixed (notes:null bug) |
| 5.3.28 | Payment modal: Tipo | Select | Anticipo/Parcial/Liquidación | ✅ | Fixed (RLS bug) |
| 5.3.29 | Payment modal: Método | Select | Efectivo/Transferencia/Cheque/Otro | ✅ | Fixed |
| 5.3.30 | Payment modal: Fecha | Date | Required, defaults today | ✅ | Fixed |
| 5.3.31 | Payment modal: Notas | Textarea | Optional | ✅ | Fixed |
| 5.3.32 | Payment modal: "Registrar" | Submit | Creates payment record | ✅ | $5,000 anticipo on COT-2026-005 |
| 5.3.33 | Payment modal: "Cancelar" | Button | Closes modal | 🔲 | |
| 5.3.34 | Payments table | Table | Lists all payments | 🔲 | |
| 5.3.35 | Payment: Descargar comprobante | Button | Downloads receipt PDF | 🔲 | Endpoint exists (401 unauth = correct) |
| 5.3.36 | Payment: Eliminar (admin only) | Button | Deletes payment (owner/admin) | 🔲 | |
| 5.3.37 | Over-payment guard | Validation | Rejects amount > remaining | ✅ | Works |

### 5.4 Edit Quote `/dashboard/quotes/[id]/edit`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 5.4.1 | Pre-filled form | Form | All existing values loaded | 🔲 | |
| 5.4.2 | All new-quote fields | Form | Same as new quote form | 🔲 | |
| 5.4.3 | "Guardar cambios" button | Submit | Updates quote | 🔲 | |
| 5.4.4 | "Cancelar" button | Button | Returns to quote detail | 🔲 | |

---

## 6. Services / Catalog Module

**Routes:** `/dashboard/services`, `/dashboard/services/new`, `/dashboard/services/[id]`
**Files:** `app/(dashboard)/dashboard/services/`

### 6.1 Service List `/dashboard/services`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 6.1.1 | Search input | Filter | Filters by name | 🔲 | |
| 6.1.2 | Category filter | Filter | Filters by category | 🔲 | |
| 6.1.3 | Unit type filter | Filter | Filters by unit type | 🔲 | |
| 6.1.4 | "Nuevo Servicio" button | Button | → `/dashboard/services/new` | 🔲 | |
| 6.1.5 | Services table | Table | Lists all services | 🔲 | |
| 6.1.6 | Name column | Data | Service name | 🔲 | |
| 6.1.7 | Description column | Data | Short description | 🔲 | |
| 6.1.8 | Price column | Data | Unit price formatted | 🔲 | |
| 6.1.9 | Unit type column | Data | fixed/per_hour/per_sqm/per_unit | 🔲 | |
| 6.1.10 | Category column | Data | Service category | 🔲 | |
| 6.1.11 | "Ver" button | Button | → service detail | 🔲 | |
| 6.1.12 | Pagination | Nav | Pages through results | 🔲 | |

### 6.2 New Service `/dashboard/services/new`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 6.2.1 | Name field | Input | Required | 🔲 | |
| 6.2.2 | Description field | Textarea | Optional | 🔲 | |
| 6.2.3 | Price field | Number | Required, > 0 | 🔲 | |
| 6.2.4 | Unit type selector | Select | fixed/per_hour/per_sqm/per_unit | 🔲 | |
| 6.2.5 | Category field | Input | Optional | 🔲 | |
| 6.2.6 | "Guardar" button | Submit | Creates service, → list | 🔲 | |
| 6.2.7 | "Cancelar" button | Button | Returns to services list | 🔲 | |
| 6.2.8 | Duplicate name check | Validation | Warns on duplicate | 🔲 | |

### 6.3 Service Detail `/dashboard/services/[id]`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 6.3.1 | Service info display | Display | Name, price, type, category | 🔲 | |
| 6.3.2 | "Editar" / inline edit | Form | All fields editable | 🔲 | |
| 6.3.3 | "Eliminar" button | Button | Confirm → deletes service | 🔲 | |
| 6.3.4 | "Guardar cambios" button | Submit | Saves edits | 🔲 | |

---

## 7. Reminders Module

**Routes:** `/dashboard/reminders`, `/dashboard/reminders/new`, `/dashboard/reminders/[id]`
**Files:** `app/(dashboard)/dashboard/reminders/`
**Components:** `reminder-row-actions.tsx`, `filters.tsx`

### 7.1 Reminder List `/dashboard/reminders`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 7.1.1 | Status filter | Filter | All/Pending/Completed/Overdue | 🔲 | |
| 7.1.2 | Date range filter | Filter | Filter by due date range | 🔲 | |
| 7.1.3 | "Nuevo Recordatorio" button | Button | → `/dashboard/reminders/new` | 🔲 | |
| 7.1.4 | Reminders table | Table | Lists all reminders | 🔲 | |
| 7.1.5 | Title column | Data | Reminder title | 🔲 | |
| 7.1.6 | Due date column | Data | Due date formatted | 🔲 | |
| 7.1.7 | Status badge | Badge | pending/completed/overdue | 🔲 | |
| 7.1.8 | Quote link column | Data | Linked quote (if any) | 🔲 | |
| 7.1.9 | "Completar" action | Button | Marks reminder complete | 🔲 | |
| 7.1.10 | "Posponer" action | Button | Opens snooze options | 🔲 | |
| 7.1.11 | "Ver" action | Button | → reminder detail | 🔲 | |
| 7.1.12 | "Eliminar" action | Button | Confirm → deletes reminder | 🔲 | |

### 7.2 New Reminder `/dashboard/reminders/new`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 7.2.1 | Title field | Input | Required | 🔲 | |
| 7.2.2 | Description field | Textarea | Optional | 🔲 | |
| 7.2.3 | Due date field | DatePicker | Required | 🔲 | |
| 7.2.4 | Due time field | TimePicker | Optional | 🔲 | |
| 7.2.5 | Quote link selector | Select | Optional, links to a quote | 🔲 | |
| 7.2.6 | "Guardar" button | Submit | Creates reminder | 🔲 | |
| 7.2.7 | "Cancelar" button | Button | Returns to list | 🔲 | |

### 7.3 Reminder Detail `/dashboard/reminders/[id]`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 7.3.1 | Reminder info display | Display | Title, date, description | 🔲 | |
| 7.3.2 | "Completar" button | Button | Marks as complete | 🔲 | |
| 7.3.3 | "Posponer" button | Button | Snooze reminder | 🔲 | |
| 7.3.4 | Snooze options | Select | 1h/4h/1d/3d/1w | 🔲 | |
| 7.3.5 | "Editar" / inline edit | Form | Edit title/date/description | 🔲 | |
| 7.3.6 | "Eliminar" button | Button | Confirm → deletes | 🔲 | |

---

## 8. Calendar Module

**Routes:** `/dashboard/calendar`, `/dashboard/calendar/new`
**Files:** `app/(dashboard)/dashboard/calendar/`
**Components:** `calendar-week-view.tsx`, `work-event-form.tsx`

### 8.1 Calendar View `/dashboard/calendar`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 8.1.1 | Week view grid | Display | 7-day grid with time slots | 🔲 | |
| 8.1.2 | Previous week button | Nav | Navigates to previous week | 🔲 | |
| 8.1.3 | Next week button | Nav | Navigates to next week | 🔲 | |
| 8.1.4 | "Hoy" button | Nav | Returns to current week | 🔲 | |
| 8.1.5 | Week date range display | Display | e.g. "3 – 9 Mar 2026" | 🔲 | |
| 8.1.6 | "Nuevo Evento" button | Button | → `/dashboard/calendar/new` | 🔲 | |
| 8.1.7 | Event cards | Display | Events in time blocks | 🔲 | |
| 8.1.8 | Event click | Interaction | Opens event detail/edit | 🔲 | |
| 8.1.9 | Event type color coding | Display | Different colors per type | 🔲 | |

### 8.2 New Event `/dashboard/calendar/new`
**Component:** `work-event-form.tsx`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 8.2.1 | Title field | Input | Required | 🔲 | |
| 8.2.2 | Event type selector | Select | visita/instalacion/mantenimiento/reunion/otro | 🔲 | |
| 8.2.3 | Start date/time | DateTime | Required | 🔲 | |
| 8.2.4 | End date/time | DateTime | Required, after start | 🔲 | |
| 8.2.5 | Quote link selector | Select | Optional | 🔲 | |
| 8.2.6 | Client link selector | Select | Optional | 🔲 | |
| 8.2.7 | Description field | Textarea | Optional | 🔲 | |
| 8.2.8 | Location field | Input | Optional | 🔲 | |
| 8.2.9 | "Guardar" button | Submit | Creates event, → calendar | 🔲 | |
| 8.2.10 | "Cancelar" button | Button | Returns to calendar | 🔲 | |

---

## 9. Templates Module

**Route:** `/dashboard/templates`
**File:** `app/(dashboard)/dashboard/templates/page.tsx`

### Templates List & Management
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 9.1 | Templates list | Table/Cards | Shows all quote templates | 🔲 | |
| 9.2 | "Nueva Plantilla" button | Button | Opens create modal | 🔲 | |
| 9.3 | Create modal: Name field | Input | Required | 🔲 | |
| 9.4 | Create modal: Description | Textarea | Optional | 🔲 | |
| 9.5 | Create modal: Terms | Textarea | Optional | 🔲 | |
| 9.6 | Create modal: Promo label | Input | Optional promotional text | 🔲 | |
| 9.7 | Create modal: Promo valid until | Date | Optional promo end date | 🔲 | |
| 9.8 | Create modal: "Guardar" | Submit | Creates template | 🔲 | |
| 9.9 | Create modal: "Cancelar" | Button | Closes modal | 🔲 | |
| 9.10 | "Editar" template button | Button | Opens edit modal with pre-fill | 🔲 | |
| 9.11 | Edit modal: all fields | Form | Pre-filled with existing data | 🔲 | |
| 9.12 | Edit modal: "Guardar cambios" | Submit | Updates template | 🔲 | |
| 9.13 | "Eliminar" template button | Button | Confirm → deletes template | 🔲 | |
| 9.14 | "Usar plantilla" button | Button | Creates new quote from template | 🔲 | |

---

## 10. Analytics Module

**Route:** `/dashboard/analytics`
**File:** `app/(dashboard)/dashboard/analytics/page.tsx`
**Components:** `analytics-charts.tsx`, `income-analytics.tsx`

### Dashboard Analytics
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 10.1 | Period selector | Select | Last 7d/30d/90d/1y | 🔲 | |
| 10.2 | Total income card | KPI | Sum for selected period | 🔲 | |
| 10.3 | Quotes sent card | KPI | Count for period | 🔲 | |
| 10.4 | Acceptance rate card | KPI | % accepted vs sent | 🔲 | |
| 10.5 | Revenue trend chart | Chart | Line/bar over time | 🔲 | |
| 10.6 | Status distribution chart | Chart | Pie/donut by status | 🔲 | |
| 10.7 | Income by status breakdown | Table | Rows per status with amounts | 🔲 | |
| 10.8 | Export report button | Button | Downloads analytics PDF/CSV | 🔲 | |

### Income Analytics (component: `income-analytics.tsx`)
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 10.9 | By period chart | Chart | Income over time | 🔲 | |
| 10.10 | By status breakdown | Table | Income per quote status | 🔲 | |

---

## 11. Team Module

**Routes:** `/dashboard/team`, `/dashboard/team/invite`
**Files:** `app/(dashboard)/dashboard/team/`

### 11.1 Team List `/dashboard/team`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 11.1.1 | Team members table | Table | Lists all members | 🔲 | |
| 11.1.2 | Name column | Data | Member name | 🔲 | |
| 11.1.3 | Email column | Data | Member email | 🔲 | |
| 11.1.4 | Role column | Badge | owner/admin/member/viewer | 🔲 | |
| 11.1.5 | "Invitar Miembro" button | Button | → `/dashboard/team/invite` | 🔲 | |
| 11.1.6 | Change role dropdown | Select | Admin only: change member role | 🔲 | |
| 11.1.7 | "Eliminar" member button | Button | Owner/admin only: removes member | 🔲 | |
| 11.1.8 | Pending invitations section | Table | Lists pending invitations | 🔲 | |
| 11.1.9 | Cancel invitation button | Button | Cancels pending invite | 🔲 | |

### 11.2 Invite Member `/dashboard/team/invite`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 11.2.1 | Email field | Input | Required, valid email | 🔲 | |
| 11.2.2 | Role selector | Select | admin/member/viewer | 🔲 | |
| 11.2.3 | "Enviar Invitación" button | Submit | Sends invite email | 🔲 | |
| 11.2.4 | "Cancelar" button | Button | Returns to team page | 🔲 | |
| 11.2.5 | Already-member validation | Validation | Error if email already member | 🔲 | |

### 11.3 Accept Invitation `/invite/[token]`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 11.3.1 | Invitation details display | Display | Shows org name, role, inviter | 🔲 | |
| 11.3.2 | "Aceptar Invitación" button | Button | Joins org, → onboarding/dashboard | 🔲 | |
| 11.3.3 | Expired token handling | Error | Shows "invitation expired" | 🔲 | |

---

## 12. Settings Module

**Routes:** `/dashboard/settings`, `/dashboard/settings/custom-fields`, `/dashboard/settings/custom-fields/new`, `/dashboard/settings/custom-fields/[id]`
**Files:** `app/(dashboard)/dashboard/settings/`
**Components:** `PasswordChangeForm.tsx`

### 12.1 General Settings `/dashboard/settings`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 12.1.1 | Profile: Full name field | Input | Editable | 🔲 | |
| 12.1.2 | Profile: Email display | Display | Read-only (auth email) | 🔲 | |
| 12.1.3 | Profile: "Guardar" button | Submit | Updates profile via PATCH | 🔲 | |
| 12.1.4 | Org: Name field | Input | Editable | 🔲 | |
| 12.1.5 | Org: Slug field | Input | Editable slug | 🔲 | |
| 12.1.6 | Org: "Guardar" button | Submit | Updates org settings | 🔲 | |
| 12.1.7 | Password: Current password | Input | Required for change | 🔲 | |
| 12.1.8 | Password: New password | Input | Min 8 chars | 🔲 | |
| 12.1.9 | Password: Confirm new | Input | Must match new | 🔲 | |
| 12.1.10 | Password: "Cambiar" button | Submit | Updates password | 🔲 | |

### 12.2 Custom Fields `/dashboard/settings/custom-fields`
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 12.2.1 | Custom fields list | Table | Lists org custom fields | 🔲 | |
| 12.2.2 | "Nuevo Campo" button | Button | → new custom field | 🔲 | |
| 12.2.3 | Field name column | Data | Field name | 🔲 | |
| 12.2.4 | Field type column | Data | text/number/date/boolean | 🔲 | |
| 12.2.5 | Applied to column | Data | client/quote | 🔲 | |
| 12.2.6 | "Editar" button | Button | → edit custom field | 🔲 | |
| 12.2.7 | "Eliminar" button | Button | Confirm → deletes field | 🔲 | |

### 12.3 New/Edit Custom Field
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 12.3.1 | Field name input | Input | Required | 🔲 | |
| 12.3.2 | Field type selector | Select | text/number/date/boolean | 🔲 | |
| 12.3.3 | Apply to selector | Select | client or quote | 🔲 | |
| 12.3.4 | Required toggle | Checkbox | Whether field is required | 🔲 | |
| 12.3.5 | "Guardar" button | Submit | Creates/updates field | 🔲 | |

---

## 13. Billing Module

**Route:** `/dashboard/billing`
**Files:** `app/(dashboard)/dashboard/billing/page.tsx`, `BillingClient.tsx`

### Billing Page
| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 13.1 | Current plan display | Display | Shows active plan (free/pro) | 🔲 | |
| 13.2 | Subscription status badge | Badge | trialing/active/canceled | 🔲 | |
| 13.3 | "Actualizar a Pro" button | Button | → Stripe checkout | 🔲 | |
| 13.4 | "Gestionar Suscripción" button | Button | → Stripe billing portal | 🔲 | |
| 13.5 | Usage limits display | Display | Clients used / max, quotes used / max | 🔲 | |
| 13.6 | Invoice history | Table | Past invoices | 🔲 | |
| 13.7 | Download invoice button | Button | Downloads invoice PDF | 🔲 | |

---

## 14. Notifications

**Component:** `notification-bell.tsx`
**API:** `GET/POST /api/notifications`, `PATCH /api/notifications/[id]`

| # | Element | Type | Expected Behavior | Status | Notes |
|---|---------|------|-------------------|--------|-------|
| 14.1 | Notification bell icon | Icon | Shows unread count badge | 🔲 | |
| 14.2 | Bell click | Interaction | Opens notification panel | 🔲 | |
| 14.3 | Notification list | List | Recent notifications | 🔲 | |
| 14.4 | Unread indicator | Badge | Blue dot on unread items | 🔲 | |
| 14.5 | Mark as read (single) | Button | Marks one notification read | 🔲 | |
| 14.6 | Mark all as read | Button | Marks all notifications read | 🔲 | |
| 14.7 | Notification click | Interaction | Navigates to related resource | 🔲 | |

---

## 15. Export Features

**API Routes:** `/api/export/`

| # | Feature | Route | Expected Behavior | Status | Notes |
|---|---------|-------|-------------------|--------|-------|
| 15.1 | Export single quote PDF | `GET /api/export/quote/[id]` | Downloads quote as PDF | 🔲 | |
| 15.2 | Export quotes list CSV | `GET /api/export/quotes` | Downloads all quotes as CSV | 🔲 | |
| 15.3 | Export clients CSV | `GET /api/export/clients` | Downloads all clients as CSV | 🔲 | |
| 15.4 | Export analytics report | `GET /api/export/analytics-report` | Downloads analytics PDF/CSV | 🔲 | |
| 15.5 | Payment receipt PDF | `GET /api/quotes/[id]/payments/receipt/[pid]` | Downloads payment receipt | 🔲 | |

---

## 16. API Endpoints Reference

### Authentication
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/logout` | Log out user |
| GET/PATCH | `/api/auth/organization` | Get/update org from JWT |

### Clients
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/clients` | List clients (paginated) |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/[id]` | Get single client |
| PATCH | `/api/clients/[id]` | Update client |
| DELETE | `/api/clients/[id]` | Delete client |

### Quotes
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/quotes` | List quotes |
| POST | `/api/quotes` | Create quote |
| GET | `/api/quotes/[id]` | Get single quote |
| PATCH | `/api/quotes/[id]` | Update quote / change status |
| DELETE | `/api/quotes/[id]` | Delete quote |
| POST | `/api/quotes/[id]/send` | Send quote (email/whatsapp) |
| GET | `/api/quotes/[id]/payments` | List payments |
| POST | `/api/quotes/[id]/payments` | Register payment |
| DELETE | `/api/quotes/[id]/payments/[pid]` | Delete payment |
| GET | `/api/quotes/[id]/payments/receipt/[pid]` | Download receipt |
| GET | `/api/quotes/[id]/notifications` | Quote notifications |

### Services
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/services` | List services |
| POST | `/api/services` | Create service |
| GET | `/api/services/[id]` | Get service |
| PATCH | `/api/services/[id]` | Update service |
| DELETE | `/api/services/[id]` | Delete service |

### Reminders
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/reminders` | List reminders |
| POST | `/api/reminders` | Create reminder |
| GET | `/api/reminders/[id]` | Get reminder |
| PATCH | `/api/reminders/[id]` | Update reminder |
| DELETE | `/api/reminders/[id]` | Delete reminder |
| POST | `/api/reminders/[id]/complete` | Mark complete |
| POST | `/api/reminders/[id]/snooze` | Snooze reminder |
| GET | `/api/reminders/due` | Get due reminders |

### Calendar
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/calendar/events` | List events |
| POST | `/api/calendar/events` | Create event |
| GET | `/api/calendar/events/[id]` | Get event |
| PATCH | `/api/calendar/events/[id]` | Update event |
| DELETE | `/api/calendar/events/[id]` | Delete event |

### Templates
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create template |
| GET | `/api/templates/[id]` | Get template |
| PATCH | `/api/templates/[id]` | Update template |
| DELETE | `/api/templates/[id]` | Delete template |

### Analytics
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/analytics/dashboard` | Dashboard KPIs |
| GET | `/api/analytics/income` | Income breakdown |
| GET | `/api/analytics/trends` | Quote trends |

### Team
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/team/members` | List members |
| PATCH | `/api/team/members/[id]` | Update member role |
| DELETE | `/api/team/members/[id]` | Remove member |
| GET | `/api/team/invitations` | List invitations |
| POST | `/api/team/invitations` | Create invitation |
| DELETE | `/api/team/invitations/[id]` | Cancel invitation |
| POST | `/api/team/invitations/accept` | Accept invitation |
| GET | `/api/team/me` | Current user + role |

### Settings
| Method | Route | Purpose |
|--------|-------|---------|
| PATCH | `/api/settings/profile` | Update user profile |
| PATCH | `/api/settings/password` | Change password |
| GET/PATCH | `/api/settings/organization` | Org settings |

### Custom Fields
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/custom-fields` | List custom fields |
| POST | `/api/custom-fields` | Create custom field |
| GET | `/api/custom-fields/[id]` | Get field |
| PATCH | `/api/custom-fields/[id]` | Update field |
| DELETE | `/api/custom-fields/[id]` | Delete field |

### Billing
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/billing/checkout` | Create Stripe checkout |
| POST | `/api/billing/portal` | Create Stripe portal session |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |

### Notifications
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/[id]` | Mark as read |

### Misc
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/cron/reminders-check` | Cron: check due reminders |

---

## Bug Tracker

| ID | Module | Severity | Description | Status |
|----|--------|----------|-------------|--------|
| G1 | Global | Medium | Page title shows "Create Next App" instead of "CotizaPro" | ❌ Open |
| G2 | Marketing | Low | `/terminos` returns 404 | ❌ Open |
| G3 | Marketing | Low | `/privacidad` returns 404 | ❌ Open |
| Q1 | Quotes Kanban | Medium | Missing "Rechazadas" column | ❌ Open |
| Q2 | Quote Detail | Low | PDF preview iframe blocked by CSP (blob: URLs) — dev only | ⚠️ Dev only |
| Q3 | Quote Send | Low | "Envío con errores parciales" toast — expected in dev without SMTP | ⚠️ Dev only |
| Q4a | Quote Payments | High | `notes: null` failed Zod `z.string().optional()` | ✅ Fixed |
| Q4b | Quote Payments | High | RLS used wrong JWT path — used `auth.jwt()->>'organization_id'` instead of `user_organization_id()` | ✅ Fixed |

---

## Testing Progress Summary

| Module | Total Items | Tested | Passed | Failed | Bugs |
|--------|------------|--------|--------|--------|------|
| Landing | 9 | 3 | 1 | 2 | 3 |
| Auth | 16 | 7 | 7 | 0 | 0 |
| Dashboard Home | 32 | 15 | 13 | 0 | 0 |
| Clients | 24 | 9 | 9 | 0 | 0 |
| Quotes | 47 | 22 | 18 | 4 | 4 |
| Services | 14 | 0 | 0 | 0 | 0 |
| Reminders | 16 | 0 | 0 | 0 | 0 |
| Calendar | 10 | 0 | 0 | 0 | 0 |
| Templates | 14 | 0 | 0 | 0 | 0 |
| Analytics | 10 | 0 | 0 | 0 | 0 |
| Team | 13 | 0 | 0 | 0 | 0 |
| Settings | 15 | 0 | 0 | 0 | 0 |
| Billing | 7 | 0 | 0 | 0 | 0 |
| Notifications | 7 | 0 | 0 | 0 | 0 |
| Exports | 5 | 0 | 0 | 0 | 0 |
| **TOTAL** | **239** | **56** | **48** | **6** | **7** |

---

*Document generated: 2026-03-03*
*App: CotizaPro (my-saas-app) | Stack: Next.js 15, Supabase, TailwindCSS*
