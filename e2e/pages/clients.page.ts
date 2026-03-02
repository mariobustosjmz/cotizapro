import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class ClientsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/dashboard/clients')
    // Wait for async ClientsListContent to finish loading
    await this.page.waitForSelector('table tbody tr, h3:has-text("No hay clientes")', { timeout: 15000 })
  }

  async goToNewClient() {
    await super.goto('/dashboard/clients/new')
    // Wait for the form to be ready (all browsers, especially webkit)
    await this.page.locator('input[name="name"]').waitFor({ state: 'visible', timeout: 15000 })
  }

  // New Client Form
  async fillClientForm(data: {
    name: string
    email?: string
    phone?: string
    address?: string
    tags?: string
  }) {
    await this.page.locator('input[name="name"]').fill(data.name)

    if (data.email) {
      await this.page.locator('input[name="email"]').fill(data.email)
    }

    if (data.phone) {
      await this.page.locator('input[name="phone"]').fill(data.phone)
    }

    if (data.address) {
      await this.page.locator('textarea[name="address"], input[name="address"]').fill(data.address)
    }

    if (data.tags) {
      const tagsInput = this.page.locator('input[name="tags"]')
      if (await tagsInput.isVisible()) {
        await tagsInput.fill(data.tags)
      }
    }
  }

  async submitClientForm() {
    // Set up response waiter BEFORE clicking
    const postResponsePromise = this.page.waitForResponse(
      response => response.url().includes('/api/clients') && response.request().method() === 'POST',
      { timeout: 30000 }
    )

    await this.page.locator('button[type="submit"]:has-text("Crear"), button[type="submit"]:has-text("Guardar")').click()

    // Check status only — do NOT call response.json() as it blocks on the body
    // stream which can hang in Next.js dev mode
    const response = await postResponsePromise
    if (!response.ok()) {
      throw new Error(`API returned ${response.status()}`)
    }

    // Wait for navigation + ClientsListContent async fetch to finish
    // Table rows or empty state appearing confirms both navigation and data load completed
    await this.page.waitForSelector(
      'table tbody tr, h3:has-text("No hay clientes")',
      { timeout: 60000 }
    )
  }

  async createClient(data: {
    name: string
    email?: string
    phone?: string
  }) {
    await this.goToNewClient()
    await this.fillClientForm(data)
    await this.submitClientForm()
  }

  // Client List
  async getClientsList(): Promise<string[]> {
    const clients = await this.page.locator('table tbody tr td:first-child').allTextContents()
    return clients.map(c => c.trim()).filter(c => c)
  }

  async getTotalClientCount(): Promise<number> {
    // Count visible table rows as proxy for total (stat card may not exist on this page)
    const rows = this.page.locator('table tbody tr')
    return await rows.count()
  }

  async getClientByName(name: string) {
    return this.page.locator(`table tbody tr:has-text("${name}")`)
  }

  async clickClientDetailsLink(clientName: string) {
    // The link text is "Ver" (short label in the actions column)
    await this.page.locator(`table tbody tr:has-text("${clientName}") a`).first().click()
    await this.page.waitForURL('**/dashboard/clients/*')
  }

  async isClientVisible(name: string): Promise<boolean> {
    // Ensure the list has fully loaded before checking
    await this.page.waitForSelector('table tbody tr, h3:has-text("No hay clientes")', { timeout: 15000 })
    const rows = this.page.locator('table tbody tr').filter({ hasText: name })
    return (await rows.count()) > 0
  }

  // Client Details Page
  async goToClientDetails(clientId: string) {
    await super.goto(`/dashboard/clients/${clientId}`)
  }

  async editClientField(fieldName: string, value: string) {
    const field = this.page.locator(`input[name="${fieldName}"], textarea[name="${fieldName}"]`)
    await field.clear()
    await field.fill(value)
  }

  async clickEditButton() {
    await this.page.locator('button:has-text("Editar")').click()
  }

  async clickDeleteButton() {
    this.page.once('dialog', dialog => dialog.accept())
    await this.page.locator('button:has-text("Eliminar")').click()
  }

  async confirmDelete() {
    await this.page.waitForURL('**/dashboard/clients', { timeout: 30000 })
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator('text=No hay clientes').isVisible()
  }

  async isNewClientButtonVisible(): Promise<boolean> {
    return await this.page.locator('a[href="/dashboard/clients/new"]').first().isVisible()
  }

  async getEmptyStateText(): Promise<string> {
    return await this.getText(this.page.locator('h3:has-text("No hay clientes")'))
  }
}
