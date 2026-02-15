# Stripe Billing Integration

Complete billing system for multi-tenant SaaS application with Stripe integration.

## Overview

The billing system includes:
- Subscription management (Free, Starter, Pro, Enterprise plans)
- Checkout flow with Stripe
- Customer portal for payment method management
- Webhook handling for subscription events
- Billing history and invoices
- Usage-based limits enforcement

## Setup Instructions

### 1. Stripe Configuration

Set up the following environment variables:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Price IDs (from Stripe Dashboard > Products)
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Create Stripe Products and Prices

In Stripe Dashboard:

1. Create products:
   - **Starter** ($29/month)
   - **Pro** ($99/month)
   - **Enterprise** (custom pricing)

2. Create monthly recurring prices for each product

3. Copy price IDs to environment variables

### 4. Database Setup

Run migrations to create required tables:

```bash
npx supabase migration up
```

This creates:
- `billing_history`: Track invoices and payments
- `webhook_events`: Idempotency for webhook processing

### 5. Webhook Endpoint Configuration

In Stripe Dashboard > Developers > Webhooks:

1. Add new endpoint:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `charge.refunded`

2. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 6. Local Testing

Use Stripe CLI to listen to webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret to your `.env.local`

## Architecture

### API Routes

#### POST `/api/billing/checkout`
Create a Stripe checkout session

Request:
```json
{
  "planId": "pro"
}
```

Response:
```json
{
  "sessionId": "cs_test_..."
}
```

#### POST `/api/billing/portal`
Create a billing portal session for payment management

Request:
```json
{
  "returnUrl": "https://..."
}
```

Response:
```json
{
  "url": "https://billing.stripe.com/..."
}
```

#### POST `/api/webhooks/stripe`
Handle Stripe webhook events (automatically called by Stripe)

### Database Schema

#### `billing_history`
Tracks all invoices and payments:
- `stripe_invoice_id`: Unique invoice identifier
- `amount`: Amount in cents
- `currency`: ISO currency code
- `status`: Invoice status (draft, open, paid, void, uncollectible, failed)
- `pdf_url`: Link to invoice PDF
- `created_at`, `paid_at`: Timestamps

#### `webhook_events`
Prevents duplicate webhook processing:
- `stripe_event_id`: Unique event identifier
- `event_type`: Type of event
- `data`: Full event payload
- `processed_at`: When it was processed

### Components

#### `PlanSelector`
Displays all available plans with features and upgrade/downgrade buttons.

```tsx
<PlanSelector
  currentPlan={currentPlan}
  onSelectPlan={handleSelectPlan}
  loading={loading}
/>
```

#### `BillingHistory`
Shows past invoices with download and view options.

```tsx
<BillingHistory />
```

### Helpers and Utilities

#### `getPlanLimits(planId)`
Get usage limits for a plan (projects, API calls)

#### `formatPrice(amount, currency)`
Format amount as currency string

#### `isSubscriptionActive(status)`
Check if subscription is active

#### `calculateTrialDaysRemaining(trialEndsAt)`
Calculate days left in trial period

#### `getPlanNameByPriceId(priceId)`
Map Stripe price ID to plan name

## Subscription States

| Status | Meaning | Action |
|--------|---------|--------|
| `trialing` | Trial period | Can upgrade/downgrade anytime |
| `active` | Active subscription | Normal usage |
| `past_due` | Payment failed | User must update payment method |
| `canceled` | Subscription canceled | Downgrade to free plan |
| `unpaid` | Invoice unpaid | Payment retry or cancel |

## Plan Features

### Free
- 3 projects
- 100 API calls/day
- Basic support

### Starter
- 10 projects
- 10,000 API calls/day
- Email support
- Team collaboration

### Pro
- Unlimited projects
- Unlimited API calls
- Priority support
- Advanced analytics
- Custom integrations

### Enterprise
- Everything in Pro
- Dedicated support
- SLA guarantee
- Custom contracts
- On-premise deployment

## Webhook Events Handled

### `customer.subscription.created`
Updates organization with new subscription and plan

### `customer.subscription.updated`
Updates subscription status and plan when user upgrades/downgrades

### `customer.subscription.deleted`
Downgrades organization to free plan when subscription canceled

### `invoice.paid`
Records successful payment in billing history

### `invoice.payment_failed`
Updates subscription status to past_due and records failed payment

### `charge.refunded`
Marks invoice as void when refunded

## Usage Enforcement

The application enforces plan limits via:

1. **Quota Checking**: Before allowing actions, check if user is within limits
2. **API Rate Limiting**: Stripe metadata contains organization limits
3. **UI Restrictions**: Dashboard shows current usage

Example:

```typescript
const { limits } = PLANS[currentPlan]

if (projectCount >= limits.projects && limits.projects !== -1) {
  // Show upgrade prompt
}

if (apiCallsToday >= limits.apiCalls && limits.apiCalls !== -1) {
  // Return 429 Too Many Requests
}
```

## Testing

### Manual Testing

1. Start local dev server:
   ```bash
   npm run dev
   ```

2. Listen to webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

3. Test checkout:
   - Go to `/dashboard/billing`
   - Select a plan
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete checkout

4. Test webhook:
   ```bash
   stripe trigger customer.subscription.updated
   ```

### E2E Testing

See `/e2e/billing.spec.ts` for complete test scenarios

## Common Issues

### Webhook signature verification failed
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Verify webhook endpoint is accessible
- Check clock skew (server time must be accurate)

### Customer already exists
- Stripe prevents duplicate customers with same email
- Handled automatically with upsert logic

### Invoice not showing in billing history
- Check webhook is configured correctly
- Verify `billing_history` table exists
- Check RLS policies allow service role

### Stripe customer ID is null
- First checkout creates the customer
- Free tier users have null customer ID until first upgrade

## Security Considerations

1. **RLS Policies**: All queries filtered by organization_id
2. **Webhook Verification**: All webhooks signature-verified
3. **Idempotency**: Webhook events processed only once
4. **Service Role**: Webhook handler uses service role for database access
5. **Secret Management**: All keys in environment variables

## Rate Limiting

Stripe webhook endpoint:
- No rate limit from Stripe side
- Implement exponential backoff for retries
- Maximum 3 retry attempts per event

## Troubleshooting

### Test webhook payload

```bash
stripe trigger customer.subscription.created \
  --add open_invoice.metadata.organization_id=12345
```

### View webhook logs

Stripe Dashboard > Developers > Webhooks > [Endpoint] > Logs

### Debug database triggers

```sql
SELECT * FROM billing_history
WHERE organization_id = 'your-org-id'
ORDER BY created_at DESC;
```

## References

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/customer-portal)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
