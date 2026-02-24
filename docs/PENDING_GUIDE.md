# CotizaPro — Pending Items Implementation Guide

> Self-contained guide for completing all post-MVP tasks.
> Follow in order. Each section is independent unless noted.
> MVP status: 33/33 tasks complete, 338/338 E2E tests passing.

---

## Table of Contents

1. [Unit Tests (Vitest)](#1-unit-tests-vitest)
2. [API Integration Tests](#2-api-integration-tests)
3. [Email Setup (Resend)](#3-email-setup-resend)
4. [WhatsApp Setup (Twilio)](#4-whatsapp-setup-twilio)
5. [Cron — Automatic Reminders](#5-cron--automatic-reminders)
6. [Docker Deployment](#6-docker-deployment)
7. [CI/CD Pipeline (GitHub Actions)](#7-cicd-pipeline-github-actions)
8. [Monitoring & Logging (Sentry)](#8-monitoring--logging-sentry)
9. [Stripe Production Activation](#9-stripe-production-activation)
10. [Advanced Features](#10-advanced-features)

---

## 1. Unit Tests (Vitest)

**Current state:** 0% coverage. Target: 80%+.
**Framework:** Vitest is already installed. Configuration in `vitest.config.ts` (or `package.json`).

### 1.1 Verify Vitest is ready

```bash
npx vitest --version
```

If missing:

```bash
npm install -D vitest @vitejs/plugin-react
```

### 1.2 Add vitest config (if not present)

Create `vitest.config.ts` at project root:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Add script to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### 1.3 Priority files to test

Test these in order (highest value):

| File | What to test |
|------|-------------|
| `lib/validations/cotizapro.ts` | Zod schemas — valid/invalid inputs |
| `lib/rate-limit.ts` | Rate limiter skips in non-production |
| `lib/integrations/pdf.ts` | PDF buffer generation shape |
| `lib/integrations/email.ts` | Returns error when RESEND_API_KEY missing |
| `lib/integrations/twilio.ts` | Returns error when env vars missing |

### 1.4 Example: Zod schema tests

Create `lib/validations/__tests__/cotizapro.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createClientSchema, createServiceSchema, createQuoteSchema } from '../cotizapro'

describe('createClientSchema', () => {
  it('accepts valid client', () => {
    const result = createClientSchema.safeParse({
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '5512345678',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createClientSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = createClientSchema.safeParse({ name: 'Juan', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })
})

describe('createServiceSchema', () => {
  it('accepts valid service', () => {
    const result = createServiceSchema.safeParse({
      name: 'Instalación AC',
      category: 'hvac',
      unit_price: 5000,
      unit_type: 'fixed',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid unit_type', () => {
    const result = createServiceSchema.safeParse({
      name: 'Test',
      category: 'hvac',
      unit_price: 100,
      unit_type: 'invalid_value',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative price', () => {
    const result = createServiceSchema.safeParse({
      name: 'Test',
      category: 'hvac',
      unit_price: -1,
      unit_type: 'fixed',
    })
    expect(result.success).toBe(false)
  })
})

describe('createQuoteSchema', () => {
  const validQuote = {
    client_id: '00000000-0000-0000-0000-000000000001',
    valid_until: new Date(Date.now() + 86400000).toISOString(),
    items: [
      {
        description: 'Servicio de prueba',
        quantity: 1,
        unit_price: 1000,
        unit_type: 'fixed',
      },
    ],
  }

  it('accepts valid quote', () => {
    const result = createQuoteSchema.safeParse(validQuote)
    expect(result.success).toBe(true)
  })

  it('rejects empty items array', () => {
    const result = createQuoteSchema.safeParse({ ...validQuote, items: [] })
    expect(result.success).toBe(false)
  })

  it('requires valid_until as ISO string', () => {
    const result = createQuoteSchema.safeParse({ ...validQuote, valid_until: '30' })
    expect(result.success).toBe(false)
  })
})
```

### 1.5 Example: Email service tests

Create `lib/integrations/__tests__/email.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('sendEmail — missing API key', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.RESEND_API_KEY
  })

  it('returns success: false when RESEND_API_KEY is not set', async () => {
    const { sendEmail } = await import('../email')
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/RESEND_API_KEY/)
  })
})
```

### 1.6 Run tests

```bash
npm run test             # all tests
npm run test:coverage    # with coverage report
```

Coverage report is at `coverage/index.html` — open in browser to view.

---

## 2. API Integration Tests

**Goal:** Test API route handlers against a real (local) Supabase instance.

### 2.1 Prerequisites

Local Supabase must be running:

```bash
npx supabase start
# API: http://127.0.0.1:54321
# DB:  postgresql://postgres:postgres@127.0.0.1:54332/postgres
```

### 2.2 Install dependencies

```bash
npm install -D supertest @types/supertest
```

### 2.3 Environment for tests

Create `.env.test` at project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<local service role key from supabase start output>
NODE_ENV=test
```

Keys are shown when running `npx supabase start` or `npx supabase status`.

### 2.4 Example: Clients API integration test

Create `app/api/clients/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'

const BASE = 'http://localhost:3000'
let authCookie: string

beforeAll(async () => {
  // Sign in as demo user to get auth cookie
  const res = await fetch(`${BASE}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo@climasol.mx',
      password: 'ClimaSol2026!',
    }),
  })
  authCookie = res.headers.get('set-cookie') || ''
})

describe('GET /api/clients', () => {
  it('returns 200 with clients array', async () => {
    const res = await fetch(`${BASE}/api/clients`, {
      headers: { Cookie: authCookie },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('clients')
    expect(Array.isArray(json.clients)).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/clients`)
    expect(res.status).toBe(401)
  })
})
```

Run with dev server active (`npm run dev` in another terminal):

```bash
npm run test
```

---

## 3. Email Setup (Resend)

**Current state:** `lib/integrations/email.ts` is ready. Needs real `RESEND_API_KEY`.
**Sender:** `process.env.EMAIL_FROM` or default `CotizaPro <noreply@cotizapro.com>`.

### 3.1 Create Resend account

1. Go to https://resend.com and sign up (free tier: 100 emails/day, 3,000/month)
2. Verify your email address

### 3.2 Get API key

1. Dashboard → **API Keys** → **Create API Key**
2. Name: `cotizapro-production`
3. Permission: **Sending access**
4. Copy the key (shown once)

### 3.3 Add domain (required for custom From address)

1. Dashboard → **Domains** → **Add Domain**
2. Enter your domain (e.g., `cotizapro.com` or `tudominio.com`)
3. Add the DNS records shown (TXT for verification, MX and DMARC for deliverability)
4. Wait for verification (5–30 minutes)

If you don't have a domain yet, use Resend's shared domain for testing:
- From address must be `onboarding@resend.dev`

### 3.4 Configure environment variables

Add to `.env.local` (local dev) and to your deployment environment:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=CotizaPro <noreply@yourdomain.com>
```

### 3.5 Verify it works

Add a temporary test route or run in Node REPL:

```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
resend.emails.send({
  from: process.env.EMAIL_FROM,
  to: 'your-personal-email@example.com',
  subject: 'CotizaPro test',
  html: '<p>Email working!</p>'
}).then(console.log).catch(console.error);
"
```

---

## 4. WhatsApp Setup (Twilio)

**Current state:** `lib/integrations/twilio.ts` is ready. Needs 3 env vars.

Required env vars:
- `TWILIO_ACCOUNT_SID` — Account SID from Twilio console
- `TWILIO_AUTH_TOKEN` — Auth token from Twilio console
- `TWILIO_WHATSAPP_FROM` — WhatsApp-enabled number in format `+521234567890`

### 4.1 Create Twilio account

1. Go to https://www.twilio.com and sign up (free trial includes $15 credit)
2. Verify your phone number

### 4.2 Get credentials

1. Twilio Console → **Dashboard**
2. Copy **Account SID** and **Auth Token**

### 4.3 Enable WhatsApp Sandbox (development)

1. Console → **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow instructions to join the sandbox from your phone:
   - Send `join <sandbox-keyword>` to the Twilio sandbox number
3. Sandbox number format: `+14155238886` (use this as `TWILIO_WHATSAPP_FROM` in dev)

### 4.4 Request WhatsApp Business API (production)

For production, you need a dedicated WhatsApp Business number:

1. Console → **Messaging** → **Senders** → **WhatsApp senders**
2. Click **Request Access** — provide:
   - Facebook Business Manager ID
   - Display name
   - Business category
3. Approval takes 1–7 business days
4. Once approved, the assigned number becomes your `TWILIO_WHATSAPP_FROM`

### 4.5 Configure environment variables

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=+14155238886
```

Note: Phone number stored without `whatsapp:` prefix — the integration adds it automatically.

### 4.6 Test

```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
client.messages.create({
  body: 'Prueba desde CotizaPro',
  from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_FROM,
  to: 'whatsapp:+52YOUR_PHONE_NUMBER'
}).then(msg => console.log('SID:', msg.sid)).catch(console.error);
"
```

---

## 5. Cron — Automatic Reminders

**Current state:** Infrastructure 100% ready. Needs credentials and activation.

Files involved:
- `app/api/cron/reminders-check/route.ts` — the cron endpoint
- `.github/workflows/cron-reminders.yml` — GitHub Actions trigger
- `vercel.json` — Vercel Cron trigger (alternative)

The endpoint is secured: `Authorization: Bearer <CRON_SECRET>`.

### 5.1 Generate CRON_SECRET

```bash
# Generate a random 32-byte secret
openssl rand -hex 32
```

Copy the output — this is your `CRON_SECRET`.

### 5.2 Add to local env

```bash
CRON_SECRET=<generated-secret>
APP_URL=http://localhost:3000
```

### 5.3 Test the endpoint locally

With dev server running:

```bash
curl -X POST http://localhost:3000/api/cron/reminders-check \
  -H "Authorization: Bearer <your-cron-secret>"
```

Expected response: `{ "processed": N }` where N is the number of reminders processed.

### 5.4 Option A — GitHub Actions cron (recommended)

Add to GitHub Secrets (Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `CRON_SECRET` | Generated secret from step 5.1 |
| `APP_URL` | Your production URL e.g. `https://cotizapro.vercel.app` |

The workflow `.github/workflows/cron-reminders.yml` already runs at 9:00 AM UTC daily.
Push to main to activate it.

### 5.5 Option B — Vercel Cron (zero infrastructure)

If deploying to Vercel, check `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders-check",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Add in Vercel dashboard (Settings → Environment Variables):

```
CRON_SECRET=<your-secret>
```

Vercel calls the endpoint automatically — no GitHub Actions needed for this.

### 5.6 Verify email/WhatsApp is configured

For reminders to send notifications, both Resend (Section 3) and Twilio (Section 4) must be configured. Without them, the cron will process reminders but skip sending.

---

## 6. Docker Deployment

**Current state:** `Dockerfile` and `docker-compose.yml` already exist.
**What's missing:** Environment variables wired into `docker-compose.yml`.

### 6.1 Review existing files

```bash
cat Dockerfile
cat docker-compose.yml
```

### 6.2 Create docker env file

Create `.env.docker` (never commit this):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Email
RESEND_API_KEY=re_xxxx
EMAIL_FROM=CotizaPro <noreply@yourdomain.com>

# WhatsApp
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_WHATSAPP_FROM=+14155238886

# Cron
CRON_SECRET=xxxx
APP_URL=https://yourdomain.com

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Add `.env.docker` to `.gitignore`:

```bash
echo ".env.docker" >> .gitignore
```

### 6.3 Update docker-compose.yml

Open `docker-compose.yml` and add the env_file reference:

```yaml
services:
  app:
    build: .
    env_file:
      - .env.docker
    ports:
      - "3000:3000"
    restart: unless-stopped
```

### 6.4 Build and run

```bash
docker compose build
docker compose up -d

# Check logs
docker compose logs -f app

# Verify app responds
curl http://localhost:3000/api/health
```

### 6.5 Deploy to VPS (optional)

```bash
# On your server
git clone <repo>
cd my-saas-app
cp .env.docker.example .env.docker  # fill in real values
docker compose up -d
```

---

## 7. CI/CD Pipeline (GitHub Actions)

**Current state:** `.github/workflows/deploy.yml` scaffolded. Unit test step commented out.
**What's missing:** 7 GitHub Secrets.

### 7.1 Required secrets

Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add all of these:

| Secret name | Where to get it |
|-------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, `anon public` key |
| `VERCEL_TOKEN` | Vercel dashboard → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel dashboard → Account Settings → General (your team/personal ID) |
| `VERCEL_PROJECT_ID` | Vercel dashboard → Project Settings → General |
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub → Account Settings → Security → Access Token |

### 7.2 Get Vercel IDs

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel link

# Read generated .vercel/project.json
cat .vercel/project.json
# { "orgId": "...", "projectId": "..." }
```

### 7.3 Uncomment unit tests in workflow

Open `.github/workflows/deploy.yml` and find the commented test step:

```yaml
# - name: Run tests
#   run: npm run test
```

Uncomment it:

```yaml
- name: Run tests
  run: npm run test
```

**Do this only after Section 1 (unit tests) is complete**, otherwise the CI will fail.

### 7.4 Trigger the pipeline

```bash
git add .
git commit -m "ci: configure github actions secrets and enable tests"
git push origin main
```

Monitor at: `https://github.com/<your-org>/<repo>/actions`

### 7.5 Verify deployment

After pipeline passes:
1. Check Vercel dashboard for deployment URL
2. Check Docker Hub for new image: `hub.docker.com/r/<username>/cotizapro`
3. Run the production E2E smoke test:

```bash
BASE_URL=https://your-app.vercel.app npx playwright test e2e/specs/00-smoke.spec.ts
```

---

## 8. Monitoring & Logging (Sentry)

**Current state:** No monitoring configured.
**Recommendation:** Sentry (free tier: 5,000 errors/month).

### 8.1 Create Sentry project

1. Go to https://sentry.io and sign up
2. Create project → Platform: **Next.js**
3. Copy the **DSN** (Data Source Name)

### 8.2 Install

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

The wizard creates:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- Updates `next.config.js`

### 8.3 Configure DSN

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@oxx.ingest.sentry.io/xxxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=cotizapro
SENTRY_AUTH_TOKEN=sntrys_xxxx  # for source maps upload
```

Add the same vars to GitHub Secrets and Vercel environment variables.

### 8.4 Verify Sentry is working

```bash
npm run build
npm run start
# Visit /api/debug-sentry (created by wizard) to trigger a test error
```

Check Sentry dashboard for the test event.

---

## 9. Stripe Production Activation

**Current state:** Stripe infrastructure connected in code. Using test keys.

### 9.1 Prerequisites

- Completed business registration (required by Stripe for payouts)
- Business bank account

### 9.2 Activate Stripe account

1. Go to https://dashboard.stripe.com
2. Complete the activation form:
   - Business type, address, industry
   - Bank account for payouts
   - Phone verification
3. Stripe reviews and activates (usually instant for low-risk businesses)

### 9.3 Get live keys

Dashboard → **Developers** → **API keys** → toggle to **Live mode**:

```bash
STRIPE_SECRET_KEY=sk_live_xxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
```

### 9.4 Register webhook endpoint

Dashboard → **Developers** → **Webhooks** → **Add endpoint**:

- URL: `https://your-app.vercel.app/api/webhooks/stripe`
- Events to listen:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `checkout.session.completed`

Copy the **Signing secret**:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxx
```

### 9.5 Update production env vars

Update all of the above in:
- Vercel dashboard → Environment Variables
- `.env.docker` if using Docker
- GitHub Secrets (for CI)

### 9.6 Test live webhook locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

---

## 10. Advanced Features

These are independent. Implement in any order after Sections 1–7 are complete.

---

### 10.1 E-Signature

**Recommendation:** DocuSign or SignWell (simpler, cheaper).

**SignWell API approach:**

1. Create account at https://signwell.com
2. Get API key from Settings → API
3. Install: `npm install axios` (or use native fetch)
4. Create `lib/integrations/signwell.ts`:

```typescript
export async function sendForSignature({
  documentPdf,        // Buffer
  signerEmail: string,
  signerName: string,
  documentTitle: string,
}) {
  // Upload PDF → create envelope → send to signer
  // Returns signingUrl for redirect or email
}
```

5. Add button on quote detail page (`app/(dashboard)/dashboard/quotes/[id]/page.tsx`):
   - Only show for `status === 'accepted'` quotes
   - On click: generate PDF → send to Signwell → update quote status to `signed`

6. Add `signed` to the status enum in DB:

```sql
-- supabase/migrations/XXX_add_signed_status.sql
ALTER TABLE quotes
DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes
ADD CONSTRAINT quotes_status_check
CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'signed'));
```

---

### 10.2 CRM Integration

**Recommendation:** Integrate with HubSpot (free CRM, 1M contacts).

**Approach:**

1. HubSpot account → Settings → Integrations → Private Apps → Create app
2. Scopes: `crm.objects.contacts.write`, `crm.objects.deals.write`
3. Get access token
4. Create `lib/integrations/hubspot.ts`:

```typescript
export async function syncClientToHubspot(client: Client) {
  // POST to HubSpot Contacts API
}

export async function createDealFromQuote(quote: Quote) {
  // POST to HubSpot Deals API
}
```

5. Call `syncClientToHubspot` from `app/api/clients/route.ts` POST handler
6. Call `createDealFromQuote` from `app/api/quotes/route.ts` POST handler

---

### 10.3 Multi-Language (i18n)

**Recommended library:** `next-intl` (best Next.js 15 App Router support)

```bash
npm install next-intl
```

**Steps:**

1. Create `messages/es.json` and `messages/en.json`
2. Configure `next.config.js` with next-intl plugin
3. Wrap root layout with `NextIntlClientProvider`
4. Replace hardcoded Spanish strings with `t('key')` calls
5. Add language switcher to header

**Priority files to translate first:**
- `app/(dashboard)/dashboard/quotes/page.tsx`
- `app/(dashboard)/dashboard/clients/page.tsx`
- `components/dashboard/sidebar.tsx`

Full guide: https://next-intl.dev/docs/getting-started/app-router

---

## Completion Checklist

Track progress here:

- [ ] 1. Unit tests — Vitest, 80%+ coverage
- [ ] 2. API integration tests
- [ ] 3. Email — Resend account + API key configured
- [ ] 4. WhatsApp — Twilio account + credentials configured
- [ ] 5. Cron reminders — CRON_SECRET set, endpoint verified
- [ ] 6. Docker — env vars wired into docker-compose.yml
- [ ] 7. CI/CD — all 7 GitHub Secrets configured, tests enabled
- [ ] 8. Monitoring — Sentry DSN configured
- [ ] 9. Stripe — live keys, webhook registered
- [ ] 10a. E-signature — SignWell integration
- [ ] 10b. CRM — HubSpot sync
- [ ] 10c. Multi-language — next-intl

---

*Generated: 2026-02-23 | MVP: 33/33 tasks, 338/338 E2E tests*
