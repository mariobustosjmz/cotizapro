# CotizaPro - Professional Quote Management SaaS

Enterprise-grade SaaS application for HVAC, plumbing, and service professionals to create, send, and track quotes professionally.

Built with Next.js 16, TypeScript, Supabase (self-hosted) and Tailwind CSS 4. Live at https://cotizapro.mariobustos.io.

## Features

### Core Functionality
- **Clients, service catalog and quotes** - Line items, discounts, tax, templates by trade and a block-based pricing engine (`@cotizapro/quoting`)
- **Quote delivery** - Email via Resend with the business branding (logo, color, reply-to) and the PDF attached; WhatsApp via wa.me links
- **Public showcase** - Public business page (`/p/[slug]`) with portfolio, verified reviews, "request a quote" and QR
- **Team** - Roles (owner, admin, member, viewer), invitations by link, WhatsApp or email
- **Branding** - Logo upload and brand color applied to the dashboard, PDF, emails and public page
- **Onboarding checklist**, work calendar, payments per quote, Kanban by status, analytics and reminders

### Technical Features
- **Multi-tenancy with RLS** - Organization isolation hardened in migrations 037-040 (tenant id from `profiles`, guarded privileged and billing columns, no open service policies)
- **Authentication** - Supabase Auth (GoTrue) with transactional emails through Resend SMTP
- **Plans** - Gratis, Solo, Taller (3 users) and Empresa (10 users, $1,590 MXN) with extra users at $99
- **Testing** - Vitest unit tests and Playwright E2E

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4
- **Backend**: Next.js route handlers and server actions
- **Database / Auth / Storage / Realtime**: Supabase self-hosted (PostgreSQL 17, GoTrue, PostgREST, Storage, Realtime)
- **Email**: Resend (API for quotes and invitations, SMTP for auth emails)
- **Monorepo**: pnpm + Turborepo (`apps/web`, `packages/auth`, `packages/db`, `packages/quoting`, `packages/ui`)
- **Testing**: Vitest, Playwright

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for a complete setup guide.

### Prerequisites

- Node.js 18+ or Bun
- Supabase account (free tier available)
- Stripe account for billing (optional for development)

### Basic Setup

```bash
# Install dependencies
npm install

# Start Supabase local instance
npx supabase start

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and Stripe credentials

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

**Default Test Users** (for local development):
- Owner: `owner@example.com` / `password123`
- Admin: `admin@example.com` / `password123`
- Member: `member@example.com` / `password123`

## Project Structure

```
my-saas-app/
├── app/
│   ├── (auth)/                    # Authentication pages (login, signup)
│   ├── (dashboard)/               # Protected dashboard pages
│   │   ├── clients/              # Client management
│   │   ├── quotes/               # Quote creation and management
│   │   ├── reminders/            # Follow-up reminder system
│   │   ├── services/             # Service catalog
│   │   └── analytics/            # Analytics dashboard
│   ├── api/
│   │   ├── clients/              # Client CRUD API
│   │   ├── quotes/               # Quote management API
│   │   ├── reminders/            # Reminder system API
│   │   ├── analytics/            # Analytics API
│   │   ├── export/               # CSV/PDF export API
│   │   ├── cron/                 # Cron job endpoints
│   │   └── webhooks/             # Stripe & external webhooks
│   └── layout.tsx                # Root layout with auth provider
├── components/
│   ├── ui/                       # Reusable UI components
│   ├── dashboard/                # Dashboard-specific components
│   └── forms/                    # Form components
├── lib/
│   ├── supabase/                 # Supabase client and helpers
│   ├── integrations/             # Email, WhatsApp, SMS
│   └── validations/              # Zod schemas
├── supabase/
│   ├── migrations/               # Database migrations
│   └── seed.sql                  # Test data
└── e2e/                          # Playwright E2E tests
```

## Development Commands

```bash
# Development
npm run dev                 # Start dev server (port 3000)
npm run build               # Production build
npm run start               # Start production server

# Database
npm run db:migrate          # Run database migrations
npm run db:reset            # Reset local database
npx supabase start          # Start local Supabase
npx supabase stop           # Stop local Supabase

# Testing
npm run test                # Run unit tests
npm run test:e2e            # Run E2E tests (headless)
npm run test:e2e:headed     # Run E2E tests (headed mode)
npm run test:coverage       # Generate coverage report

# Code Quality
npm run lint                # Run ESLint
npm run type-check          # TypeScript type checking
npm run format              # Format code with Prettier
```

## Deployment

Production runs on a shared Hostinger VPS behind Caddy, with its own reduced Supabase stack (`cotizapro-db`, `cotizapro-auth`, `cotizapro-rest`, `cotizapro-storage`, `cotizapro-realtime`) and the Next.js app (`cotizapro-web`) in `/opt/cotizapro-deploy`.

1. Back up the code, schema and data; tag the current image as rollback.
2. Apply new migrations inside `begin; ... commit;` and record them in `supabase_migrations.schema_migrations`.
3. Sync the committed code (`git archive HEAD` + `rsync --delete`) to `/opt/cotizapro`.
4. `docker compose build cotizapro-web` and `docker compose up -d --no-deps cotizapro-web`.
5. Smoke-test every domain on the server before and after (the server is shared with other projects).

Secrets live only in `/opt/cotizapro-deploy/.env` (mode 600): Supabase keys, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `IP_HASH_SALT`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Documentation

- [Feature Tracker](docs/FEATURE_TRACKER.md) - Implementation status
- [Supabase Storage Setup](docs/SUPABASE_STORAGE_SETUP.md) - Storage configuration
- [Cron Setup](docs/CRON_SETUP.md) - Automated job configuration
- [MVP Plan](docs/plans/2026-02-12-cotizapro-mvp.md) - Original MVP specification
- [Public quote and billing design](docs/superpowers/specs/2026-10-13-cotizacion-publica-y-cobro-design.md) - Next: accept quotes from a link, deposits, Mercado Pago and superadmin
- [AI credits and features design](docs/superpowers/specs/2026-10-13-ia-creditos-y-funciones-design.md) - Next: AI features with a monthly usage meter

## License

Proprietary - All rights reserved
