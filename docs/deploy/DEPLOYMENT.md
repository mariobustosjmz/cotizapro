# CotizaPro Deployment Guide

Complete deployment checklist for CotizaPro to Vercel with Supabase backend.

## Pre-Deployment Checklist

### 1. Code Quality & Security

- [ ] Run security review: `/code-review`
- [ ] Fix all CRITICAL and HIGH security issues
- [ ] Run TypeScript type check: `npm run type-check`
- [ ] Run linter: `npm run lint`
- [ ] Fix all linting errors and warnings

### 2. Testing

- [ ] Run unit tests: `npm run test`
- [ ] Verify 80%+ code coverage: `npm run test:coverage`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Verify critical user journeys pass:
  - [ ] Authentication flow (signup, login, logout)
  - [ ] Client CRUD operations
  - [ ] Quote creation with line items
  - [ ] Reminder creation
  - [ ] Analytics dashboard loads

### 3. Build Verification

- [ ] Run production build: `npm run build`
- [ ] Verify build succeeds without errors
- [ ] Check build output for warnings
- [ ] Verify bundle sizes are acceptable (<1MB total)

### 4. Environment Variables

- [ ] Copy `.env.example` to create production environment variables list
- [ ] Generate production secrets:
  - [ ] `CRON_SECRET` (min 32 characters): `openssl rand -hex 32`
  - [ ] Stripe webhook secret (from Stripe Dashboard)
  - [ ] Resend API key (from Resend Dashboard)
  - [ ] Twilio credentials (from Twilio Console)

### 5. Database Setup (Supabase)

- [ ] Create production Supabase project
- [ ] Run migrations on production database:
  ```bash
  npx supabase db push
  ```
- [ ] Verify RLS policies are enabled on all tables
- [ ] Test database connection with Supabase client
- [ ] Set up database backups (automatic in Supabase)

### 6. Third-Party Services

#### Stripe Setup
- [ ] Create Stripe production account
- [ ] Create products and prices in Stripe Dashboard
- [ ] Update `STRIPE_*_PRICE_ID` environment variables
- [ ] Configure webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
- [ ] Enable webhook events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

#### Resend (Email) Setup
- [ ] Create Resend account
- [ ] Verify sending domain
- [ ] Generate API key
- [ ] Set `EMAIL_FROM` with verified domain
- [ ] Test email delivery in production

#### Twilio (WhatsApp) Setup
- [ ] Create Twilio account
- [ ] Set up WhatsApp Business Profile
- [ ] Get WhatsApp-enabled phone number
- [ ] Configure `TWILIO_WHATSAPP_FROM` number
- [ ] Test WhatsApp delivery in production

---

## Vercel Deployment Steps

### 1. Repository Setup

```bash
# Initialize git repository (if not already)
git init
git add .
git commit -m "chore: prepare for production deployment"

# Create GitHub repository and push
git remote add origin https://github.com/your-org/cotizapro.git
git branch -M main
git push -u origin main
```

### 2. Vercel Project Setup

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 3. Environment Variables Configuration

Add all environment variables from `.env.example` to Vercel:

**Vercel Dashboard → Settings → Environment Variables**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Email (Resend)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=CotizaPro <noreply@cotizapro.com>

# Cron Job Security
CRON_SECRET=your-production-secret-min-32-chars
```

**Important**: Set environment variables for all environments:
- Production
- Preview
- Development

### 4. Custom Domain Setup (Optional)

1. Go to **Vercel Dashboard → Domains**
2. Add your custom domain (e.g., `app.cotizapro.com`)
3. Configure DNS records as instructed by Vercel
4. Wait for DNS propagation (up to 48 hours)
5. Update `NEXT_PUBLIC_APP_URL` to your custom domain

### 5. Cron Jobs Configuration

Vercel automatically detects `vercel.json` and sets up cron jobs.

Verify in **Vercel Dashboard → Settings → Cron Jobs**:
- Path: `/api/cron/reminders-check`
- Schedule: `0 9 * * *` (9 AM daily)

### 6. Deploy

```bash
# Option 1: Deploy via Vercel CLI
npm i -g vercel
vercel --prod

# Option 2: Deploy via GitHub push (automatic)
git push origin main
```

### 7. Post-Deployment Verification

Verify deployment at: `https://your-domain.vercel.app`

---

## Post-Deployment Checklist

### 1. Smoke Tests

- [ ] Visit production URL: `https://your-domain.vercel.app`
- [ ] Landing page loads correctly
- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Dashboard loads after authentication

### 2. Critical Functionality Tests

- [ ] Create a test client
- [ ] Create a test quote
- [ ] Send quote via email (verify receipt)
- [ ] Send quote via WhatsApp (verify receipt)
- [ ] Create a follow-up reminder
- [ ] View analytics dashboard (verify data loads)
- [ ] Export CSV (verify download)
- [ ] Export PDF (verify generation)

### 3. Integration Tests

#### Stripe Webhook Testing
```bash
# Test webhook with Stripe CLI
stripe listen --forward-to https://your-domain.vercel.app/api/webhooks/stripe
stripe trigger customer.subscription.created
```

- [ ] Verify subscription webhook received
- [ ] Verify database updated with subscription status
- [ ] Test subscription cancellation

#### Cron Job Testing
```bash
# Manually trigger cron job
curl -X POST https://your-domain.vercel.app/api/cron/reminders-check \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

- [ ] Verify reminders sent for due dates
- [ ] Check email delivery logs
- [ ] Check WhatsApp delivery logs

### 4. Performance Tests

- [ ] Run Lighthouse audit (target: 90+ score)
- [ ] Check Core Web Vitals in Vercel Analytics
- [ ] Monitor initial page load time (<3s)
- [ ] Verify API response times (<500ms)

### 5. Security Verification

- [ ] Verify HTTPS certificate is active
- [ ] Test authentication flows with invalid credentials
- [ ] Verify RLS policies block unauthorized access
- [ ] Test API rate limiting (make 100+ rapid requests)
- [ ] Verify cron job requires valid `CRON_SECRET`

### 6. Monitoring Setup

#### Vercel Analytics
- [ ] Enable Vercel Analytics in dashboard
- [ ] Monitor Web Vitals (LCP, FID, CLS)
- [ ] Set up alerts for performance degradation

#### Error Tracking (Recommended: Sentry)
```bash
npm install @sentry/nextjs
```

- [ ] Configure Sentry for error tracking
- [ ] Test error reporting
- [ ] Set up error alerts

#### Uptime Monitoring (Recommended: UptimeRobot)
- [ ] Add health check endpoint: `/api/health`
- [ ] Configure uptime monitoring (check every 5 min)
- [ ] Set up downtime alerts

### 7. Backup & Recovery

- [ ] Verify Supabase automatic backups are enabled
- [ ] Document recovery procedure
- [ ] Test database restore from backup (staging environment)

---

## Rollback Procedure

If deployment fails or critical bugs are discovered:

### 1. Immediate Rollback

**Via Vercel Dashboard:**
1. Go to **Deployments**
2. Find the last stable deployment
3. Click **⋯ → Promote to Production**

**Via Vercel CLI:**
```bash
vercel rollback
```

### 2. Fix & Redeploy

```bash
# Create hotfix branch
git checkout -b hotfix/critical-bug

# Fix the issue
# ...

# Test locally
npm run build
npm run test:e2e

# Commit and push
git add .
git commit -m "hotfix: critical bug description"
git push origin hotfix/critical-bug

# Merge to main and deploy
git checkout main
git merge hotfix/critical-bug
git push origin main
```

---

## Production Monitoring

### Daily Checks

- [ ] Review error logs in Vercel Dashboard
- [ ] Check Supabase Dashboard for database performance
- [ ] Review Stripe Dashboard for payment issues
- [ ] Monitor email delivery success rate (Resend)
- [ ] Monitor WhatsApp delivery success rate (Twilio)

### Weekly Checks

- [ ] Review analytics (user growth, conversion rates)
- [ ] Check database size and scaling needs
- [ ] Review API usage and rate limiting
- [ ] Check cron job execution logs

### Monthly Checks

- [ ] Security audit: review access logs
- [ ] Performance audit: Lighthouse scores
- [ ] Dependency updates: `npm outdated`
- [ ] Cost review: Vercel, Supabase, Stripe fees

---

## Scaling Considerations

### When to Scale

**Database Scaling (Supabase):**
- Upgrade plan when approaching connection limits
- Add read replicas for high-traffic read operations
- Consider connection pooling with Supabase Pooler

**Compute Scaling (Vercel):**
- Monitor Function execution time (<10s limit)
- Consider Edge Functions for global performance
- Upgrade plan for higher concurrent executions

**Email/SMS Scaling:**
- Resend: upgrade plan when approaching monthly limit
- Twilio: monitor credits, add auto-recharge

### Caching Strategy

Implement caching for frequently accessed data:
- Use React Server Components for automatic caching
- Implement Supabase query caching
- Consider Redis for session storage at scale

---

## Support & Maintenance

### Documentation Links

- [Vercel Deployment Docs](https://vercel.com/docs/deployments/overview)
- [Next.js Production Checklist](https://nextjs.org/docs/app/building-your-application/deploying/production-checklist)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Stripe Production Checklist](https://stripe.com/docs/development/checklist)

### Emergency Contacts

- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.com
- Stripe Support: https://support.stripe.com

---

## Deployment Completed

Once all checklists are complete:

- [ ] Document deployment date and version
- [ ] Share production URL with stakeholders
- [ ] Schedule training sessions for users
- [ ] Plan first feature iteration

**Production URL**: ___________________________

**Deployment Date**: ___________________________

**Version**: ___________________________

**Deployed By**: ___________________________
