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
    // Wait for API calls to complete (clients)
    await Promise.all([
      this.page.waitForResponse(resp => resp.url().includes('/api/clients') && resp.status() === 200).catch(() => null)
    ])
    // Give React a moment to render the options
    await this.page.waitForTimeout(500)
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
      const descInput = this.page.locator('textarea[name="message"]')
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
      { timeout: 10000 }
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

    await this.page.waitForURL('**/dashboard/reminders', { timeout: 10000 })

    // Force a page reload to ensure fresh data from Server Component
    await this.page.reload({ waitUntil: 'networkidle' })

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
    await this.goToNewReminder()
    await this.fillReminderForm(data)
    await this.submitReminderForm()
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
    await this.page.locator(`table tbody tr:has-text("${title}") a:has-text("Ver detalles")`).first().click()
    await this.page.waitForURL('**/dashboard/reminders/*')
  }

  // Reminder Details Page
  async getReminderTitle(): Promise<string> {
    const title = this.page.locator('h1, h2')
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
