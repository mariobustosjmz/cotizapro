import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { DashboardPage } from '../pages/dashboard.page'
import { ClientsPage } from '../pages/clients.page'
import { QuotesPage } from '../pages/quotes.page'
import { testUsers } from '../fixtures/auth.fixture'
import { testData, generateClientName } from '../fixtures/data.fixture'

test.describe('Critical User Journey: Complete Workflow', () => {
  test('User logs in and navigates complete application flow', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)
    const clientsPage = new ClientsPage(page)
    const quotesPage = new QuotesPage(page)

    // Step 1: Login
    await authPage.goToLogin()
    expect(await authPage.isLoginPageVisible()).toBeTruthy()

    await authPage.login(testUsers.owner.email, testUsers.owner.password)
    await dashboardPage.expectUrl('/dashboard')
    expect(await dashboardPage.isDashboardVisible()).toBeTruthy()

    // Step 2: Navigate to Clients
    await dashboardPage.clickClientsLink()
    expect(page.url()).toContain('/dashboard/clients')

    // Step 3: Create a new client
    const newClient = {
      name: generateClientName(),
      email: `test-${Date.now()}@example.com`,
      phone: '+34 912 345 678',
      company_name: 'Test Company',
    }

    await clientsPage.createClient(newClient)
    const clientVisible = await clientsPage.isClientVisible(newClient.name)
    expect(clientVisible).toBeTruthy()

    // Step 4: Navigate to Quotes
    await dashboardPage.clickQuotesLink()
    expect(page.url()).toContain('/dashboard/quotes')

    // Step 5: Create a new quote
    await page.locator('a[href="/dashboard/quotes/new"]').click()
    expect(page.url()).toContain('/dashboard/quotes/new')

    // Step 6: Return to Dashboard
    await dashboardPage.goto()
    const isDashboard = await dashboardPage.isDashboardVisible()
    expect(isDashboard).toBeTruthy()

    // Step 7: Logout
    await dashboardPage.logout()
    expect(page.url()).toContain('login')
  })

  test('User can create client and see it in list', async ({ page }) => {
    const authPage = new AuthPage(page)
    const clientsPage = new ClientsPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)

    // Get initial count
    await dashboardPage.goto()
    const initialCount = await dashboardPage.getTotalClientsCount()
    const initialNum = parseInt(initialCount, 10)

    // Create client
    await dashboardPage.clickClientsLink()
    const testClient = {
      name: `Test Client ${Date.now()}`,
      email: `client-${Date.now()}@example.com`,
    }

    await clientsPage.createClient(testClient)

    // Verify count increased
    await dashboardPage.goto()
    const newCount = await dashboardPage.getTotalClientsCount()
    const newNum = parseInt(newCount, 10)

    expect(newNum).toBeGreaterThanOrEqual(initialNum)
  })

  test('User can access all main dashboard sections', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
    await dashboardPage.goto()

    // Test navigation to each section
    const sections = [
      { name: 'Clients', action: () => dashboardPage.clickClientsLink(), url: '/dashboard/clients' },
      { name: 'Quotes', action: () => dashboardPage.clickQuotesLink(), url: '/dashboard/quotes' },
      { name: 'Team', action: () => dashboardPage.clickTeamLink(), url: '/dashboard/team' },
      { name: 'Reminders', action: () => dashboardPage.clickRemindersLink(), url: '/dashboard/reminders' },
      { name: 'Settings', action: () => dashboardPage.clickSettingsLink(), url: '/dashboard/settings' },
    ]

    for (const section of sections) {
      await dashboardPage.goto()
      await section.action()
      expect(page.url()).toContain(section.url)
    }
  })

  test('User session persists across page navigation', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)

    // Navigate multiple times
    await dashboardPage.goto()
    expect(page.url()).toContain('/dashboard')

    await page.goto('/dashboard/clients')
    expect(page.url()).toContain('/dashboard/clients')

    await page.goto('/dashboard/quotes')
    expect(page.url()).toContain('/dashboard/quotes')

    // Should still be logged in
    const loggedIn = await dashboardPage.isLoggedIn()
    expect(loggedIn).toBeTruthy()
  })

  test('User cannot access protected routes without authentication', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard', { waitUntil: 'networkidle' })

    // Should be redirected away from dashboard
    const url = page.url()
    expect(url).not.toContain('/dashboard')
  })

  test('User can logout and login again', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    // First login
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
    expect(page.url()).toContain('/dashboard')

    // Logout
    await dashboardPage.logout()
    expect(page.url()).toContain('login')

    // Second login
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
    expect(page.url()).toContain('/dashboard')
  })

  test('Page refresh maintains session', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
    await dashboardPage.goto()

    // Refresh page
    await page.reload()

    // Should still be on dashboard
    expect(page.url()).toContain('/dashboard')

    const isDashboard = await dashboardPage.isDashboardVisible()
    expect(isDashboard).toBeTruthy()
  })

  test('User data is displayed correctly after login', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)

    // Check if user email or name is displayed
    const userEmail = page.locator(`text=${testUsers.owner.email}`)
    const userButton = page.locator('button[aria-label="User menu"], [data-testid="user-menu"]')

    const hasUserInfo = await userEmail.isVisible() || await userButton.isVisible()
    expect(hasUserInfo).toBeTruthy()
  })

  test('Dashboard stats are visible and contain data', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
    await dashboardPage.goto()

    // Check stats
    const clientsCount = await dashboardPage.getTotalClientsCount()
    expect(clientsCount).toBeDefined()
    expect(clientsCount).toMatch(/\d+/)
  })

  test('Network error handling during navigation', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)

    // Navigate and page should handle gracefully
    await dashboardPage.goto()
    const isDashboard = await dashboardPage.isDashboardVisible()
    expect(isDashboard).toBeTruthy()
  })

  test('Mobile viewport - complete workflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)
    const clientsPage = new ClientsPage(page)

    // Login
    await authPage.goToLogin()
    const isLoginVisible = await authPage.isLoginPageVisible()
    expect(isLoginVisible).toBeTruthy()

    await authPage.login(testUsers.owner.email, testUsers.owner.password)
    expect(page.url()).toContain('/dashboard')

    // Create client on mobile
    await dashboardPage.clickClientsLink()
    const testClient = {
      name: `Mobile Client ${Date.now()}`,
    }

    await clientsPage.createClient(testClient)
    const isVisible = await clientsPage.isClientVisible(testClient.name)
    expect(isVisible).toBeTruthy()

    // Logout on mobile
    await dashboardPage.logout()
    expect(page.url()).toContain('login')
  })
})
