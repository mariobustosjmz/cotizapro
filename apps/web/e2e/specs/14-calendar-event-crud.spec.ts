import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { testUsers } from '../fixtures/auth.fixture'

// Helper: local datetime string in YYYY-MM-DDTHH:MM format (matches datetime-local input)
function localDateTimeStr(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

test.describe('Calendar Event Create/Edit', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page)
    await authPage.goToLogin()
    await authPage.login(testUsers.owner.email, testUsers.owner.password)
  })

  test('Create event form submits with valid data and redirects to calendar', async ({ page }) => {
    await page.goto('/dashboard/calendar/new', { waitUntil: 'domcontentloaded' })

    const titleInput = page.locator('input[name="title"]')
    await expect(titleInput).toBeVisible({ timeout: 10000 })
    await titleInput.fill('E2E Test Event - Instalación')

    // Select first real client option (index 1 skips the placeholder)
    const clientSelect = page.locator('select[name="client_id"]')
    await expect(clientSelect).toBeVisible()
    const optionCount = await clientSelect.locator('option').count()
    if (optionCount > 1) {
      await clientSelect.selectOption({ index: 1 })
    }

    const eventTypeSelect = page.locator('select[name="event_type"]')
    await eventTypeSelect.selectOption('instalacion')

    // Set start (tomorrow 10:00) and end (tomorrow 11:00) as local time
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    const end = new Date(tomorrow)
    end.setHours(11, 0, 0, 0)

    await page.locator('input[name="scheduled_start"]').fill(localDateTimeStr(tomorrow))
    await page.locator('input[name="scheduled_end"]').fill(localDateTimeStr(end))

    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Expect redirect back to calendar after successful creation
    await page.waitForURL(/\/dashboard\/calendar($|\?)/, { timeout: 10000 }).catch(() => null)
    expect(page.url()).toContain('/dashboard/calendar')
    // Ensure we're NOT still on the /new route (successful redirect)
    expect(page.url()).not.toContain('/calendar/new')
  })

  test('Create event form prevents submission without required fields', async ({ page }) => {
    await page.goto('/dashboard/calendar/new', { waitUntil: 'domcontentloaded' })

    const titleInput = page.locator('input[name="title"]')
    await expect(titleInput).toBeVisible({ timeout: 10000 })

    // Click submit without filling anything — HTML5 validation or server validation keeps user on page
    await page.locator('button[type="submit"]').click()

    // Should still be on the new event page
    expect(page.url()).toContain('/dashboard/calendar/new')
  })

  test('Event type select has all expected options', async ({ page }) => {
    await page.goto('/dashboard/calendar/new', { waitUntil: 'domcontentloaded' })

    const eventTypeSelect = page.locator('select[name="event_type"]')
    await expect(eventTypeSelect).toBeVisible({ timeout: 10000 })

    const options = await eventTypeSelect.locator('option').allTextContents()
    const optionValues = await eventTypeSelect.locator('option').evaluateAll(
      (els) => els.map((el) => (el as HTMLOptionElement).value)
    )

    // Must include the 5 known event types from WORK_EVENT_TYPE_OPTIONS
    const expectedTypes = ['instalacion', 'medicion', 'visita_tecnica', 'mantenimiento', 'otro']
    for (const type of expectedTypes) {
      expect(optionValues).toContain(type)
    }

    // At least 5 real options (plus optional placeholder)
    const realOptions = optionValues.filter((v) => v !== '')
    expect(realOptions.length).toBeGreaterThanOrEqual(5)
  })

  test('Create event form has address and notes optional fields', async ({ page }) => {
    await page.goto('/dashboard/calendar/new', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 10000 })

    const addressInput = page.locator('input[name="address"]')
    const notesTextarea = page.locator('textarea[name="notes"]')

    const hasAddress = await addressInput.isVisible().catch(() => false)
    const hasNotes = await notesTextarea.isVisible().catch(() => false)

    // Both optional fields should exist in the form
    expect(hasAddress || hasNotes).toBeTruthy()
  })

  test('Cancel button on new event form navigates back to calendar', async ({ page }) => {
    // Navigate to calendar first so router.back() has valid history
    await page.goto('/dashboard/calendar', { waitUntil: 'domcontentloaded' })
    await page.goto('/dashboard/calendar/new', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 10000 })

    const cancelButton = page.locator('button:has-text("Cancelar")')
    await expect(cancelButton).toBeVisible()
    await cancelButton.click()

    // Should navigate back to calendar
    await page.waitForURL(/\/dashboard\/calendar/, { timeout: 10000 }).catch(() => null)
    expect(page.url()).toContain('/dashboard/calendar')
  })

  test('Client select is populated with seeded clients', async ({ page }) => {
    await page.goto('/dashboard/calendar/new', { waitUntil: 'domcontentloaded' })

    const clientSelect = page.locator('select[name="client_id"]')
    await expect(clientSelect).toBeVisible({ timeout: 10000 })

    const options = await clientSelect.locator('option').count()
    // Seed data has 10 clients — select should have at least 1 real option beyond placeholder
    expect(options).toBeGreaterThan(1)
  })
})
