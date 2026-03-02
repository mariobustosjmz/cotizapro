# CotizaPro — Deployment Guide (SSH / Custom VM)

## Overview

This guide covers deploying CotizaPro to a custom Linux VM (Ubuntu 22.04) via SSH.

**Stack on server:**
- Node.js 20 (via nvm)
- pnpm
- PM2 (process manager)
- Nginx (reverse proxy)

**External services:**
- Supabase (database + auth + storage) — `mskehmvisklpxyavvvlm.supabase.co`
- Stripe (billing) — sandbox or live keys

---

## Prerequisites

### 1. Get missing secrets (one-time)

#### Supabase Service Role Key
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/mskehmvisklpxyavvvlm/settings/api)
2. Copy **service_role** key (secret — not anon key)
3. Paste into `.env.production` as `SUPABASE_SERVICE_ROLE_KEY`

#### Stripe Keys (Sandbox / Test mode)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`
3. Copy **Publishable key** (`pk_test_...`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

#### Stripe Products & Price IDs
1. Go to [Stripe Products](https://dashboard.stripe.com/test/products)
2. Create 3 products: **Starter**, **Pro**, **Enterprise**
3. Add a recurring price to each (monthly)
4. Copy each `price_xxx` ID → `.env.production`

#### Stripe Webhook Secret (after deploy)
1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Add endpoint: `http://YOUR_SERVER_IP/api/webhooks/stripe`
3. Select events: `customer.subscription.*`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 2. Fill in .env.production

```bash
cp .env.production.example .env.production
# Edit .env.production with real values
```

Required fields to fill before first deploy:
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`
- `NEXT_PUBLIC_APP_URL` (your server IP or domain)

---

## First-Time Server Setup

Run once on a fresh Ubuntu 22.04 VM:

```bash
# From your local machine
ssh root@YOUR_SERVER_IP 'bash -s' < scripts/setup-server.sh
```

This installs: Node 20, pnpm, PM2, Nginx, UFW firewall.

---

## Apply Database Migrations

Run all 26 migrations against the production Supabase project:

```bash
# Option A: Using Supabase CLI (recommended)
supabase db push \
  --db-url "postgresql://postgres.mskehmvisklpxyavvvlm:/mQ9s@#ebjtBQdU@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Option B: Apply individual files with psql
DB_URL="postgresql://postgres.mskehmvisklpxyavvvlm:/mQ9s@#ebjtBQdU@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
for f in supabase/migrations/*.sql; do
  echo "Applying $f..."
  psql "$DB_URL" -f "$f"
done
```

> Run migrations BEFORE the first deploy.

---

## Create Supabase Storage Bucket

1. Go to [Supabase Storage](https://supabase.com/dashboard/project/mskehmvisklpxyavvvlm/storage/buckets)
2. Create bucket: **`documents`**
3. Set to **Public**

Or via API:
```bash
curl -X POST "https://mskehmvisklpxyavvvlm.supabase.co/storage/v1/bucket" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "documents", "name": "documents", "public": true}'
```

---

## Deploy

```bash
# First deploy
./scripts/deploy.sh deploy@YOUR_SERVER_IP

# Subsequent deploys (skip migrations)
./scripts/deploy.sh deploy@YOUR_SERVER_IP --skip-migrations

# Deploy specific branch
./scripts/deploy.sh deploy@YOUR_SERVER_IP --branch develop
```

### What deploy.sh does:
1. Pre-flight checks (env file, SSH connection)
2. Builds Next.js bundle locally (`NODE_ENV=production`)
3. Uploads `.env.production` to server
4. Rsyncs `.next/` build artifacts
5. Installs dependencies on server
6. Applies migrations (optional)
7. Restarts app via PM2
8. Health check (`GET /api/health`)

---

## SSL / HTTPS (optional but recommended)

After your domain DNS points to the server:

```bash
ssh deploy@YOUR_SERVER_IP
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

Certbot auto-renews certificates every 90 days.

---

## Server Management

```bash
# View logs
ssh deploy@SERVER 'pm2 logs cotizapro --lines 50'

# Restart app
ssh deploy@SERVER 'pm2 restart cotizapro'

# Check status
ssh deploy@SERVER 'pm2 show cotizapro'

# Health endpoint
curl http://YOUR_SERVER_IP/api/health

# Nginx logs
ssh deploy@SERVER 'sudo tail -f /var/log/nginx/error.log'
```

---

## Quick Reference

| Item | Value |
|------|-------|
| Supabase project | `mskehmvisklpxyavvvlm` |
| Supabase URL | `https://mskehmvisklpxyavvvlm.supabase.co` |
| DB password | See `.env.production` |
| App port (PM2) | `3000` |
| Nginx config | `/etc/nginx/sites-available/cotizapro` |
| App directory | `/var/www/cotizapro` |
| Deploy user | `deploy` |
| Stripe dashboard | `https://dashboard.stripe.com/test` |

---

## Checklist Before Go-Live

- [ ] `SUPABASE_SERVICE_ROLE_KEY` filled in `.env.production`
- [ ] Stripe test keys configured
- [ ] Stripe products + price IDs created
- [ ] `NEXT_PUBLIC_APP_URL` set to real domain/IP
- [ ] All 26 migrations applied to production Supabase
- [ ] `documents` storage bucket created (public)
- [ ] Stripe webhook endpoint registered
- [ ] `STRIPE_WEBHOOK_SECRET` filled in `.env.production`
- [ ] E2E tests pass locally (`pnpm exec playwright test`)
- [ ] Health check returns 200 after deploy
- [ ] (Optional) SSL configured via Certbot
