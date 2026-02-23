# CotizaPro Mobile — Flutter MVP Design

**Date**: 2026-02-22
**Status**: Approved
**Author**: Claude Code (brainstorming session)

---

## Overview

A Flutter mobile application for field technicians ("técnicos en mantenimiento") who need to perform daily operational tasks quickly from their phones. The app is the mobile counterpart to the existing CotizaPro web app.

**Target user**: Field maintenance technician (HVAC, painting, plumbing, electrical)
**Goal**: Create and send quotes in as few taps as possible
**Scope**: Operational features only — no admin or configuration tasks

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Repo structure | Separate repo (`cotizapro-mobile/`) | Independent deployments, clean separation |
| Backend communication | Via REST API (`/api/*` endpoints of web app) | Reuses all existing business logic, tested endpoints |
| Platforms | Android + iOS | Full coverage from MVP |
| Offline support | Basic (catalog + clients cached, quotes require connection) | Balances complexity vs. real-world need |
| Quote sending | WhatsApp native + Email via API | Maximum flexibility for Mexican market |
| State management | BLoC + Repository Pattern | Industry standard for Flutter business apps |

---

## Architecture

### Tech Stack

| Layer | Library | Purpose |
|-------|---------|---------|
| State Management | `flutter_bloc ^8` | BLoCs per feature |
| HTTP | `dio ^5` + interceptors | Calls to `/api/*` endpoints |
| Cache offline | `hive_flutter ^1` | Service catalog + clients |
| Auth | `supabase_flutter ^2` | Login/logout/session JWT |
| Router | `go_router ^14` | Declarative navigation + guards |
| PDF Viewer | `flutter_pdfview` | View quote PDF |
| WhatsApp | `url_launcher` | Open native WhatsApp |
| Env vars | `flutter_dotenv` | API URL, Supabase keys |

### Project Structure

```
cotizapro-mobile/
├── lib/
│   ├── core/
│   │   ├── auth/           # Supabase auth service
│   │   ├── http/           # Dio client + interceptors
│   │   ├── cache/          # Hive initialization + adapters
│   │   ├── router/         # go_router config + guards
│   │   └── theme/          # Colors, typography, spacing
│   ├── features/
│   │   ├── dashboard/      # Home screen, stats, quick actions
│   │   ├── clients/        # List, search, detail, create
│   │   ├── services/       # Catalog with categories (read-only + cache)
│   │   ├── quotes/         # List, create wizard, detail, send
│   │   └── profile/        # User info, logout
│   └── main.dart
├── test/
│   ├── unit/               # BLoCs, repositories, models
│   ├── widget/             # Critical screens
│   └── integration/        # Full user flows
├── integration_test/
├── android/
├── ios/
├── .env.development
├── .env.production
└── pubspec.yaml
```

### Feature Structure (per feature)

```
features/[feature]/
├── data/
│   ├── [feature]_repository_impl.dart
│   ├── [feature]_api_client.dart
│   └── [feature]_cache.dart        # (only services, clients)
├── domain/
│   ├── models/
│   │   └── [model].dart
│   └── [feature]_repository.dart   # abstract interface
└── presentation/
    ├── bloc/
    │   ├── [feature]_bloc.dart
    │   ├── [feature]_event.dart
    │   └── [feature]_state.dart
    ├── pages/
    └── widgets/
```

---

## Features & Navigation

### Bottom Navigation

```
Bottom Navigation Bar:
├── Dashboard    — recent quotes, quick actions (+New Quote button)
├── Clients      — list, search, create
├── Services     — catalog by category (read-only)
├── Quotes       — list, create, detail, send
└── Profile      — user info, logout
```

### Screen Map

| Module | Screens |
|--------|---------|
| Auth | Login |
| Dashboard | Home with stats + quick actions |
| Clients | List+Search / Detail / Create |
| Services | Catalog with categories (hvac/painting/plumbing/electrical/other) |
| Quotes | List / Create (3-step wizard) / Detail / Send |
| Profile | User info + logout |

### Primary User Flow (minimum taps)

```
Dashboard
  → [+ New Quote]
      → Step 1: Select or create client
      → Step 2: Add services from catalog (tap to add, adjust qty/price)
      → Step 3: Review (totals + IVA 16%, valid_until, terms)
      → Preview PDF
      → Send: [WhatsApp native] | [Email via API]
```

### Quote Creation Wizard — Step Details

**Step 1 — Client**
- Search existing clients (from Hive cache)
- Or tap "+ New Client" to create inline (POST /api/clients)

**Step 2 — Services**
- Browse catalog by category (from Hive cache)
- Tap service to add to quote
- Adjust quantity and unit price per item
- Running total displayed at bottom

**Step 3 — Review & Send**
- Auto-calculated subtotal + IVA 16% + total
- Set valid_until date (date picker, default 30 days)
- Optional terms_and_conditions
- Preview PDF button
- Save as draft or send immediately

---

## API Contracts

All endpoints already exist and are tested in the web app.

### Endpoints Consumed

| Action | Endpoint | Method |
|--------|----------|--------|
| List clients | `/api/clients` | GET |
| Create client | `/api/clients` | POST |
| List services | `/api/services` | GET → cache Hive |
| List quotes | `/api/quotes` | GET |
| Create quote | `/api/quotes` | POST |
| Quote detail | `/api/quotes/[id]` | GET |
| Send quote | `/api/quotes/[id]/send` | POST |
| Export PDF | `/api/export/quote/[id]` | GET |
| List reminders | `/api/reminders` | GET |

### Key Data Contracts

**Create Quote POST body**:
```json
{
  "client_id": "uuid",
  "valid_until": "2026-03-22T00:00:00.000Z",  // ISO datetime, NOT integer
  "terms_and_conditions": "...",                // NOT "terms"
  "items": [
    {
      "service_id": "uuid",
      "description": "Service name",
      "quantity": 1,
      "unit_price": 1500.00,
      "unit_type": "fixed"                      // fixed|per_hour|per_sqm|per_unit
    }
  ]
}
```

**Send Quote POST body**:
```json
{
  "send_via": ["whatsapp"]   // ['email'] | ['whatsapp'] | ['email','whatsapp']
}
```

### Key Models

```dart
// Quote
class Quote {
  final String id;
  final String number;       // COT-2026-###
  final String status;       // draft|sent|viewed|accepted|rejected|expired
  final Client client;
  final List<QuoteItem> items;
  final double subtotal;
  final double tax;          // IVA 16%
  final double total;
  final DateTime validUntil;
}

// QuoteItem
class QuoteItem {
  final String serviceId;
  final String description;
  final double quantity;
  final double unitPrice;
  final String unitType;    // fixed|per_hour|per_sqm|per_unit
  final double subtotal;
}

// Client
class Client {
  final String id;
  final String name;
  final String? companyName;
  final String? email;
  final String? phone;
}

// Service (from service_catalog table)
class Service {
  final String id;
  final String name;
  final double unitPrice;   // Comes as string from API, must cast: double.parse(s)
  final String unitType;    // fixed|per_hour|per_sqm|per_unit
  final String category;    // hvac|painting|plumbing|electrical|other
}
```

---

## Offline Strategy

**On app open (with connection)**:
1. GET /api/services → store all to `Hive Box<Service>('services')`
2. GET /api/clients → store all to `Hive Box<Client>('clients')`

**On app open (no connection)**:
1. Read from Hive cache
2. Show offline banner in UI

**Quote creation**: Requires active connection (persists to Supabase)

**Conflict resolution**: Last-write-wins (simple, sufficient for MVP)

---

## Authentication Flow

1. User opens app → `go_router` guard checks Supabase session
2. No session → redirect to `/login`
3. Login with email + password via `supabase_flutter`
4. On success → Supabase stores JWT in secure storage
5. `Dio` interceptor reads JWT from Supabase session and attaches as `Authorization: Bearer <token>` header to every request
6. Same JWT that the Next.js API validates (existing middleware)
7. Token refresh handled automatically by Supabase Flutter SDK

---

## Error Handling

### Three-Layer Strategy

```
API Layer (Dio interceptor)
  → 401 Unauthorized → logout + redirect to login
  → 429 Too Many Requests → show "Demasiadas solicitudes, espera un momento"
  → 5xx Server Error → show error with Retry button
  → No connection → use Hive cache if available

BLoC Layer
  → States: Initial | Loading | Success(data) | Error(message)
  → Never exposes technical errors to UI

UI Layer
  → Snackbars for non-critical errors
  → Error screen with Retry for critical failures
  → Loading indicators on every async action
```

---

## Quote Sending Flow

### WhatsApp (native)
1. GET /api/export/quote/[id] → receive PDF URL
2. Build pre-filled WhatsApp message: "Hola [client name], te comparto la cotización [number]: [PDF URL]"
3. `url_launcher` opens `whatsapp://send?phone=[client.phone]&text=[message]`
4. User taps send in WhatsApp — zero extra steps

### Email (via API)
1. POST /api/quotes/[id]/send with `{ "send_via": ["email"] }`
2. Web app uses Resend to send email with PDF attachment
3. Show success snackbar "Cotización enviada por correo"

### Combined
- Show modal with two buttons: [WhatsApp] [Email]
- Can tap both independently

---

## Testing Strategy

| Type | Tool | Coverage |
|------|------|---------|
| Unit | `flutter_test` + `mocktail` | BLoCs, repositories, models |
| Widget | `flutter_test` | Login screen, quote wizard, quote detail |
| Integration | `integration_test` | Login → create quote → send via WhatsApp |

**Coverage target**: 70%+ (pragmatic for MVP, focused on business logic)

### CI/CD

```yaml
# GitHub Actions on PR:
- flutter analyze
- flutter test --coverage
- lcov coverage check (70%+)

# On merge to main:
- Build Android APK (release)
- Build iOS .ipa (macOS runner)
```

---

## Environment Variables

```
# .env.development
API_BASE_URL=http://localhost:3000
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJ...

# .env.production
API_BASE_URL=https://cotizapro.vercel.app
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

---

## Out of Scope (web app only)

- Service catalog management (create/edit/delete services)
- Organization settings
- User management and team invitations
- Billing and subscription management
- Analytics dashboard
- Webhook configuration
- Email/WhatsApp template management

---

## DB Gotchas (from web app — must replicate in Flutter models)

- Services table: `service_catalog` (NOT `services`) — but Flutter hits `/api/services` endpoint, so transparent
- Services price column: `unit_price` (NOT `default_price`)
- `unit_price` is `numeric(10,2)` → returns as **string** in JSON → always `double.parse(json['unit_price'])`
- `unit_type` valid values: `fixed | per_hour | per_sqm | per_unit` (NOT Spanish labels)
- `valid_until` must be ISO datetime string (NOT integer days)
- Quote field: `terms_and_conditions` (NOT `terms`)
- Client join: includes `company_name` field (added in migration 010)
