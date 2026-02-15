import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { DashboardPage } from '../pages/dashboard.page'
import { testUsers, loginAs, logout } from '../fixtures/auth.fixture'
import { generateRandomEmail } from '../fixtures/data.fixture'

test.describe('Authentication Flow', () => {
  test('User can navigate to login page', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()

    const isVisible = await authPage.isLoginPageVisible()
    expect(isVisible).toBeTruthy()
  })

  test('User can navigate to signup page', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToSignup()

    const isVisible = await authPage.isSignupPageVisible()
    expect(isVisible).toBeTruthy()
  })

  test('Login page has navigation to signup', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()

    const signupLink = await authPage.getSignupLink()
    expect(signupLink).toContain('signup')
  })

  test('Signup page has navigation to login', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToSignup()

    const loginLink = await authPage.getLoginLink()
    expect(loginLink).toContain('login')
  })

  test('Login with valid credentials redirects to dashboard', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)

    await dashboardPage.expectUrl('/dashboard')
    const isDashboard = await dashboardPage.isDashboardVisible()
    expect(isDashboard).toBeTruthy()
  })

  test('Login page shows all required fields', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()

    const emailInput = page.locator('input[name="email"]')
    const passwordInput = page.locator('input[name="password"]')
    const submitButton = page.locator('button[type="submit"]')

    expect(await emailInput.isVisible()).toBeTruthy()
    expect(await passwordInput.isVisible()).toBeTruthy()
    expect(await submitButton.isVisible()).toBeTruthy()
  })

  test('Login with invalid email format shows validation', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()

    const emailInput = page.locator('input[name="email"]')
    await emailInput.fill('not-an-email')
    await emailInput.blur()

    const isInvalid = await emailInput.evaluate((input: HTMLInputElement) => !input.validity.valid)
    expect(isInvalid).toBeTruthy()
  })

  test('Forgot password page is accessible from login', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()

    const forgotLink = page.locator('a:has-text("¿Olvidaste")')
    expect(await forgotLink.isVisible()).toBeTruthy()

    await authPage.goToForgotPassword()
    const emailInput = page.locator('input[name="email"]')
    expect(await emailInput.isVisible()).toBeTruthy()
  })

  test('User cannot access protected dashboard without login', async ({ page }) => {
    await logout(page)
    await page.goto('/dashboard', { waitUntil: 'networkidle' })

    const url = page.url()
    expect(url).not.toContain('/dashboard')
  })

  test('Logout clears session and redirects to login', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
    await dashboardPage.expectUrl('/dashboard')

    await dashboardPage.logout()
    await page.waitForURL('**/login', { timeout: 5000 })

    expect(page.url()).toContain('login')
  })

  test('Password field is masked for security', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()

    const passwordInput = page.locator('input[name="password"]')
    const type = await passwordInput.getAttribute('type')

    expect(type).toBe('password')
  })

  test('Signup form has all required fields', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToSignup()

    const fullNameInput = page.locator('input[name="fullName"]')
    const emailInput = page.locator('input[name="email"]')
    const orgNameInput = page.locator('input[name="orgName"]')
    const passwordInput = page.locator('input[name="password"]')

    expect(await fullNameInput.isVisible()).toBeTruthy()
    expect(await emailInput.isVisible()).toBeTruthy()
    expect(await orgNameInput.isVisible()).toBeTruthy()
    expect(await passwordInput.isVisible()).toBeTruthy()
  })

  test('Signup form shows password minimum length requirement', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToSignup()

    const passwordInput = page.locator('input[name="password"]')
    const minLength = await passwordInput.getAttribute('minlength')

    expect(minLength).toBeTruthy()
    expect(parseInt(minLength!)).toBeGreaterThanOrEqual(8)
  })

  test('Session persists across page reloads', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
    await dashboardPage.expectUrl('/dashboard')

    await page.reload()

    const isDashboard = await dashboardPage.isDashboardVisible()
    expect(isDashboard).toBeTruthy()
  })

  test('User logged out cannot access protected routes', async ({ page }) => {
    await logout(page)

    const protectedRoutes = ['/dashboard', '/dashboard/clients', '/dashboard/quotes']

    for (const route of protectedRoutes) {
      await page.goto(route, { waitUntil: 'networkidle' })
      const url = page.url()
      expect(url).not.toContain(route)
    }
  })

  test('Login with incomplete form shows validation errors', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()

    const emailInput = page.locator('input[name="email"]')
    const passwordInput = page.locator('input[name="password"]')
    const submitButton = page.locator('button[type="submit"]')

    // Only fill email
    await emailInput.fill('test@example.com')

    // Check HTML5 validation
    const passwordRequired = await passwordInput.evaluate((input: HTMLInputElement) => input.required)
    expect(passwordRequired).toBeTruthy()
  })
})
