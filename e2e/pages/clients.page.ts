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
    company_name?: string
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

    if (data.company_name) {
      await this.page.locator('input[name="company_name"]').fill(data.company_name)
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
    await this.page.locator('button[type="submit"]:has-text("Crear"), button[type="submit"]:has-text("Guardar")').click()
    await this.page.waitForURL('**/dashboard/clients', { timeout: 5000 })
  }

  async createClient(data: {
    name: string
    email?: string
    phone?: string
    company_name?: string
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
    const text = await this.getText(this.page.locator('text=Total Clientes').locator('..').locator('div.text-2xl'))
    return parseInt(text, 10)
  }

  async getClientByName(name: string) {
    return this.page.locator(`table tbody tr:has-text("${name}")`)
  }

  async clickClientDetailsLink(clientName: string) {
    await this.page.locator(`table tbody tr:has-text("${clientName}") a:has-text("Ver detalles")`).click()
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
    await this.page.locator('button:has-text("Eliminar")').click()
  }

  async confirmDelete() {
    const confirmButton = this.page.locator('button:has-text("Eliminar"), button:has-text("Confirmar")')
    await confirmButton.click({ force: true })
    await this.page.waitForURL('**/dashboard/clients')
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator('text=No hay clientes').isVisible()
  }

  async isNewClientButtonVisible(): Promise<boolean> {
    return await this.page.locator('a[href="/dashboard/clients/new"]').isVisible()
  }

  async getEmptyStateText(): Promise<string> {
    return await this.getText(this.page.locator('h3:has-text("No hay clientes")'))
  }
}
