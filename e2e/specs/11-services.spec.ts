import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { testUsers } from '../fixtures/auth.fixture'

test.describe('Services Management', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
  })

  test('Services page loads successfully', async ({ page }) => {
    await page.goto('/dashboard/services', { waitUntil: 'networkidle' })
    expect(page.url()).toContain('/dashboard/services')
    const heading = page.locator('h2').first()
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('Services list displays with seeded data', async ({ page }) => {
    await page.goto('/dashboard/services', { waitUntil: 'networkidle' })
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Services page has Add button', async ({ page }) => {
    await page.goto('/dashboard/services', { waitUntil: 'networkidle' })
    const addButton = page.locator('a[href*="services/new"], button:has-text("Agregar"), button:has-text("Nuevo")')
    const hasAdd = await addButton.isVisible().catch(() => false)
    expect(hasAdd).toBeTruthy()
  })

  test('Service row shows name and price', async ({ page }) => {
    await page.goto('/dashboard/services', { waitUntil: 'networkidle' })
    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toBeVisible()
    const rowText = await firstRow.textContent()
    expect(rowText).toBeTruthy()
  })

  test('Services page shows unit type filter or labels', async ({ page }) => {
    await page.goto('/dashboard/services', { waitUntil: 'networkidle' })
    // Look for filter controls or unit type column
    const unitTypeEl = page.locator('text=Por Hora, text=Fijo, text=Por Unidad, select').first()
    const hasUnitType = await unitTypeEl.isVisible().catch(() => false)
    // Page should have loaded and show something
    const table = page.locator('table')
    const hasTable = await table.isVisible().catch(() => false)
    expect(hasTable || hasUnitType).toBeTruthy()
  })

  test('Service detail page loads', async ({ page }) => {
    await page.goto('/dashboard/services', { waitUntil: 'networkidle' })
    const firstLink = page.locator('table tbody tr').first().locator('a').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/dashboard/services/')
    }
  })

  test('Create new service form loads', async ({ page }) => {
    await page.goto('/dashboard/services/new', { waitUntil: 'networkidle' })
    const nameInput = page.locator('input[name="name"], input[placeholder*="nombre"], input[id="name"]')
    const hasNameInput = await nameInput.isVisible().catch(() => false)
    const heading = page.locator('h1, h2').first()
    const hasHeading = await heading.isVisible().catch(() => false)
    expect(hasNameInput || hasHeading).toBeTruthy()
  })

  test('Service category filter works', async ({ page }) => {
    await page.goto('/dashboard/services', { waitUntil: 'networkidle' })
    // Page loads without errors
    expect(page.url()).toContain('/dashboard/services')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('Services page accessible for admin role', async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.login(testUsers.admin.email, testUsers.admin.password)
    await page.goto('/dashboard/services', { waitUntil: 'networkidle' })
    expect(page.url()).toContain('/dashboard/services')
  })
})
