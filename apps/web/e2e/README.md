# E2E Tests for CotizaPro MVP

Comprehensive end-to-end test suite for the CotizaPro application using Playwright.

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Development server running on `http://localhost:3000`

### Installation

```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm run test:e2e

# Run with headed browser (see what's happening)
npm run test:e2e:headed

# Run in UI mode (interactive)
npm run test:e2e:ui

# Debug mode with inspector
npm run test:e2e:debug

# View HTML report
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── pages/                    # Page Object Models
│   ├── base.page.ts         # Base page class with common methods
│   ├── auth.page.ts         # Login, signup, password reset
│   ├── dashboard.page.ts    # Dashboard navigation
│   ├── clients.page.ts      # Client management
│   ├── quotes.page.ts       # Quote management
│   ├── team.page.ts         # Team member management
│   ├── billing.page.ts      # Billing and subscription
│   └── reminders.page.ts    # Reminders management
├── fixtures/                # Test data and utilities
│   ├── auth.fixture.ts      # Authentication helpers
│   └── data.fixture.ts      # Test data and generators
├── specs/                   # Test files
│   ├── 01-auth.spec.ts      # Authentication flow tests
│   ├── 02-dashboard.spec.ts # Dashboard navigation tests
│   ├── 03-clients.spec.ts   # Client management tests
│   ├── 04-quotes.spec.ts    # Quote management tests
│   ├── 05-team.spec.ts      # Team management tests
│   ├── 06-reminders.spec.ts # Reminders tests
│   └── 07-critical-journey.spec.ts # End-to-end user journeys
└── README.md               # This file
```

## Test Coverage

### 1. Authentication Flow (15 tests)
- User login with valid credentials
- User signup and account creation
- Password reset flow
- Email validation
- Session persistence
- Logout functionality
- Protected route access

### 2. Dashboard Navigation (15 tests)
- Dashboard page load and display
- Navigation to all dashboard sections
- Sidebar navigation
- User info display
- Stats cards
- Mobile responsive navigation

### 3. Client Management (18 tests)
- Create new client with all fields
- Create client with minimal fields
- View client list
- Search and filter clients
- Edit client details
- Delete client
- Client validation
- Empty state handling

### 4. Quote Management (17 tests)
- Create quote for client
- Add services to quote
- Calculate quote total
- View quote list
- Filter by status (draft, sent, accepted, rejected)
- Send quote via email
- Accept/reject quote
- Generate PDF preview
- Quote status tracking

### 5. Team Management (17 tests)
- View team members
- Invite team member
- Accept team invitation
- Update member role
- Remove team member
- Role-based access
- Invitation email sending

### 6. Reminders Management (16 tests)
- Create reminder
- Set due date
- View reminders list
- Mark as complete
- Delete reminder
- Filter reminders
- Reminder status tracking

### 7. Critical User Journey (11 tests)
- Complete login to logout flow
- Create client and view in list
- Navigate all dashboard sections
- Session persistence
- Page refresh handling
- Multi-step workflows
- Mobile viewport testing

**Total: 109 tests**

## Page Object Model Pattern

Each page has a dedicated class that encapsulates:
- Element selectors
- Navigation methods
- Form filling
- Data retrieval
- Assertions

### Example: Creating a Test

```typescript
import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { DashboardPage } from '../pages/dashboard.page'
import { testUsers } from '../fixtures/auth.fixture'

test('User can login and view dashboard', async ({ page }) => {
  const authPage = new AuthPage(page)
  const dashboardPage = new DashboardPage(page)

  // Navigate to login
  await authPage.goToLogin()
  expect(await authPage.isLoginPageVisible()).toBeTruthy()

  // Login
  await authPage.login(testUsers.owner.email, testUsers.owner.password)

  // Verify dashboard
  await dashboardPage.expectUrl('/dashboard')
  expect(await dashboardPage.isDashboardVisible()).toBeTruthy()
})
```

## Test Data

Test data is defined in `fixtures/data.fixture.ts`:

```typescript
testData.clients.acme           // ACME Corporation sample client
testData.clients.startup        // Startup sample client
testData.quotes.basic           // Basic quote template
testData.services.webDesign     // Web design service
testData.reminders.followUp     // Follow-up reminder
```

Data generators are available:
```typescript
generateRandomEmail()      // Generates unique email
generateClientName()       // Generates random client name
generateQuoteNumber()      // Generates quote number
formatCurrency()          // Formats as Mexican peso
```

## Fixtures and Utilities

### Authentication Fixture

```typescript
import { testUsers, loginAs, logout, ensureLoggedIn } from '../fixtures/auth.fixture'

// Login as specific user
await loginAs(page, testUsers.owner)
await loginAs(page, testUsers.admin)
await loginAs(page, testUsers.member)

// Clear session
await logout(page)

// Ensure logged in before test
await ensureLoggedIn(page, testUsers.owner)
```

## Configuration

Playwright configuration is in `playwright.config.ts`:

- **baseURL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Devices**: Desktop + Mobile Chrome
- **Reporters**: HTML, JSON, JUnit XML
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

## Running Tests in CI/CD

```bash
# Install Playwright browsers
npx playwright install

# Run tests in CI mode (single worker, with retries)
npm run test:e2e

# View results
npm run test:e2e:report
```

## Debugging Tests

### 1. Visual Debugging

```bash
npm run test:e2e:headed
```

This runs tests with the browser visible so you can see what's happening.

### 2. Step-by-Step Debugging

```bash
npm run test:e2e:debug
```

Opens the Playwright Inspector where you can step through tests.

### 3. Interactive UI Mode

```bash
npm run test:e2e:ui
```

Opens the Playwright UI with test timeline and browser preview.

### 4. Trace Viewer

View recorded traces for failed tests:

```bash
npx playwright show-trace trace.zip
```

## Common Issues

### Tests timeout

Increase timeout in `playwright.config.ts`:
```typescript
use: {
  navigationTimeout: 30000,
  actionTimeout: 10000,
}
```

### Dev server not running

Start the dev server in another terminal:
```bash
npm run dev
```

### Authentication fails

Ensure test users exist in Supabase:
- owner@example.com
- admin@example.com
- member@example.com

### Element not found

Check if the selector has changed:
1. Use `npm run test:e2e:headed` to see what's on screen
2. Update the selector in the Page Object Model
3. Re-run the test

### Flaky tests

Check for:
- Race conditions (use proper waits)
- Network timing issues (wait for networkidle)
- Element animations (wait for visibility)

## Best Practices

### 1. Use Page Object Models

✅ Good:
```typescript
const clientsPage = new ClientsPage(page)
await clientsPage.createClient(data)
```

❌ Bad:
```typescript
await page.locator('button').click()
await page.locator('input').fill(data)
```

### 2. Wait for Elements, Not Time

✅ Good:
```typescript
await page.waitForURL('**/dashboard/clients')
await locator.waitFor({ state: 'visible' })
```

❌ Bad:
```typescript
await page.waitForTimeout(2000)
```

### 3. Use Data Attributes for Selectors

✅ Good:
```typescript
page.locator('[data-testid="submit-button"]')
```

❌ Bad:
```typescript
page.locator('div.container > button:nth-child(3)')
```

### 4. Test User Flows, Not Implementation

✅ Good:
```typescript
await page.locator('button:has-text("Create Client")').click()
```

❌ Bad:
```typescript
await page.locator('.btn-primary').click()
```

### 5. Keep Tests Independent

✅ Good:
```typescript
test.beforeEach(async ({ page }) => {
  await loginAs(page, testUsers.owner)
})
```

❌ Bad:
```typescript
// Depending on previous test's state
```

## Test Reports

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

Reports include:
- Test results (passed/failed)
- Screenshots on failure
- Video recordings on failure
- Trace files for debugging
- Timing information

## Continuous Integration

The tests are configured to run in CI with:
- Single worker to avoid conflicts
- 2 retries for flaky tests
- Artifacts uploaded automatically
- JUnit XML report for CI integration

## Maintenance

### Adding New Tests

1. Create a new spec file in `e2e/specs/`
2. Import required page objects
3. Use `test.describe()` for grouping
4. Use `test.beforeEach()` for setup
5. Write clear test names

### Updating Page Objects

When the UI changes:
1. Update the selector in the corresponding Page Object
2. Update method names if behavior changed
3. Add new methods for new features
4. Keep methods focused and reusable

### Flaky Test Management

If a test is flaky:
1. Investigate the root cause
2. Use proper waits instead of timeouts
3. Increase timeout if external service is slow
4. Consider adding retries for that test
5. Document the issue with a TODO comment

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Test Runner](https://playwright.dev/docs/intro)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)

## Support

For issues or questions about the tests:
1. Check the debug output with `npm run test:e2e:headed`
2. Review the HTML report with `npm run test:e2e:report`
3. Use the Playwright inspector with `npm run test:e2e:debug`
4. Check this README for common issues

---

**Last Updated**: February 14, 2026

Generated with Claude Code - E2E Testing Specialist
