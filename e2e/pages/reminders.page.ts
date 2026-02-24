import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class RemindersPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/dashboard/reminders')
  }

  async goToNewReminder() {
    await super.goto('/dashboard/reminders/new')

    // Wait for client dropdown to load options
    const clientSelect = this.page.locator('select[name="client_id"]')

    // Wait for at least 2 options (placeholder + at least one client)
    await this.page.waitForFunction(
      (selector) => {
        const select = document.querySelector(selector) as HTMLSelectElement
        return select && select.options.length > 1
      },
      'select[name="client_id"]',
      { timeout: 30000 }
    )

    const optionCount = await clientSelect.locator('option').count()
    console.log(`[E2E] Client dropdown loaded with ${optionCount} options (including placeholder)`)
  }

  async goToReminderDetails(reminderId: string) {
    await super.goto(`/dashboard/reminders/${reminderId}`)
  }

  // Reminder Form
  async fillReminderForm(data: {
    title: string
    description?: string
    dueDate?: string
    relatedTo?: 'quote' | 'client'
    relatedId?: string
    client_id?: string
  }) {
    const titleInput = this.page.locator('input[name="title"]')
    await titleInput.fill(data.title)

    if (data.description) {
      const descInput = this.page.locator('textarea[name="description"]')
      await descInput.fill(data.description)
    }

    // Scheduled date is required - use provided date or default to tomorrow
    const scheduledDate = data.dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const dateInput = this.page.locator('input[name="scheduled_date"]')
    // For HTML5 date inputs, we need to set the value attribute directly
    await dateInput.evaluate((element, value) => {
      const input = element as HTMLInputElement
      input.value = value
      // Trigger events to ensure React state updates
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
      input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }))
    }, scheduledDate)
    // Wait a moment for React to process the change
    await this.page.waitForTimeout(100)

    // Client selection - required field
    // If client_id provided, select that client, otherwise select first available client
    const clientSelect = this.page.locator('select[name="client_id"]')
    if (await clientSelect.isVisible()) {
      if (data.client_id) {
        await clientSelect.selectOption(data.client_id)
      } else {
        // Select first client (index 1, since 0 is placeholder)
        const options = await clientSelect.locator('option').count()
        if (options > 1) {
          await clientSelect.selectOption({ index: 1 })
        }
      }
    }

    if (data.relatedTo) {
      const typeSelect = this.page.locator('select[name="related_type"]')
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption(data.relatedTo)
      }
    }

    if (data.relatedId) {
      const idSelect = this.page.locator('select[name="related_id"]')
      if (await idSelect.isVisible()) {
        await idSelect.selectOption(data.relatedId)
      }
    }
  }

  async submitReminderForm() {
    // Wait for API response to avoid race conditions
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes('/api/reminders') && response.request().method() === 'POST',
      { timeout: 30000 }
    ).catch((err) => {
      console.log('[E2E] No API response received for reminder creation:', err?.message)
      return null
    })

    await this.page.locator('button[type="submit"]:has-text("Crear"), button[type="submit"]:has-text("Guardar")').click()

    const response = await responsePromise
    let createdReminderId: string | null = null

    if (response) {
      const status = response.status()
      console.log(`[E2E] Reminder API response status: ${status}`)

      // Get raw response text first
      const rawBody = await response.text().catch(() => '')
      console.log(`[E2E] Reminder API raw response:`, rawBody)

      if (status !== 200 && status !== 201) {
        console.log(`[E2E] Reminder creation failed with status ${status}`)
      } else {
        try {
          const body = rawBody ? JSON.parse(rawBody) : null
          console.log(`[E2E] Reminder created successfully:`, JSON.stringify(body))
          if (body && body.id) {
            createdReminderId = body.id
            console.log(`[E2E] Created reminder ID: ${createdReminderId}`)
          }
        } catch (e) {
          console.log('[E2E] Failed to parse response JSON:', e)
        }
      }
    } else {
      console.log('[E2E] No response received from reminder API')
    }

    await this.page.waitForURL('**/dashboard/reminders', { timeout: 30000 })

    // Force a page reload to ensure fresh data from Server Component
    await this.page.reload({ waitUntil: 'load' }).catch(() => null)

    // Wait for the table to be visible (or empty state)
    await this.page.locator('table, text=No hay recordatorios').waitFor({ timeout: 5000 }).catch(() => null)

    // Give React time to hydrate
    await this.page.waitForTimeout(500)

    // Log what we see on the page
    const hasTable = await this.page.locator('table').isVisible().catch(() => false)
    const hasEmptyState = await this.page.locator('text=No hay recordatorios').isVisible().catch(() => false)
    console.log(`[E2E] After reload - Table visible: ${hasTable}, Empty state visible: ${hasEmptyState}`)

    if (hasTable) {
      const rowCount = await this.page.locator('table tbody tr').count()
      console.log(`[E2E] Table has ${rowCount} rows`)
    }
  }

  async createReminder(data: {
    title: string
    description?: string
    dueDate?: string
  }) {
    // Ensure at least one client exists before creating reminder
    await this.ensureClientExists()

    await this.goToNewReminder()
    await this.fillReminderForm(data)
    await this.submitReminderForm()
  }

  // Helper method to ensure at least one client exists
  async ensureClientExists() {
    // Navigate to clients page to check if any exist
    await this.page.goto('/dashboard/clients')
    await this.page.waitForLoadState('load')

    // Check if empty state is visible
    const emptyState = this.page.locator('text=No hay clientes')
    const hasClients = !(await emptyState.isVisible().catch(() => false))

    if (!hasClients) {
      console.log('[E2E] No clients exist, creating test client for reminder')
      await this.createTestClientViaUI()
    } else {
      console.log('[E2E] Clients already exist')
    }
  }

  // Create a test client via UI
  async createTestClientViaUI() {
    // Navigate to new client page
    await this.page.goto('/dashboard/clients/new')
    await this.page.waitForLoadState('load')

    // Fill client form
    const testClient = {
      name: `Test Client ${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      phone: '+34 912 345 678',
    }

    await this.page.locator('input[name="name"]').fill(testClient.name)
    await this.page.locator('input[name="email"]').fill(testClient.email)
    await this.page.locator('input[name="phone"]').fill(testClient.phone)

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes('/api/clients') && response.request().method() === 'POST',
      { timeout: 30000 }
    )

    // Submit form
    await this.page.locator('button[type="submit"]:has-text("Crear"), button[type="submit"]:has-text("Guardar")').click()

    // Wait for response
    const response = await responsePromise
    if (response.ok()) {
      console.log('[E2E] Test client created successfully via UI')
    }

    // Wait for navigation back to clients list
    await this.page.waitForURL('**/dashboard/clients', { timeout: 30000 })
    await this.page.waitForLoadState('load')

    // Force a page reload to ensure fresh data from Server Component
    await this.page.reload({ waitUntil: 'load' }).catch(() => null)

    // Wait for the table to be visible (not empty state)
    await this.page.locator('table').waitFor({ timeout: 5000 })

    // Verify the client appears in the table
    const clientRow = this.page.locator(`table tbody tr:has-text("${testClient.name}")`)
    await clientRow.waitFor({ timeout: 5000 })

    // Give React time to hydrate
    await this.page.waitForTimeout(500)

    console.log(`[E2E] Verified client "${testClient.name}" is visible in the list`)
  }

  // Reminders List
  async getRemindersList(): Promise<string[]> {
    const reminders = await this.page.locator('table tbody tr td:first-child').allTextContents()
    return reminders.map(r => r.trim()).filter(r => r)
  }

  async getTotalRemindersCount(): Promise<number> {
    const text = await this.getText(this.page.locator('text=Total').locator('..').locator('div.text-2xl'))
    return parseInt(text, 10) || 0
  }

  getReminderByTitle(title: string) {
    return this.page.locator(`table tbody tr:has-text("${title}")`).first()
  }

  async clickReminderDetailsLink(title: string) {
    console.log('[E2E] Clicking details link for reminder:', title)
    console.log('[E2E] Current URL before click:', this.page.url())

    const detailsLink = this.page.locator(`table tbody tr:has-text("${title}") a:has-text("Ver detalles")`).first()
    const isVisible = await detailsLink.isVisible().catch(() => false)
    console.log('[E2E] Details link visible:', isVisible)

    if (isVisible) {
      const href = await detailsLink.getAttribute('href')
      console.log('[E2E] Details link href:', href)
      await detailsLink.click()
      console.log('[E2E] Clicked details link, waiting for URL change...')
    }

    // Use regex to match UUID-based detail URLs only — excludes /reminders/new
    await this.page.waitForURL(/\/dashboard\/reminders\/[0-9a-f-]{36}/, { timeout: 30000 })
    console.log('[E2E] URL after navigation:', this.page.url())
  }

  // Reminder Details Page
  async getReminderTitle(): Promise<string> {
    // Use main content area to avoid matching the layout's "Dashboard" h1
    const title = this.page.locator('main h1, main h2').first()
    return await this.getText(title)
  }

  async getReminderDueDate(): Promise<string> {
    const date = this.page.locator('[data-testid="due-date"], .due-date')
    return await this.getText(date)
  }

  async getReminderStatus(): Promise<string> {
    const status = this.page.locator('[data-testid="reminder-status"], .reminder-status').first()
    return await this.getText(status)
  }

  async clickMarkAsCompleteButton() {
    await this.page.locator('button:has-text("Marcar como completado"), button:has-text("Mark as complete")').click()
  }

  async clickDeleteReminderButton() {
    await this.page.locator('button:has-text("Eliminar")').click()
  }

  async confirmDeleteReminder() {
    const confirmButton = this.page.locator('button:has-text("Confirmar"), button:has-text("Eliminar")')
    await confirmButton.click()
    await this.page.waitForURL('**/dashboard/reminders')
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator('text=No hay recordatorios, text=No reminders').isVisible()
  }

  async isNewReminderButtonVisible(): Promise<boolean> {
    return await this.page.locator('a[href="/dashboard/reminders/new"]').isVisible()
  }

  // Status Filters
  async filterByStatus(status: 'pending' | 'completed') {
    const filterSelect = this.page.locator('select[name="status"]')
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption(status)
      await this.page.waitForTimeout(500)
    }
  }

  async getPendingRemindersCount(): Promise<number> {
    const text = await this.getText(this.page.locator('text=Pendientes').locator('..').locator('div.text-2xl'))
    return parseInt(text, 10) || 0
  }

  async getCompletedRemindersCount(): Promise<number> {
    const text = await this.getText(this.page.locator('text=Completados').locator('..').locator('div.text-2xl'))
    return parseInt(text, 10) || 0
  }
}
