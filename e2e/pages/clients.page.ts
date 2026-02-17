import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class ClientsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/dashboard/clients')
  }

  async goToNewClient() {
    await super.goto('/dashboard/clients/new')
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
    // Listen for console messages
    const consoleMessages: string[] = []
    this.page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`)
    })

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes('/api/clients') && response.request().method() === 'POST',
      { timeout: 10000 }
    )

    await this.page.locator('button[type="submit"]:has-text("Crear"), button[type="submit"]:has-text("Guardar")').click()

    try {
      const response = await responsePromise
      console.log('[E2E] API Response status:', response.status())
      const responseBody = await response.json().catch(() => null)
      console.log('[E2E] API Response body:', JSON.stringify(responseBody, null, 2))
      console.log('[E2E] Console messages:', consoleMessages.join('\n'))

      if (!response.ok()) {
        throw new Error(`API returned ${response.status()}: ${JSON.stringify(responseBody)}`)
      }
    } catch (error) {
      console.error('[E2E] Error waiting for API response:', error)
      console.log('[E2E] Console messages:', consoleMessages.join('\n'))
      throw error
    }

    await this.page.waitForURL('**/dashboard/clients', { timeout: 10000 })

    // Force a page reload to ensure fresh data from Server Component
    await this.page.reload({ waitUntil: 'networkidle' })

    // Wait for the table to be visible (or empty state)
    await this.page.locator('table, text=No hay clientes').waitFor({ timeout: 5000 }).catch(() => null)

    // Give React time to hydrate
    await this.page.waitForTimeout(500)
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
    const card = this.page.locator('text=Total Clientes').locator('../..')
    const text = await this.getText(card.locator('div.text-2xl'))
    return parseInt(text, 10)
  }

  async getClientByName(name: string) {
    return this.page.locator(`table tbody tr:has-text("${name}")`)
  }

  async clickClientDetailsLink(clientName: string) {
    await this.page.locator(`table tbody tr:has-text("${clientName}") a:has-text("Ver detalles")`).first().click()
    await this.page.waitForURL('**/dashboard/clients/*')
  }

  async isClientVisible(name: string): Promise<boolean> {
    return await this.page.locator(`text=${name}`).isVisible()
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
    await this.page.waitForURL('**/dashboard/clients', { timeout: 10000 })
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
