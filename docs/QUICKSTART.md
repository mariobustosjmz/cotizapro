# Quick Start Guide

Get your SaaS app running in under 10 minutes.

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Stripe account in test mode
- Code editor (VS Code recommended)

## Step 1: Install Dependencies (1 min)

```bash
cd my-saas-app
npm install
```

## Step 2: Configure Environment (2 min)

```bash
# Copy example env file
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

### Supabase Setup

1. Go to https://supabase.com/dashboard
2. Create new project
3. Go to Project Settings > API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role key → `SUPABASE_SERVICE_ROLE_KEY`

### Stripe Setup

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`

## Step 3: Setup Database (2 min)

### Option A: Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_ID

# Push migrations
npx supabase db push
```

### Option B: Manual (Copy-Paste)

1. Open Supabase Dashboard → SQL Editor
2. Copy content from `supabase/migrations/001_initial_schema.sql`
3. Paste and run in SQL Editor

## Step 4: Setup Stripe Webhook (2 min)

```bash
# Install Stripe CLI (if not installed)
# macOS: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook secret (starts with `whsec_`) to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Step 5: Create Stripe Products (3 min)

1. Go to https://dashboard.stripe.com/test/products
2. Create products:
   - **Starter Plan**: $29/month
   - **Pro Plan**: $99/month
   - **Enterprise Plan**: Custom pricing
3. Copy price IDs to `.env.local`:
   ```bash
   STRIPE_STARTER_PRICE_ID=price_...
   STRIPE_PRO_PRICE_ID=price_...
   STRIPE_ENTERPRISE_PRICE_ID=price_...
   ```

## Step 6: Run Development Server (1 min)

```bash
# Recommended: Use tmux for persistence
tmux new -s dev
npm run dev

# Or without tmux
npm run dev
```

Visit http://localhost:3000

## Step 7: Test the App (Optional)

### Create Test Account

1. Go to http://localhost:3000/signup
2. Create account with test email
3. Verify email in Supabase Dashboard → Authentication → Users
4. Login and explore dashboard

### Test Billing Flow

1. Go to Settings → Billing
2. Click "Upgrade to Pro"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Any future date, any CVC
5. Complete checkout
6. Verify subscription in dashboard

## Verification Checklist

- [ ] App loads at http://localhost:3000
- [ ] Can create account
- [ ] Can login
- [ ] Dashboard loads
- [ ] Can create project
- [ ] Stripe webhook receiving events
- [ ] No console errors

## Common Issues

### Port 3000 in use

```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

### Supabase connection error

- Verify `.env.local` has correct URL and keys
- Check Supabase project is active
- Ensure no typos in environment variables

### Stripe webhook not working

- Ensure `stripe listen` is running
- Verify webhook secret in `.env.local`
- Check webhook endpoint: http://localhost:3000/api/webhooks/stripe

### Database migration failed

```bash
# Reset database and try again
npx supabase db reset
npx supabase db push
```

## Next Steps

Now that your app is running:

1. **Read CLAUDE.md** - Understand project structure and guidelines
2. **Explore ECC Commands** - Try `/plan`, `/tdd`, `/code-review`
3. **Customize Features** - Add your business logic
4. **Run Tests** - `npm run test && npm run test:e2e`
5. **Deploy** - Follow deployment guide

## ECC Quick Commands

```bash
/plan "Add feature X"          # Plan feature implementation
/tdd                           # Start test-driven development
/code-review                   # Review your code
/security-scan                 # Security audit
/e2e                           # Generate E2E tests
```

## Resources

- **Full README**: See README.md for detailed documentation
- **Project Guidelines**: See CLAUDE.md for development standards
- **Contributing**: See CONTRIBUTING.md for contribution workflow
- **Troubleshooting**: See README.md troubleshooting section

---

**Time to first run: ~10 minutes**

**Got stuck?** Check the full README.md or use `/help` in Claude Code.
