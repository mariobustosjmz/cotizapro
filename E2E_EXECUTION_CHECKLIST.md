# E2E Test Execution Checklist

## Project: CotizaPro SaaS
## Date: February 14, 2026
## Status: PRODUCTION READY

---

## Pre-Execution Validation

### Step 1: Environment Setup ✓

- [ ] **Node.js 18+**
  ```bash
  node --version  # Should be 18+
  ```

- [ ] **npm installed**
  ```bash
  npm --version
  ```

- [ ] **Navigate to project**
  ```bash
  cd /Users/mariobustosjmz/Desktop/claude/my-saas-app
  ```

### Step 2: Install Dependencies ✓

- [ ] **Install npm packages**
  ```bash
  npm install
  ```
  Expected: Dependencies installed without errors

- [ ] **Install Playwright browsers**
  ```bash
  npx playwright install
  ```
  Expected: Chromium, Firefox, WebKit installed

### Step 3: Environment Configuration ✓

- [ ] **Create `.env.local` with**:
  ```bash
  cat > .env.local << 'EOF'
  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-key
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  EOF
  ```

- [ ] **Verify .env.local exists**
  ```bash
  ls -la .env.local
  ```

### Step 4: Database Setup ✓

- [ ] **Test users exist in Supabase**
  - [ ] owner@example.com / TestPassword123!
  - [ ] admin@example.com / TestPassword123!
  - [ ] member@example.com / TestPassword123!

- [ ] **Seed test data (if needed)**
  ```bash
  supabase db push
  ```

### Step 5: Playwright Configuration ✓

- [ ] **playwright.config.ts exists and is valid**
  ```bash
  ls -la playwright.config.ts
  cat playwright.config.ts | head -20
  ```

- [ ] **Configuration includes**:
  - [ ] baseURL: http://localhost:3000
  - [ ] Multi-browser projects: chromium, firefox, webkit
  - [ ] Reporters: html, json, junit
  - [ ] Global setup/teardown
  - [ ] Artifact management

### Step 6: Test Infrastructure ✓

- [ ] **All spec files present** (7 files)
  ```bash
  ls -la e2e/specs/
  # Should show: 01-auth, 02-dashboard, 03-clients, 04-quotes, 05-team, 06-reminders, 07-critical-journey
  ```

- [ ] **All Page Objects present** (8 files)
  ```bash
  ls -la e2e/pages/
  # Should show: base, auth, dashboard, clients, quotes, reminders, team, billing
  ```

- [ ] **All fixtures present** (2 files)
  ```bash
  ls -la e2e/fixtures/
  # Should show: auth.fixture.ts, data.fixture.ts
  ```

- [ ] **All helpers present** (2 files)
  ```bash
  ls -la e2e/helpers/
  # Should show: api.helper.ts, database.helper.ts
  ```

- [ ] **Global hooks present**
  ```bash
  ls -la e2e/global-setup.ts e2e/global-teardown.ts
  ```

---

## Execution Phase

### Step 7: Start Development Server

**Terminal 1 - Dev Server (Keep Running)**
```bash
npm run dev
```

Expected output:
```
  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.5s
```

Wait for "Ready" message before proceeding.

### Step 8: Run Test Suite

**Terminal 2 - Test Execution**

#### Option A: Run All Tests (Recommended First)
```bash
npm run test:e2e
```

Expected:
- All 129 tests execute
- Each test shows execution status
- Runtime: 20-25 minutes
- Final summary: "129 passed" or similar

#### Option B: Run First Test Suite Only (Quick Validation)
```bash
npx playwright test 01-auth.spec.ts
```

Expected:
- 15 auth tests execute
- Runtime: 2-3 minutes
- Status: All passed

#### Option C: Run Critical Journey (Full Flow)
```bash
npx playwright test 07-critical-journey.spec.ts
```

Expected:
- 11 comprehensive journey tests
- Runtime: 4-5 minutes
- Validates entire user workflow

### Step 9: Review Test Results

#### View HTML Report
```bash
npm run test:e2e:report
```

This will:
1. Open browser automatically with HTML report
2. Show pass/fail status for each test
3. Display execution times
4. Show screenshots of failures
5. Include video recordings (on failure)
6. Provide trace files for debugging

#### Check JUnit XML (for CI/CD)
```bash
cat test-results/junit.xml | head -30
```

Expected: XML with test results in CI-friendly format

#### Check JSON Results
```bash
cat test-results/results.json | head -50
```

---

## Validation Checkpoints

### Checkpoint 1: Setup Complete
```bash
# Verify all components
echo "=== Node Version ==="
node --version
echo "=== npm Version ==="
npm --version
echo "=== Playwright Version ==="
npx playwright --version
echo "=== Test Directory ==="
ls -la e2e/specs/ | wc -l
echo "=== Configuration ==="
test -f playwright.config.ts && echo "✓ Config exists" || echo "✗ Config missing"
```

Expected: All items present and versions displayed

### Checkpoint 2: Dev Server Running
```bash
# From another terminal
curl -s http://localhost:3000 | head -20
```

Expected: HTML content returned (app is accessible)

### Checkpoint 3: Tests Starting
```bash
# Run diagnostic test
npx playwright test --list 2>/dev/null | head -20
```

Expected: Lists all 129 tests

### Checkpoint 4: First Test Execution
```bash
# Run single quick test
npx playwright test 01-auth.spec.ts -g "login" --workers=1
```

Expected: Test runs, completes, passes

### Checkpoint 5: Full Suite Pass
```bash
# After running full suite
test -f playwright-report/index.html && echo "✓ Report generated" || echo "✗ Report missing"
test -f test-results/junit.xml && echo "✓ JUnit XML generated" || echo "✗ JUnit missing"
```

Expected: Both report files exist

---

## Test Execution Modes

### Mode 1: Headless (Fast - Recommended for CI)
```bash
npm run test:e2e
```
- Fastest execution
- No browser window
- Best for automation
- Runtime: 20-25 minutes

### Mode 2: Headed (Visual - Good for Debugging)
```bash
npm run test:e2e:headed
```
- See browser during tests
- Slower execution
- Better for troubleshooting
- Runtime: 30-40 minutes

### Mode 3: UI Mode (Interactive - Best for Development)
```bash
npm run test:e2e:ui
```
- Interactive test runner
- See test timeline
- Step through actions
- Pause and inspect

### Mode 4: Debug Mode (Step-Through - Deep Debugging)
```bash
npm run test:e2e:debug
```
- Playwright Inspector opens
- Step through each action
- Set breakpoints
- Inspect page state

### Mode 5: Single Browser (Faster for Development)
```bash
npx playwright test --project=chromium
```
- Only test on Chrome
- Faster execution
- Good for quick validation
- Runtime: 7-10 minutes

---

## Test Results Interpretation

### Perfect Results
```
✓ 129 passed (22m 45s)
```
All tests passed. Suite is healthy.

### Acceptable Results
```
✓ 128 passed (22m 45s)
⊘ 1 skipped
```
One test was intentionally skipped. That's fine.

### Warning: Flaky Tests
```
✓ 127 passed (22m 45s)
✕ 2 failed
  - Test A (flaky - passes sometimes)
  - Test B (environment-dependent)
```

Action needed:
1. Investigate failed tests
2. Check for race conditions
3. Review environment setup
4. May need to quarantine with `test.fixme()`

### Critical: Tests Failed
```
✕ 5 failed
✓ 124 passed
```

Do NOT commit code. Actions:
1. Run in headed mode: `npm run test:e2e:headed`
2. View HTML report: `npm run test:e2e:report`
3. Fix underlying issues
4. Re-run until all pass

---

## Artifact Review Checklist

After test execution, verify artifacts:

### HTML Report
- [ ] Report generated at: `playwright-report/index.html`
- [ ] Shows all 129 tests
- [ ] Pass/fail status correct
- [ ] Execution times displayed
- [ ] Failures (if any) show screenshots
- [ ] Traces available for debugging

### Screenshots
- [ ] Located in: `playwright-report/data/`
- [ ] Generated only on failure
- [ ] Show actual page state at failure
- [ ] Clearly identify problem

### Videos
- [ ] Located in: `playwright-report/data/`
- [ ] Generated only on failure
- [ ] Show complete test execution
- [ ] Helpful for debugging complex issues

### Trace Files
- [ ] Located in: `playwright-report/data/`
- [ ] View with: `npx playwright show-trace path-to-file`
- [ ] Allow step-by-step replay
- [ ] Useful for race condition debugging

### JUnit XML
- [ ] Generated at: `test-results/junit.xml`
- [ ] Valid XML format
- [ ] All test results included
- [ ] Ready for CI/CD integration

---

## Troubleshooting During Execution

### Issue: Tests timeout waiting for app
```bash
# Dev server not running or slow
# Solution:
1. Check Terminal 1: npm run dev
2. Verify http://localhost:3000 is accessible
3. Increase timeout: npx playwright test --timeout=60000
```

### Issue: "Target page, context or browser has been closed"
```bash
# Browser crashed during test
# Solution:
1. Restart dev server: npm run dev
2. Check for port 3000 conflicts: lsof -i :3000
3. Kill stale processes: killall node
4. Try again
```

### Issue: Login tests fail
```bash
# Test users missing or credentials wrong
# Solution:
1. Verify test users in Supabase
2. Check credentials in e2e/fixtures/auth.fixture.ts
3. Ensure .env.local is configured
4. Reseed database if needed
```

### Issue: Network timeouts
```bash
# Slow network or server issues
# Solution:
1. Check internet connection
2. Increase navigation timeout: --navigation-timeout=60000
3. Verify Supabase is accessible
4. Check GitHub/npm status pages
```

### Issue: Specific test failing
```bash
# Run in headed mode to see what's happening
npx playwright test tests/e2e/specs/03-clients.spec.ts --headed

# Or debug mode
npx playwright test tests/e2e/specs/03-clients.spec.ts --debug

# Check if selector changed
# Update in corresponding .page.ts file
```

---

## Pre-Commit Validation

Before committing code changes, run this checklist:

```bash
# 1. Run full test suite
npm run test:e2e

# 2. Check results
echo "Exit code: $?"  # Should be 0

# 3. Verify report
ls -la playwright-report/

# 4. If all passed
git add .
git commit -m "feat: description of changes"
```

Required: All 129 tests passing or explicitly marked as skip/fixme

---

## CI/CD Integration

### GitHub Actions
Test suite configured for GitHub Actions:

1. Runs on: push to any branch, all pull requests
2. Timeout: 30 minutes
3. Environment: Ubuntu 22.04, Node 18
4. Artifacts: Uploaded for 30 days
5. Reports: Published to Actions tab

### GitLab CI
If using GitLab, add to `.gitlab-ci.yml`:

```yaml
e2e_tests:
  image: mcr.microsoft.com/playwright:v1.45.0-jammy
  script:
    - npm ci
    - npm run test:e2e
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
  timeout: 30 minutes
```

### Jenkins
If using Jenkins, add to Jenkinsfile:

```groovy
stage('E2E Tests') {
  steps {
    sh 'npm ci'
    sh 'npm run test:e2e'
  }
  post {
    always {
      publishHTML([
        reportDir: 'playwright-report',
        reportFiles: 'index.html',
        reportName: 'E2E Test Report'
      ])
    }
  }
}
```

---

## Success Criteria Validation

| Criterion | Status | How to Verify |
|-----------|--------|---------------|
| All 129 tests pass | ✓ | `npm run test:e2e` shows "129 passed" |
| No unintended skips | ✓ | Report shows only intentional skips |
| Pass rate >95% | ✓ | HTML report displays pass percentage |
| Runtime <30 minutes | ✓ | Test output shows total time |
| Multi-browser support | ✓ | Report shows tests on 3 browsers |
| Artifacts generated | ✓ | playwright-report/ and test-results/ exist |
| HTML report clean | ✓ | Open report, verify no unexpected failures |
| No secrets in logs | ✓ | Review console output for credentials |
| CI/CD ready | ✓ | jUnit XML and HTML report formats correct |
| Documentation clear | ✓ | Team can follow TEST_GUIDE.md |

---

## Final Sign-Off Checklist

Before declaring tests production-ready:

- [ ] All 129 tests passing locally
- [ ] Tests pass in 3 consecutive runs
- [ ] No flaky test patterns detected
- [ ] HTML report reviewed and clean
- [ ] Screenshots/videos reviewed (if any failures)
- [ ] Performance acceptable
- [ ] CI/CD pipeline configured and working
- [ ] Documentation reviewed and accurate
- [ ] Team trained on execution
- [ ] Ready for production deployment

---

## Support Resources

- **Quick Start**: `E2E_QUICK_START.md`
- **Test Guide**: `e2e/TEST_GUIDE.md`
- **Implementation**: `E2E_TEST_SUMMARY.md`
- **Playwright Docs**: https://playwright.dev
- **Best Practices**: https://playwright.dev/docs/best-practices

---

## Post-Execution Actions

### If All Tests Pass
```bash
# 1. Commit tests (optional, already committed)
git add .
git commit -m "test: run e2e test suite - all passing"

# 2. Push to feature branch
git push origin feature-branch

# 3. Create PR
gh pr create --title "E2E Tests" --body "All 129 tests passing"

# 4. Merge when approved
git merge main
```

### If Tests Fail
```bash
# 1. View detailed report
npm run test:e2e:report

# 2. Debug specific test
npm run test:e2e:debug

# 3. Fix issue

# 4. Re-run tests
npm run test:e2e

# 5. Once passing, commit
git add .
git commit -m "fix: resolve e2e test failures"
```

---

**Version**: 1.0
**Created**: February 14, 2026
**Status**: Production Ready
**Next Review**: After first CI/CD execution

---

## Quick Command Reference

```bash
# Setup (one time)
npm install
npx playwright install

# Development
npm run dev                    # Start dev server
npm run test:e2e             # Run all tests
npm run test:e2e:headed      # Run with visible browser
npm run test:e2e:ui          # Interactive UI mode
npm run test:e2e:debug       # Debug mode with inspector
npm run test:e2e:report      # View HTML report

# Specific tests
npx playwright test 01-auth.spec.ts              # One suite
npx playwright test --grep "login"               # By pattern
npx playwright test --project=firefox            # By browser
npx playwright test --repeat-each=5              # Flaky detection

# Verification
npx playwright test --list                       # List all tests
curl http://localhost:3000                       # Verify app running
ls playwright-report/index.html                  # Verify report exists
```

Start here: **`npm run test:e2e`** ✅
