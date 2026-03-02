# E2E Test Execution Guide

## Project: CotizaPro SaaS Application
## Date: February 14, 2026
## Test Framework: Playwright

---

## Executive Summary

This guide provides comprehensive instructions for executing the E2E test suite for CotizaPro, a multi-tenant SaaS application for quote management.

**Test Suite Overview:**
- Total Tests: 109+ comprehensive scenarios
- Browsers Tested: Chromium, Firefox, WebKit
- Coverage: Critical user journeys, CRUD operations, multi-tenancy, analytics
- Estimated Runtime: 15-20 minutes (headless)

---

## Test Scenarios Covered

### 1. Authentication Flow (15 tests)

**Objective**: Verify secure user authentication and session management

**Test Cases:**
- Login with valid credentials
- Login with invalid credentials
- Signup with new account and organization
- Email validation
- Password field masking
- Forgot password flow
- Session persistence across page reloads
- Protected route redirection
- Logout functionality
- Login form validation

**Key Assertions:**
- User redirected to dashboard after successful login
- Unauthenticated users redirected away from protected routes
- Session cookies properly set and cleared
- Password field type="password"

---

### 2. Client Management (18 tests)

**Objective**: Verify complete CRUD operations for clients

**Test Cases:**
- Create client with all fields (name, email, phone, company, address, tags)
- Create client with minimal fields
- View clients list with pagination
- Search/filter clients by name
- Update client information
- Delete client with confirmation
- Bulk operations (if applicable)
- Empty state when no clients
- Client total count updates
- Multi-tenant isolation verification

**Key Assertions:**
- Newly created clients appear in list
- Client counts update correctly
- Form validation (email format, phone format)
- Deleted clients removed from list
- Cross-organization isolation enforced

---

### 3. Quote Management (17+ tests)

**Objective**: Verify quote creation, modification, and tracking

**Test Cases:**
- Create quote with client selection
- Add multiple line items with services
- Automatic total calculation
- Update quote details
- Delete quote with confirmation
- Filter quotes by status (draft, sent, accepted, rejected)
- Send quote via email
- Generate PDF preview
- View quote details
- Quote status transition workflow
- Pagination in quote list

**Key Assertions:**
- Quote total = sum of all line items (quantity × price)
- Status badges display correctly
- Line items persist after save
- Client information correctly associated
- Quote PDF generated successfully

---

### 4. Analytics Dashboard (8+ tests)

**Objective**: Verify real-time data display and calculations

**Test Cases:**
- Dashboard stats load (total quotes, clients, revenue)
- Quote status breakdown chart renders
- Client metrics displayed
- Revenue analytics calculated
- Data refreshes on new entries
- Stats reflect organization data only
- Charts responsive on mobile

**Key Assertions:**
- Stats cards show numeric values
- Charts render without errors
- Data is accurate based on created records
- No cross-organization data visible

---

### 5. Follow-up Reminders (16+ tests)

**Objective**: Verify reminder creation, scheduling, and management

**Test Cases:**
- Create reminder with title and due date
- Set recurrence pattern
- Reminders appear in list
- Mark reminder as completed
- Edit reminder details
- Delete reminder
- Snooze reminder (postpone)
- Filter by status (pending, completed, overdue)
- Due date validation
- Search reminders

**Key Assertions:**
- Reminders display in correct order
- Status changes persist
- Overdue reminders highlighted
- Deleted reminders removed from list

---

### 6. Multi-Tenant Data Isolation (5+ tests)

**Objective**: Verify security and data isolation between organizations

**Test Cases:**
- Create multiple organizations
- User A cannot see User B's data
- API returns 403/404 for cross-org access
- Database Row-Level Security enforced
- Organization context in JWT verified

**Key Assertions:**
- Clients list only shows current org's clients
- Quotes filtered by organization_id
- API endpoints reject unauthorized requests
- RLS policies prevent data leakage

---

### 7. Critical User Journey - End-to-End (11+ tests)

**Objective**: Verify complete workflow from signup to data creation

**Test Cases:**
- Sign up new account with organization
- Complete onboarding (if applicable)
- Create first client
- Add services to catalog
- Create quote with line items for client
- View quote in dashboard
- Set follow-up reminder for client
- Verify all data persisted
- Session maintained across operations
- Mobile viewport testing
- Logout and re-login

**Key Assertions:**
- All created data persists across sessions
- User journey completes without errors
- Mobile interface functions properly
- Data consistency maintained

---

## Pre-Execution Checklist

### Environment Setup

- [ ] Node.js 18+ installed
- [ ] npm dependencies installed: `npm install`
- [ ] Playwright browsers installed: `npx playwright install`
- [ ] Development server running: `npm run dev`
- [ ] Supabase running locally (if needed)
- [ ] Test users seeded in database:
  - [ ] owner@example.com / TestPassword123!
  - [ ] admin@example.com / TestPassword123!
  - [ ] member@example.com / TestPassword123!

### Configuration

- [ ] `.env` or `.env.local` configured with:
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY (for cleanup)
- [ ] `playwright.config.ts` baseURL set to `http://localhost:3000`
- [ ] Network connectivity verified

---

## Test Execution

### Quick Start (All Tests)

```bash
# Run all tests in headless mode
npm run test:e2e

# Expected output: PASSED (95+ tests should pass)
# Runtime: 15-20 minutes
```

### Running Specific Test Suites

```bash
# Authentication tests only
npx playwright test 01-auth.spec.ts

# Client management tests
npx playwright test 03-clients.spec.ts

# Quote management tests
npx playwright test 04-quotes.spec.ts

# Critical user journey (recommended)
npx playwright test 07-critical-journey.spec.ts

# Multiple specific files
npx playwright test 01-auth.spec.ts 03-clients.spec.ts
```

### Visual Testing (Headed Mode)

```bash
# See the browser while tests run
npm run test:e2e:headed

# Useful for:
# - Debugging failed tests
# - Observing user interactions
# - Validating UI changes
```

### Interactive Testing (UI Mode)

```bash
# Open Playwright UI with test timeline
npm run test:e2e:ui

# Features:
# - Run/pause tests
# - Step through actions
# - View DOM snapshots
# - Inspect locators
```

### Debug Mode (Inspector)

```bash
# Step through tests with Playwright Inspector
npm run test:e2e:debug

# Features:
# - Set breakpoints
# - Execute actions step-by-step
# - Inspect page state
# - Modify selectors on-the-fly
```

---

## Test Reports

### View HTML Report

```bash
npm run test:e2e:report

# Opens: playwright-report/index.html
```

**Report includes:**
- Pass/fail status for each test
- Screenshots of failures
- Video recordings of failures
- Trace files for debugging
- Execution time per test
- Browser-specific results

### JUnit XML Report

Generated at: `test-results/junit.xml`

Use for CI/CD integration:
```yaml
# GitHub Actions example
- name: Publish test results
  uses: EnricoMi/publish-unit-test-result-action@v2
  with:
    files: test-results/junit.xml
```

### JSON Results

Generated at: `test-results/results.json`

Programmatic access to:
- Test status
- Durations
- Error messages
- Platform info

---

## Continuous Integration Setup

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start dev server
        run: npm run dev &

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## Troubleshooting

### Tests Timeout

**Symptom**: Tests fail with "Timeout of XXXms exceeded"

**Solutions:**
```bash
# Increase global timeout
npx playwright test --timeout=60000

# Or modify playwright.config.ts:
use: {
  navigationTimeout: 30000,
  actionTimeout: 15000,
}
```

### Dev Server Not Starting

**Symptom**: "Failed to reach http://localhost:3000"

**Solutions:**
```bash
# Start dev server in separate terminal
npm run dev

# Or pre-start in config:
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: true,
}
```

### Authentication Failures

**Symptom**: Tests fail at login step

**Solutions:**
1. Verify test users exist in Supabase
2. Check credentials in `fixtures/auth.fixture.ts`
3. Verify database is seeded
4. Check Supabase connection in `.env`

### Flaky Tests

**Symptom**: Test passes sometimes, fails other times

**Common Causes:**
- Race conditions (use auto-waiting locators)
- Network timing (wait for networkidle)
- Animations (wait for state change)

**Solutions:**
```typescript
// Use proper waits
await page.waitForURL('**/dashboard')
await locator.waitFor({ state: 'visible' })
await page.waitForLoadState('networkidle')

// Avoid
await page.waitForTimeout(2000)
```

### Element Not Found

**Symptom**: "locator.click() target not found"

**Solutions:**
1. Run in headed mode to see actual page:
   ```bash
   npm run test:e2e:headed
   ```

2. Update selectors in Page Objects if UI changed

3. Use more robust selectors:
   ```typescript
   // Good: semantic selectors
   page.locator('button:has-text("Create")')
   page.locator('[data-testid="submit-button"]')

   // Avoid: brittle CSS selectors
   page.locator('div > button:nth-child(3)')
   ```

### Cross-Origin Issues

**Symptom**: Tests fail with CORS errors

**Solutions:**
```typescript
// Disable CORS checks in tests
context = await browser.newContext({
  ignoreHTTPSErrors: true,
})

// Or verify API endpoints allow localhost
```

---

## Performance Metrics

### Expected Execution Times

| Suite | Tests | Time |
|-------|-------|------|
| Authentication | 15 | 2-3 min |
| Clients | 18 | 3-4 min |
| Quotes | 17 | 4-5 min |
| Reminders | 16 | 3-4 min |
| Dashboard | 8 | 2-3 min |
| Team | 17 | 3-4 min |
| Critical Journey | 11 | 4-5 min |
| **TOTAL** | **109** | **20-25 min** |

### Optimization Tips

```bash
# Run tests in parallel (local development)
npx playwright test --workers=4

# Run single browser to save time
npx playwright test --project=chromium

# Skip certain tests
npx playwright test --grep "@skip"
```

---

## Test Maintenance

### When to Update Tests

- [ ] UI element changes (update selectors)
- [ ] Workflow changes (update test steps)
- [ ] New features added (add new tests)
- [ ] Bug fixes (add regression tests)

### Adding New Tests

```typescript
// New spec file: e2e/specs/08-feature.spec.ts
import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { testUsers } from '../fixtures/auth.fixture'

test.describe('New Feature', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
  })

  test('User can perform new feature action', async ({ page }) => {
    // Arrange
    // Act
    // Assert
  })
})
```

---

## Success Criteria

### Pass Rate
- [ ] All critical tests passing (100%)
- [ ] Overall pass rate > 95%
- [ ] Flaky rate < 5%

### Performance
- [ ] Test suite completes in < 25 minutes
- [ ] No tests exceed 5 minutes individually
- [ ] Network requests complete within timeouts

### Coverage
- [ ] All user journeys tested
- [ ] Happy path + error cases
- [ ] Multi-tenancy verified
- [ ] Accessibility checked

### Artifacts
- [ ] HTML report generated
- [ ] JUnit XML for CI integration
- [ ] Screenshots captured on failures
- [ ] Videos available for debugging

---

## Checklist for Release

Before deploying to production:

- [ ] Run full test suite: `npm run test:e2e`
- [ ] All tests passing
- [ ] No flaky test failures
- [ ] Review failed test screenshots
- [ ] Check for new warnings/deprecations
- [ ] Verify report uploads to CI
- [ ] Confirm no secrets in artifacts

---

## Support & Documentation

- **Playwright Docs**: https://playwright.dev
- **Best Practices**: https://playwright.dev/docs/best-practices
- **Debugging Guide**: https://playwright.dev/docs/debug
- **API Reference**: https://playwright.dev/docs/api/class-test

---

## Quick Reference Commands

```bash
# Setup
npm install                          # Install dependencies
npx playwright install              # Install browsers

# Run Tests
npm run test:e2e                   # All tests (headless)
npm run test:e2e:headed            # All tests (visible browser)
npm run test:e2e:ui                # Interactive UI mode
npm run test:e2e:debug             # Debug mode with inspector
npm run test:e2e:report            # View HTML report

# Specific Tests
npx playwright test 01-auth.spec.ts  # One file
npx playwright test --grep "login"   # By pattern
npx playwright test --project=firefox # By browser

# Debug
npm run test:e2e:headed             # See what's happening
npx playwright show-trace trace.zip # View trace
npm run test:e2e:debug              # Step through code
```

---

**Document Version**: 1.0
**Last Updated**: February 14, 2026
**Author**: Claude Code - E2E Testing Specialist
**Status**: Production Ready
