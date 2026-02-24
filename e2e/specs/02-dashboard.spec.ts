import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { DashboardPage } from '../pages/dashboard.page'
import { testUsers } from '../fixtures/auth.fixture'

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
  })

  test('Dashboard page loads with correct title', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    const title = await dashboardPage.getPageTitle()
    expect(title).toContain('Dashboard')
  })

  test('Dashboard displays welcome message', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    const subtitle = await dashboardPage.getPageSubtitle()
    expect(subtitle.length).toBeGreaterThan(0)
  })

  test('User can navigate to Clients section', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    await dashboardPage.clickClientsLink()
    expect(page.url()).toContain('/dashboard/clients')

    const isVisible = await dashboardPage.isClientsSectionVisible()
    expect(isVisible).toBeTruthy()
  })

  test('User can navigate to Quotes section', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    await dashboardPage.clickQuotesLink()
    expect(page.url()).toContain('/dashboard/quotes')

    const isVisible = await dashboardPage.isQuotesSectionVisible()
    expect(isVisible).toBeTruthy()
  })

  test('User can navigate to Team section', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    await dashboardPage.clickTeamLink()
    expect(page.url()).toContain('/dashboard/team')
  })

  test('User can navigate to Reminders section', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    await dashboardPage.clickRemindersLink()
    expect(page.url()).toContain('/dashboard/reminders')
  })

  test('User can navigate to Settings section', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    await dashboardPage.clickSettingsLink()
    expect(page.url()).toContain('/dashboard/settings')
  })

  test('Dashboard displays stats cards', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    const clientsCount = await dashboardPage.getTotalClientsCount()
    expect(clientsCount).toBeDefined()
    expect(clientsCount).toMatch(/\d+/)
  })

  test('Sidebar navigation is visible', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    const sidebar = page.locator('aside, nav, [role="navigation"]').first()
    expect(await sidebar.isVisible()).toBeTruthy()
  })

  test('Main content area is visible', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    const mainContent = page.locator('main, [role="main"]')
    expect(await mainContent.isVisible()).toBeTruthy()
  })

  test('User info is displayed in header', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    const userEmail = page.locator(`text=${testUsers.owner.email}`)
    const userButton = page.locator('button[aria-label^="Menú de usuario"], [data-testid="user-menu"]')

    const hasUserInfo = await userEmail.isVisible() || await userButton.isVisible()
    expect(hasUserInfo).toBeTruthy()
  })

  test('Navigation links have correct href attributes', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    const clientsLink = page.locator('a[href="/dashboard/clients"]').first()
    const quotesLink = page.locator('a[href="/dashboard/quotes"]').first()
    const teamLink = page.locator('a[href="/dashboard/team"]').first()

    expect(await clientsLink.isVisible()).toBeTruthy()
    expect(await quotesLink.isVisible()).toBeTruthy()
    expect(await teamLink.isVisible()).toBeTruthy()
  })

  test('Logo links back to dashboard/home', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    const logo = page.locator('a:has-text("CotizaPro"), [data-testid="logo"]')
    if (await logo.isVisible()) {
      const href = await logo.getAttribute('href')
      expect(['/dashboard', '/', '/dashboard/'].includes(href || '')).toBeTruthy()
    }
  })

  test('Mobile responsive navigation (mobile viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    const sidebar = page.locator('aside, nav').first()
    expect(await sidebar.isVisible()).toBeTruthy()
  })
})
