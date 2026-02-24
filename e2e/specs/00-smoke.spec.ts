import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { testUsers } from '../fixtures/auth.fixture'

test.describe('Smoke Tests - Page Load & Form Rendering', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
    await page.waitForURL('**/dashboard', { timeout: 15000 })
  })

  test('Dashboard loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('header span:has-text("Dashboard"), [role="banner"] span:has-text("Dashboard")').first()).toBeVisible()
  })

  test('Clients list loads', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await page.waitForURL('**/dashboard/clients')
    await expect(page.locator('h1, h2').filter({ hasText: /clientes/i }).first()).toBeVisible()
    await expect(page.locator('a[href="/dashboard/clients/new"]').first()).toBeVisible()
  })

  test('New client form renders', async ({ page }) => {
    await page.goto('/dashboard/clients/new')
    await page.waitForURL('**/dashboard/clients/new')
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('Services list loads', async ({ page }) => {
    await page.goto('/dashboard/services')
    await page.waitForURL('**/dashboard/services')
    await expect(page.locator('h1, h2').filter({ hasText: /servicios/i }).first()).toBeVisible()
  })

  test('New service form renders', async ({ page }) => {
    await page.goto('/dashboard/services/new')
    await page.waitForURL('**/dashboard/services/new')
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('Quotes list loads', async ({ page }) => {
    await page.goto('/dashboard/quotes')
    await page.waitForURL('**/dashboard/quotes')
    await expect(page.locator('h1, h2').filter({ hasText: /cotizaciones/i }).first()).toBeVisible()
  })

  test('New quote form renders', async ({ page }) => {
    await page.goto('/dashboard/quotes/new')
    await page.waitForURL('**/dashboard/quotes/new')
    await expect(page.locator('h1, h2, h3').first()).toBeVisible()
    await expect(page.locator('button[type="submit"], button:has-text("Siguiente"), button:has-text("Crear")').first()).toBeVisible()
  })

  test('Reminders list loads', async ({ page }) => {
    await page.goto('/dashboard/reminders')
    await page.waitForURL('**/dashboard/reminders')
    await expect(page.locator('h1, h2').filter({ hasText: /recordatorios/i }).first()).toBeVisible()
  })

  test('New reminder form renders', async ({ page }) => {
    await page.goto('/dashboard/reminders/new')
    await page.waitForURL('**/dashboard/reminders/new')
    await expect(page.locator('input[name="title"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('Service detail page renders (first service)', async ({ page }) => {
    await page.goto('/dashboard/services')
    await page.waitForURL('**/dashboard/services')
    const firstLink = page.locator('a[href*="/dashboard/services/"]').first()
    const count = await firstLink.count()
    if (count > 0) {
      await firstLink.click()
      await page.waitForURL('**/dashboard/services/**')
      await expect(page.locator('h2').first()).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('Quote detail page renders (first quote)', async ({ page }) => {
    await page.goto('/dashboard/quotes')
    await page.waitForURL('**/dashboard/quotes')
    const firstLink = page.locator('a[href*="/dashboard/quotes/"]').first()
    const count = await firstLink.count()
    if (count > 0) {
      await firstLink.click()
      await page.waitForURL('**/dashboard/quotes/**')
      await expect(page.locator('h2').first()).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('Client detail page renders (first client)', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await page.waitForURL('**/dashboard/clients')
    const firstLink = page.locator('a[href*="/dashboard/clients/"]:not([href="/dashboard/clients/new"])').first()
    const count = await firstLink.count()
    if (count > 0) {
      await firstLink.click()
      await page.waitForURL('**/dashboard/clients/**')
      await expect(page.locator('h2').first()).toBeVisible()
    } else {
      test.skip()
    }
  })
})
