# CotizaPro - Professional Quote Management SaaS

Enterprise-grade SaaS application for HVAC, plumbing, and service professionals to create, send, and track quotes professionally.

Built with Next.js 15, TypeScript, Supabase, and modern best practices.

## ✨ Features

### Core Functionality
- ✅ **Client Management** - Full CRUD operations with tags and notes
- ✅ **Quote Builder** - Dynamic quote creation with line items, discounts, and tax calculation
- ✅ **Service Catalog** - Reusable service templates with pricing
- ✅ **Multi-Channel Delivery** - Send quotes via Email and WhatsApp with PDF attachments
- ✅ **Follow-Up Reminders** - Automated reminder system with recurring schedules
- ✅ **Analytics Dashboard** - Conversion rates, revenue tracking, and trends
- ✅ **Export System** - CSV and PDF exports for reports

### Technical Features
- ✅ **Authentication & Authorization** - JWT-based auth with role-based access control (Owner, Admin, Member, Viewer)
- ✅ **Multi-Tenancy** - Organization-based data isolation with Row-Level Security (RLS)
- ✅ **Real-time Features** - Supabase Realtime for live updates
- ✅ **Webhook System** - External integrations support
- ✅ **Cron Jobs** - Automated daily reminder notifications
- ✅ **Production Ready** - TypeScript strict mode, E2E testing with Playwright, ECC-powered development

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5.x, TailwindCSS 3.x
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL (Supabase) with Row-Level Security
- **Authentication**: Supabase Auth (JWT)
- **Billing**: Stripe (Subscriptions, Webhooks)
- **Real-time**: Supabase Realtime, SSE
- **Testing**: Vitest (Unit), Playwright (E2E)
- **Development**: Everything Claude Code (ECC) - agents, skills, workflows

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

### Vercel Deployment (Recommended)

1. Push your code to GitHub
2. Import project to Vercel: https://vercel.com/new
3. Configure environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   STRIPE_SECRET_KEY=your_stripe_secret
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   RESEND_API_KEY=your_resend_key
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_phone
   CRON_SECRET=your_cron_secret
   ```
4. Deploy

### Vercel Cron Jobs

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/reminders-check",
    "schedule": "0 9 * * *"
  }]
}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Documentation

- [Feature Tracker](docs/FEATURE_TRACKER.md) - Implementation status
- [Supabase Storage Setup](docs/SUPABASE_STORAGE_SETUP.md) - Storage configuration
- [Cron Setup](docs/CRON_SETUP.md) - Automated job configuration
- [MVP Plan](docs/plans/2026-02-12-cotizapro-mvp.md) - Original MVP specification

## License

Proprietary - All rights reserved
