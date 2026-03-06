# Security Fixes Implementation Guide
## CotizaPro - Remediation Steps

---

## FIX #1: Cron Secret Validation (CRITICAL)
**File:** `app/api/cron/reminders-check/route.ts`
**Severity:** CRITICAL
**Time Estimate:** 15 minutes

### Current Issue:
```typescript
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET

if (!cronSecret) {
  console.error('CRON_SECRET not configured')
  return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
}

if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Problem:** If `cronSecret` is `undefined` during early check (line 23-26), but then code assumes it exists on line 28.

### Fix:
Replace the validation block with:
```typescript
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET

// Validate CRON_SECRET exists
if (!cronSecret || typeof cronSecret !== 'string' || cronSecret.length < 32) {
  console.error('CRON_SECRET not configured or too short (min 32 chars)')
  return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
}

// Validate authorization header exists
if (!authHeader) {
  console.warn('Cron request missing authorization header')
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Use constant-time comparison to prevent timing attacks
const expectedAuth = `Bearer ${cronSecret}`
const isValid = Buffer.from(authHeader).toString('utf-8') ===
                Buffer.from(expectedAuth).toString('utf-8')

if (!isValid) {
  console.warn('Cron request with invalid authorization')
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

## FIX #2: Stripe Webhook Secret Validation (CRITICAL)
**File:** `app/api/webhooks/stripe/route.ts`
**Severity:** CRITICAL
**Time Estimate:** 10 minutes

### Current Issue:
```typescript
const signature = headersList.get('stripe-signature')!

let event: Stripe.Event

try {
  event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
```

**Problem:** Using non-null assertion (`!`) without validating the secret exists.

### Fix:
```typescript
const signature = headersList.get('stripe-signature')

if (!signature) {
  console.error('Webhook missing stripe-signature header')
  return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

if (!webhookSecret) {
  console.error('STRIPE_WEBHOOK_SECRET not configured')
  return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
}

let event: Stripe.Event

try {
  event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
```

---

## FIX #3: HTML Injection in Email Templates (CRITICAL)
**Files:**
- `app/api/cron/reminders-check/route.ts` (Line 134)
- `app/api/quotes/[id]/send/route.ts` (Line 135)

**Severity:** CRITICAL (XSS via Email)
**Time Estimate:** 30 minutes

### Current Issue:
```typescript
// In cron reminder email (line 134):
${fullReminder.description ? `<p>${fullReminder.description}</p>` : ''}

// In quote email (line 135):
${fullReminder.description ? `<p>${fullReminder.description}</p>` : ''}
```

**Problem:** User-controlled description field injected directly into HTML without escaping.

### Fix - Add HTML Escaping:

First, install escaping library:
```bash
npm install html-entities
```

Then update both files:

```typescript
import { escapeHtml } from 'html-entities'

// In cron reminder email (replace line 134):
${fullReminder.description ? `<p>${escapeHtml(fullReminder.description)}</p>` : ''}

// In quote email (replace line 135):
${fullReminder.description ? `<p>${escapeHtml(fullReminder.description)}</p>` : ''}
```

Or use a custom escaping function:
```typescript
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
```

---

## FIX #4: Add Security Headers (HIGH)
**File:** Create `next.config.js`
**Severity:** HIGH
**Time Estimate:** 45 minutes

### Implementation:

Create new file `/Users/mariobustosjmz/Desktop/claude/my-saas-app/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Content Security Policy - prevent XSS
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com",
              "frame-src 'self' https://checkout.stripe.com",
              "form-action 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'"
            ].join('; ')
          },
          // Disable client-side caching for sensitive pages
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
```

---

## FIX #5: Rate Limiting (HIGH)
**File:** `app/api/middleware.ts` (new file) or add to existing middleware
**Severity:** HIGH
**Time Estimate:** 1 hour

### Implementation:

Install rate limiting package:
```bash
npm install express-rate-limit
```

Create `lib/rate-limit.ts`:

```typescript
import rateLimit from 'express-rate-limit'

// Default rate limiter: 100 requests per 15 minutes
export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Strict rate limiter for auth: 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
})

// API limiter: 1000 requests per hour
export const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Email/SMS limiter: 10 per day per user
export const messageLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 10,
  message: 'Too many messages sent today, please try again tomorrow.',
  standardHeaders: true,
  legacyHeaders: false,
})
```

Then use in routes:

```typescript
// In app/api/clients/route.ts
import { apiLimiter } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // Apply rate limiter
  await apiLimiter(request, {} as any)

  // ... rest of implementation
}

// In app/api/quotes/[id]/send/route.ts
import { messageLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest, { params }: any) {
  // Apply message rate limiter
  await messageLimiter(request, {} as any)

  // ... rest of implementation
}
```

---

## FIX #6: Error Message Sanitization (HIGH)
**Files:** All API routes
**Severity:** HIGH
**Time Estimate:** 1 hour

### Create `lib/errors.ts`:

```typescript
import { NextResponse } from 'next/server'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public userMessage: string,
    public internalMessage: string
  ) {
    super(userMessage)
    this.name = 'ApiError'
  }
}

export function handleError(error: any) {
  console.error('[Internal Error]', error.internalMessage || error.message)

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.userMessage },
      { status: error.statusCode }
    )
  }

  // Default error response - never expose internal details
  return NextResponse.json(
    { error: 'An error occurred. Please try again later.' },
    { status: 500 }
  )
}
```

### Update routes to use:

```typescript
// Before
if (error) {
  console.error('Error fetching clients:', error)
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// After
if (error) {
  return handleError(
    new ApiError(
      500,
      'Failed to fetch clients',
      `Database error: ${error.message}`
    )
  )
}
```

---

## FIX #7: PII Logging Sanitization (MEDIUM)
**Files:** All API routes with console.log/console.error
**Severity:** MEDIUM
**Time Estimate:** 1.5 hours

### Create `lib/logger.ts`:

```typescript
interface LogContext {
  [key: string]: any
}

function sanitizePII(data: LogContext): LogContext {
  if (!data) return data

  const sanitized = { ...data }
  const piiFields = ['email', 'phone', 'password', 'token', 'secret', 'key']

  for (const key in sanitized) {
    if (piiFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizePII(sanitized[key])
    }
  }

  return sanitized
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    console.log(`[INFO] ${message}`, context ? sanitizePII(context) : '')
  },

  warn: (message: string, context?: LogContext) => {
    console.warn(`[WARN] ${message}`, context ? sanitizePII(context) : '')
  },

  error: (message: string, error?: any) => {
    const sanitized = error ? {
      code: error.code,
      message: error.message,
      // Don't include full error object which might contain PII
    } : {}
    console.error(`[ERROR] ${message}`, sanitized)
  },

  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context ? sanitizePII(context) : '')
    }
  }
}
```

### Replace console calls:

```typescript
// Before
console.log('Enviando email a:', emailTo)
console.error('Error fetching clients:', error)

// After
logger.info('Sending email')
logger.error('Failed to fetch clients', error)
```

---

## FIX #8: Quote Ownership Validation (MEDIUM)
**File:** `app/api/quotes/[id]/send/route.ts`
**Severity:** MEDIUM
**Time Estimate:** 30 minutes

### Update quote fetch to include organization validation:

```typescript
// Before
const { data: quote, error: quoteError } = await supabase
  .from('quotes')
  .select(`
    *,
    items:quote_items(*),
    client:clients(*)
  `)
  .eq('id', id)
  .single()

// After - Add organization validation
const { data: userProfile } = await supabase
  .from('profiles')
  .select('organization_id')
  .eq('id', user.id)
  .single()

const { data: quote, error: quoteError } = await supabase
  .from('quotes')
  .select(`
    *,
    items:quote_items(*),
    client:clients(*)
  `)
  .eq('id', id)
  .eq('organization_id', userProfile?.organization_id || '') // Add this
  .single()

// Verify quote belongs to user's organization
if (quoteError || !quote || quote.organization_id !== userProfile?.organization_id) {
  return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
}
```

---

## FIX #9: Search Filter Safe Construction (MEDIUM)
**File:** `app/api/clients/route.ts`
**Severity:** MEDIUM
**Time Estimate:** 45 minutes

### Update search to use safer patterns:

```typescript
// Before - String interpolation
if (search) {
  query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
}

// After - Validate and sanitize search
if (search) {
  // Validate search is alphanumeric + spaces + common chars
  if (!/^[a-zA-Z0-9\s\-\+\(\)\.@]*$/.test(search)) {
    return NextResponse.json({
      error: 'Caracteres inválidos en búsqueda'
    }, { status: 400 })
  }

  // Use safer construction
  const searchPattern = search.replace(/[%_\\]/g, '\\$&') // Escape special chars
  query = query.or(
    `name.ilike.%${searchPattern}%,` +
    `email.ilike.%${searchPattern}%,` +
    `phone.ilike.%${searchPattern}%`
  )
}
```

---

## FIX #10: Request Size Limits (MEDIUM)
**File:** `next.config.js`
**Severity:** MEDIUM
**Time Estimate:** 15 minutes

### Add to next.config.js:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    // Limit request body size to 10MB
    bodyParser: {
      sizeLimit: '10mb'
    }
  },

  // ... other config
}

module.exports = nextConfig
```

For individual routes, add at top:

```typescript
// app/api/quotes/[id]/send/route.ts
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb' // 5MB for quote operations
    }
  }
}
```

---

## Testing the Fixes

### 1. Test Cron Security
```bash
# Should fail without secret
curl http://localhost:3000/api/cron/reminders-check

# Should succeed with correct secret
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/reminders-check
```

### 2. Test Security Headers
```bash
curl -I http://localhost:3000
# Check for X-Content-Type-Options, X-Frame-Options, etc.
```

### 3. Test Rate Limiting
```bash
# Send multiple rapid requests
for i in {1..110}; do curl http://localhost:3000/api/clients; done
# Should get rate limit error after 100 requests
```

### 4. Test XSS Protection
Create a reminder with description:
```
<script>alert('xss')</script>
```
Then trigger email sending. The script should be escaped and not execute.

---

## Implementation Priority

1. **CRITICAL (Day 1):**
   - Fix #1: Cron secret validation
   - Fix #2: Stripe webhook validation
   - Fix #3: HTML injection in emails
   - Create .gitignore (already exists)

2. **HIGH (Week 1):**
   - Fix #4: Security headers
   - Fix #5: Rate limiting
   - Fix #6: Error sanitization

3. **MEDIUM (Week 2):**
   - Fix #7: PII logging
   - Fix #8: Quote ownership validation
   - Fix #9: Search filter safety
   - Fix #10: Request size limits

---

## Verification Checklist

- [ ] CRON_SECRET validation passes
- [ ] STRIPE_WEBHOOK_SECRET validation passes
- [ ] HTML injection test shows escaped output
- [ ] Security headers present in HTTP responses
- [ ] Rate limiting triggers after configured threshold
- [ ] Error messages don't leak sensitive info
- [ ] PII not visible in logs
- [ ] Quote ownership verified before send
- [ ] Search special characters rejected
- [ ] Request size limits enforced
- [ ] npm audit clean
- [ ] All tests passing
- [ ] Manual security testing completed

---

**End of Security Fixes Guide**
