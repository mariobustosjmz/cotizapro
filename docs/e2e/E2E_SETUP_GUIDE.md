# CotizaPro E2E Test Setup Guide

Complete guide to setting up and running the E2E test suite for CotizaPro MVP.

## Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- npm or yarn package manager
- Git
- A text editor or IDE

## Step 1: Installation

### 1.1 Install Dependencies

```bash
cd /Users/mariobustosjmz/Desktop/claude/my-saas-app

npm install
```

This installs all dependencies including:
- `@playwright/test` - E2E test framework
- All other project dependencies

### 1.2 Install Playwright Browsers

```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers used for testing.

## Step 2: Environment Setup

### 2.1 Create Test Users in Supabase

Before running tests, create the following test users in your Supabase dashboard:

1. Navigate to Supabase Dashboard
2. Go to Authentication > Users
3. Create three users:

| Email | Password | Role |
|-------|----------|------|
| owner@example.com | TestPassword123! | owner |
| admin@example.com | TestPassword123! | admin |
| member@example.com | TestPassword123! | member |

### 2.2 Verify Database Setup

Ensure your Supabase database has these tables:

- `auth.users` (Supabase auth)
- `profiles` (user profiles with organization_id and role)
- `clients` (client information)
- `quotes` (quote data)
- `services` (services offered)
- `team_members` (team management)
- `reminders` (follow-up reminders)
- `organizations` (organization/account)

### 2.3 Configure Environment

```bash
# Copy example env file
cp e2e/.env.example e2e/.env

# Edit with your values (if needed)
# Most defaults should work for local development
```

## Step 3: Start Development Server

The E2E tests need the app running locally.

### 3.1 Start Next.js Dev Server

Open a new terminal and run:

```bash
npm run dev
```

Expected output:
```
> next dev

  ▲ Next.js 16.1.6
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.3s
```

### 3.2 Verify Server is Running

```bash
# In another terminal
curl http://localhost:3000

# Should return HTML content
```

## Step 4: Run E2E Tests

### 4.1 Run All Tests

```bash
npm run test:e2e
```

**Expected Output:**
```
Running 109 tests using 1 worker

✓ Authentication Flow > User can navigate to login page (2s)
✓ Authentication Flow > User can navigate to signup page (1.5s)
✓ Dashboard Navigation > Dashboard page loads with correct title (3s)
...
```

### 4.2 Run Specific Test File

```bash
# Run only authentication tests
npx playwright test e2e/specs/01-auth.spec.ts

# Run only client management tests
npx playwright test e2e/specs/03-clients.spec.ts
```

### 4.3 Run Tests in Headed Mode (Visible Browser)

```bash
npm run test:e2e:headed
```

This opens a browser window where you can watch the tests run.

### 4.4 Run Tests in UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

Opens interactive test runner with:
- Test timeline
- Live browser preview
- Test filtering
- Debugging tools

### 4.5 Debug Mode (Step-by-Step)

```bash
npm run test:e2e:debug
```

Opens Playwright Inspector where you can:
- Step through tests line by line
- Set breakpoints
- Inspect elements
- Execute JavaScript in console

## Step 5: View Test Reports

After tests complete, view the HTML report:

```bash
npm run test:e2e:report
```

This opens a detailed report showing:
- Test results (✓ passed, ✗ failed)
- Screenshots on failure
- Video recordings on failure
- Execution time for each test
- Failure messages and stack traces

## Step 6: Troubleshooting

### Issue: Tests timeout waiting for elements

**Solution:**
1. Verify dev server is running: `curl http://localhost:3000`
2. Run in headed mode to see what's happening: `npm run test:e2e:headed`
3. Check if selectors are correct in page objects
4. Increase timeout in `playwright.config.ts`

### Issue: Authentication fails in tests

**Solution:**
1. Verify test users exist in Supabase
2. Verify users have correct password
3. Check if Supabase is running (for local development)
4. Clear browser storage: `page.context().clearCookies()`

### Issue: "Dev server not running" error

**Solution:**
```bash
# Make sure dev server is running in another terminal
npm run dev

# Or check if something is using port 3000
lsof -i :3000

# If port is in use, kill it:
kill -9 <PID>
```

### Issue: Playwright browsers not found

**Solution:**
```bash
# Reinstall browsers
npx playwright install

# Install system dependencies (Linux only)
npx playwright install-deps
```

### Issue: Tests are flaky (pass sometimes, fail sometimes)

**Solution:**
1. Run tests multiple times to confirm: `npm run test:e2e -- --repeat-each=5`
2. Use headed mode to see what's happening: `npm run test:e2e:headed`
3. Check for race conditions in code
4. Ensure proper waits are used (not just `waitForTimeout`)
5. Increase timeout values if external services are slow

### Issue: Cannot run tests on CI/CD

**Solution:**
```bash
# Install browsers for CI
npx playwright install --with-deps

# Run with correct environment
CI=true npm run test:e2e
```

## Test Organization

```
e2e/
├── specs/                      # Test files
│   ├── 01-auth.spec.ts         # Login, signup, password reset
│   ├── 02-dashboard.spec.ts    # Dashboard navigation
│   ├── 03-clients.spec.ts      # Client CRUD operations
│   ├── 04-quotes.spec.ts       # Quote management
│   ├── 05-team.spec.ts         # Team member management
│   ├── 06-reminders.spec.ts    # Reminders functionality
│   └── 07-critical-journey.spec.ts # End-to-end workflows
│
├── pages/                      # Page Object Models
│   ├── base.page.ts           # Common methods
│   ├── auth.page.ts           # Auth page methods
│   ├── dashboard.page.ts      # Dashboard methods
│   ├── clients.page.ts        # Client page methods
│   ├── quotes.page.ts         # Quote page methods
│   ├── team.page.ts           # Team page methods
│   ├── billing.page.ts        # Billing page methods
│   └── reminders.page.ts      # Reminders page methods
│
├── fixtures/                   # Test data and utilities
│   ├── auth.fixture.ts        # Auth helpers
│   ├── data.fixture.ts        # Test data
│   └── .env.example           # Configuration template
│
├── playwright.config.ts        # Playwright configuration
└── README.md                   # Detailed documentation
```

## Test Commands Reference

```bash
# Install and setup
npm install
npx playwright install

# Run tests
npm run test:e2e                # All tests
npm run test:e2e:headed        # With visible browser
npm run test:e2e:ui            # Interactive mode
npm run test:e2e:debug         # Step-by-step debugging
npm run test:e2e:report        # View HTML report

# Run specific tests
npx playwright test e2e/specs/01-auth.spec.ts
npx playwright test e2e/specs/03-clients.spec.ts

# Run with filters
npx playwright test -g "User can login"
npx playwright test -g "Client"

# Check for flakiness
npx playwright test --repeat-each=3

# List available tests
npx playwright test --list

# Update snapshots
npx playwright test --update-snapshots
```

## Development Workflow

### 1. Write a New Test

```bash
# Create new spec file
touch e2e/specs/08-new-feature.spec.ts
```

```typescript
import { test, expect } from '@playwright/test'
import { YourPage } from '../pages/your.page'

test.describe('New Feature', () => {
  test('does something', async ({ page }) => {
    const yourPage = new YourPage(page)

    // Your test code
    expect(true).toBeTruthy()
  })
})
```

### 2. Run and Debug

```bash
# Run just your new test
npx playwright test e2e/specs/08-new-feature.spec.ts

# Debug it
npm run test:e2e:debug
```

### 3. View Results

```bash
# See detailed report
npm run test:e2e:report
```

## Best Practices

### 1. Always Use Page Object Models

Instead of:
```typescript
await page.locator('button').click()
```

Use:
```typescript
const clientsPage = new ClientsPage(page)
await clientsPage.clickCreateButton()
```

### 2. Wait for Elements, Not Time

Instead of:
```typescript
await page.waitForTimeout(2000)
```

Use:
```typescript
await page.waitForURL('**/dashboard/clients')
await locator.waitFor({ state: 'visible' })
```

### 3. Use Meaningful Test Names

Instead of:
```typescript
test('test 1', async () => { })
```

Use:
```typescript
test('User can create a new client and see it in the list', async () => { })
```

### 4. Keep Tests Independent

Each test should:
- Set up its own data
- Clean up after itself
- Not depend on other tests

### 5. Test User Behavior, Not Implementation

Instead of:
```typescript
await page.locator('.btn-primary').click()
```

Use:
```typescript
await page.locator('button:has-text("Create Client")').click()
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Scheduled daily runs

### CI Configuration

```bash
# .github/workflows/e2e.yml
name: E2E Tests
on: [pull_request, push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm install

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start server
        run: npm run dev &

      - name: Run tests
        run: npm run test:e2e

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Support and Resources

- **Playwright Docs**: https://playwright.dev
- **Test Best Practices**: https://playwright.dev/docs/best-practices
- **Page Object Model**: https://playwright.dev/docs/pom
- **Debugging**: https://playwright.dev/docs/debug

## Next Steps

1. Complete the setup steps above
2. Run tests: `npm run test:e2e`
3. View reports: `npm run test:e2e:report`
4. Add more tests as features are added
5. Integrate with CI/CD pipeline

---

**Setup Status Checklist:**

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Playwright browsers installed (`npx playwright install`)
- [ ] Test users created in Supabase
- [ ] Database tables verified
- [ ] Dev server running (`npm run dev`)
- [ ] Tests execute successfully (`npm run test:e2e`)
- [ ] Reports generate (`npm run test:e2e:report`)

**Completion Date**: ________________

---

Generated with Claude Code - E2E Testing Specialist
February 14, 2026
