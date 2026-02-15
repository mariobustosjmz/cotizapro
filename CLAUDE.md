# My SaaS App — Enterprise Project Configuration

> Full-stack SaaS application with Authentication, Billing, Multi-tenancy, and Real-time features
> Built with Next.js 15, TypeScript, Supabase, Stripe, and Everything Claude Code (ECC)

## Project Overview

**Stack:** Next.js 15 (App Router), TypeScript 5.x, React 19, Supabase (Auth + DB + Realtime), Stripe (Billing), TailwindCSS 3.x, Playwright (E2E)

**Architecture:**
- Server Components by default (zero client JS unless interactive)
- Client Components only for interactivity (`'use client'` directive)
- API routes for webhooks and external integrations
- Server Actions for mutations and data fetching
- Row-Level Security (RLS) for multi-tenant data isolation

**Features:**
- ✅ Authentication & Authorization (JWT, RLS, role-based access)
- ✅ Billing & Subscriptions (Stripe integration, webhooks, usage limits)
- ✅ Multi-tenancy (Organizations, teams, invitations)
- ✅ Real-time Features (SSE, WebSockets via Supabase Realtime)

---

## Critical Rules

### Database (Supabase + PostgreSQL)

- **RLS Enabled**: All queries use Supabase client with Row-Level Security — NEVER bypass RLS
- **Migrations Only**: All schema changes in `supabase/migrations/` — NEVER modify database directly
- **Explicit Columns**: Use `select()` with explicit column lists, NEVER `select('*')`
- **Bounded Queries**: All user-facing queries MUST include `.limit()` to prevent unbounded results
- **Indexes**: Add indexes for frequently queried columns (user_id, organization_id, created_at)
- **Transactions**: Use transactions for multi-step operations

### Authentication & Authorization

- **Server Components**: Use `createServerClient()` from `@supabase/ssr`
- **Client Components**: Use `createBrowserClient()` from `@supabase/ssr`
- **Protected Routes**: Check `getUser()` — NEVER trust `getSession()` alone
- **Middleware**: `middleware.ts` refreshes auth tokens on every request
- **Role-Based Access**: Enforce roles (owner, admin, member, viewer) at DB level with RLS
- **JWT Validation**: Validate JWT claims for organization_id, role, user_id

### Billing & Subscriptions (Stripe)

- **Webhook Handler**: `app/api/webhooks/stripe/route.ts` for all Stripe events
- **Server-Side Pricing**: NEVER trust client-side price data — always fetch from Stripe
- **Subscription Status**: Synced via webhook to `subscription_status` column
- **Usage Limits**: Free tier: 3 projects, 100 API calls/day | Pro: unlimited
- **Idempotency**: Handle duplicate webhook events with idempotency keys

### Multi-Tenancy

- **Organization Isolation**: All tables have `organization_id` foreign key
- **RLS Policies**: Enforce `organization_id = auth.jwt()->>'organization_id'`
- **Team Invitations**: Email-based invitations with expiration (7 days)
- **Role Hierarchy**: owner > admin > member > viewer
- **Cascading Deletes**: Deleting organization deletes all related data

### Real-time Features

- **Supabase Realtime**: Subscribe to table changes for live updates
- **SSE (Server-Sent Events)**: For long-running operations (AI, exports)
- **WebSocket Fallback**: Use Supabase Realtime channels
- **Optimistic Updates**: Update UI immediately, reconcile on server response

### Code Style

- **No Emojis**: NEVER use emojis in code or comments
- **Immutability**: Spread operator, NEVER mutate objects/arrays
- **Server Components**: No `'use client'`, no `useState`/`useEffect`
- **Client Components**: `'use client'` at top, minimal — extract logic to hooks
- **Zod Validation**: All input validation (API routes, forms, env vars)
- **TypeScript Strict**: No `any`, no implicit types, strict mode enabled
- **Error Handling**: Try/catch for async operations, typed error responses

---

## File Structure

```
my-saas-app/
├── app/
│   ├── (auth)/                    # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   └── forgot-password/
│   ├── (dashboard)/               # Protected dashboard pages
│   │   ├── projects/
│   │   ├── settings/
│   │   ├── billing/
│   │   └── team/
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── stripe/           # Stripe webhook handler
│   │   │   └── supabase/         # Supabase webhook handler
│   │   ├── auth/                 # Auth API routes
│   │   └── billing/              # Billing API routes
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # Shadcn/ui components
│   ├── forms/                    # Form components with validation
│   └── dashboard/                # Dashboard-specific components
├── hooks/                        # Custom React hooks
├── lib/
│   ├── supabase/                 # Supabase client factories
│   ├── stripe/                   # Stripe client and helpers
│   └── utils/                    # General utilities
├── types/                        # Shared TypeScript types
├── supabase/
│   ├── migrations/               # Database migrations
│   └── seed.sql                  # Development seed data
├── .claude/                      # Claude Code configuration
│   ├── agents/                   # Specialized subagents (13)
│   ├── skills/                   # Workflow definitions (37)
│   ├── commands/                 # Slash commands (31)
│   ├── rules/                    # Always-follow guidelines
│   │   ├── common/               # Language-agnostic
│   │   └── typescript/           # TypeScript-specific
│   ├── scripts/                  # Hook scripts
│   └── settings.json             # Claude Code settings
├── CLAUDE.md                     # This file — project instructions
├── README.md                     # Project documentation
└── package.json
```

---

## Key Patterns

### API Response Format

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
```

### Server Action Pattern

```typescript
'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

const schema = z.object({
  name: z.string().min(1).max(100),
})

export async function createProject(formData: FormData) {
  // 1. Validate input
  const parsed = schema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() }
  }

  // 2. Authenticate user
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // 3. Get organization from JWT
  const orgId = user.user_metadata.organization_id
  if (!orgId) return { success: false, error: 'No organization' }

  // 4. Execute query (RLS enforces organization_id)
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: parsed.data.name,
      organization_id: orgId,
      created_by: user.id
    })
    .select('id, name, created_at')
    .single()

  if (error) return { success: false, error: 'Failed to create project' }
  return { success: true, data }
}
```

### Supabase Client Factory

```typescript
// Server Component
import { createServerClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createServerClient()
  const { data } = await supabase.from('projects').select('*').limit(10)
  return <ProjectList projects={data} />
}

// Client Component
'use client'
import { createBrowserClient } from '@/lib/supabase/client'

export function ClientComponent() {
  const supabase = createBrowserClient()
  const [data, setData] = useState([])

  useEffect(() => {
    supabase.from('projects').select('*').limit(10).then(({ data }) => setData(data))
  }, [])

  return <div>{data.map(...)}</div>
}
```

### Stripe Webhook Handler

```typescript
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServerClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription
      await supabase
        .from('organizations')
        .update({
          subscription_status: subscription.status,
          plan: subscription.items.data[0].price.id
        })
        .eq('stripe_customer_id', subscription.customer)
      break

    case 'customer.subscription.deleted':
      await supabase
        .from('organizations')
        .update({ subscription_status: 'canceled', plan: 'free' })
        .eq('stripe_customer_id', event.data.object.customer)
      break
  }

  return Response.json({ received: true })
}
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Server-only

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Database Schema

### Core Tables

```sql
-- Organizations (multi-tenancy root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_status TEXT DEFAULT 'trialing',
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (example multi-tenant table)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects in their organization"
  ON projects FOR SELECT
  USING (organization_id = auth.jwt()->>'organization_id');

CREATE POLICY "Users can create projects in their organization"
  ON projects FOR INSERT
  WITH CHECK (organization_id = auth.jwt()->>'organization_id');
```

---

## Testing Strategy

### Unit Tests (Vitest)
```bash
npm run test              # Run all unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report (80%+ required)
```

### E2E Tests (Playwright)
```bash
/e2e                      # Generate E2E tests with ECC
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Run with UI
```

### Critical E2E Flows

1. **Auth Flow**: Sign up → email verification → first project creation
2. **Dashboard Flow**: Login → dashboard → CRUD operations
3. **Billing Flow**: Upgrade plan → Stripe checkout → subscription active
4. **Webhook Flow**: Subscription canceled → downgrade to free tier
5. **Multi-tenant Flow**: Create organization → invite team → role permissions

---

## ECC Workflow (Everything Claude Code)

### Planning a Feature
```bash
/plan "Add team invitations with email notifications"
```

### Developing with TDD
```bash
/tdd                      # Enforces test-first development
```

### Before Committing
```bash
/code-review              # Quality & security review
/security-scan            # OWASP Top 10 audit
```

### Before Release
```bash
/e2e                      # Generate E2E tests
/test-coverage            # Verify 80%+ coverage
/update-docs              # Update documentation
```

### Multi-Agent Workflows
```bash
/multi-plan               # Collaborative planning with multiple agents
/multi-execute            # Parallel execution of independent tasks
```

### Debugging
```bash
/build-fix                # Fix build errors
/go-review                # Code review (if using Go backend)
/refactor-clean           # Remove dead code
```

---

## ECC Agents Available

The project includes 13 specialized agents in `.claude/agents/`:

- **planner.md** — Feature implementation planning
- **architect.md** — System design decisions
- **tdd-guide.md** — Test-driven development
- **code-reviewer.md** — Quality/security review
- **security-reviewer.md** — Vulnerability analysis
- **build-error-resolver.md** — Fix build errors
- **e2e-runner.md** — Playwright E2E testing
- **refactor-cleaner.md** — Dead code cleanup
- **doc-updater.md** — Documentation sync
- **database-reviewer.md** — Database/Supabase review
- **python-reviewer.md** — Python code review
- **go-reviewer.md** — Go code review
- **go-build-resolver.md** — Go build error resolution

---

## ECC Skills Available

37 skills in `.claude/skills/` including:

### Core Development
- `tdd-workflow` — Test-driven development methodology
- `coding-standards` — TypeScript/React best practices
- `verification-loop` — Continuous verification

### Frontend
- `frontend-patterns` — React/Next.js patterns
- `e2e-testing` — Playwright patterns

### Backend
- `backend-patterns` — API, database, caching
- `api-design` — REST API design
- `database-migrations` — Migration patterns

### DevOps
- `deployment-patterns` — CI/CD, Docker, health checks
- `docker-patterns` — Docker Compose, networking

### Security
- `security-review` — Security checklist
- `security-scan` — AgentShield integration

### Learning
- `continuous-learning-v2` — Instinct-based learning
- `iterative-retrieval` — Progressive context refinement

---

## Git Workflow

### Commit Format
```
feat: add team invitation system
fix: resolve Stripe webhook timeout
refactor: extract auth logic to hooks
docs: update API documentation
test: add E2E tests for billing flow
```

### Branch Strategy
- `main` — Production-ready code
- `develop` — Development branch
- `feature/*` — Feature branches
- `fix/*` — Bug fix branches

### CI/CD Pipeline
1. Lint (ESLint)
2. Type-check (TypeScript)
3. Unit tests (Vitest)
4. E2E tests (Playwright)
5. Build (Next.js)
6. Deploy (Vercel preview on PR, production on merge to main)

---

## Development Commands

```bash
# Development
npm run dev               # Start dev server (use in tmux!)
npm run build             # Production build
npm run start             # Start production server

# Testing
npm run test              # Unit tests
npm run test:e2e          # E2E tests
npm run test:coverage     # Coverage report

# Code Quality
npm run lint              # ESLint
npm run type-check        # TypeScript check
npm run format            # Prettier format

# Database
npm run db:push           # Push schema changes
npm run db:reset          # Reset local database
npm run db:migrate        # Run migrations

# Stripe
npm run stripe:listen     # Listen to webhooks locally
```

---

## Token Optimization (ECC)

The project is configured for optimal Claude Code token usage:

**Settings** (`.claude/settings.json`):
- `model: "sonnet"` — 60% cost reduction vs Opus
- `MAX_THINKING_TOKENS: "10000"` — 70% reduction in hidden thinking cost
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "50"` — Compact earlier for better quality

**Workflow Tips**:
- Use `/clear` between unrelated tasks
- Use `/compact` at logical breakpoints (after research, before implementation)
- Use `/cost` to monitor spending
- Switch to Opus only for deep architectural reasoning: `/model opus`

---

## Project Status

**Current Phase**: Initial Setup ✅

**Completed**:
- ✅ Next.js 15 project initialized
- ✅ ECC components installed (agents, skills, rules, commands)
- ✅ Hooks configured
- ✅ Project structure created
- ✅ CLAUDE.md configuration

**Next Steps**:
1. Configure Supabase (database, auth, RLS)
2. Set up Stripe (billing, webhooks)
3. Implement authentication flow
4. Build multi-tenancy system
5. Add real-time features

---

## Important Notes

### SOLID Principles
- **S**ingle Responsibility: One class/function = one purpose
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable
- **I**nterface Segregation: Many specific interfaces > one general
- **D**ependency Inversion: Depend on abstractions, not concretions

### Code Quality Targets
- **Test Coverage**: 80%+ required
- **TypeScript**: Strict mode, no `any`
- **Component Size**: Max 400 lines (extract if larger)
- **Function Size**: Max 50 lines
- **Cyclomatic Complexity**: Max 10

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Lighthouse Score**: > 90

---

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **ECC Guide**: https://github.com/affaan-m/everything-claude-code
- **Claude Code Docs**: https://code.claude.com/docs

---

*This configuration is powered by Everything Claude Code (ECC) — production-ready agents, skills, and workflows for Claude Code.*

*Last Updated: February 12, 2026*
