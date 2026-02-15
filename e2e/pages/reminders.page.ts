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
  }) {
    const titleInput = this.page.locator('input[name="title"]')
    await titleInput.fill(data.title)

    if (data.description) {
      const descInput = this.page.locator('textarea[name="description"]')
      await descInput.fill(data.description)
    }

    if (data.dueDate) {
      const dateInput = this.page.locator('input[name="due_date"], input[type="date"]')
      await dateInput.fill(data.dueDate)
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
    await this.page.locator('button[type="submit"]:has-text("Crear"), button[type="submit"]:has-text("Guardar")').click()
    await this.page.waitForURL('**/dashboard/reminders', { timeout: 5000 })
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

  async getReminderByTitle(title: string) {
    return this.page.locator(`table tbody tr:has-text("${title}")`)
  }

  async clickReminderDetailsLink(title: string) {
    await this.page.locator(`table tbody tr:has-text("${title}") a:has-text("Ver detalles")`).click()
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
    const status = this.page.locator('[data-testid="reminder-status"], .reminder-status, text=/Estado:|Status:/')
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
