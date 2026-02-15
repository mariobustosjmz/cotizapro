import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class QuotesPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/dashboard/quotes')
  }

  async goToNewQuote() {
    await super.goto('/dashboard/quotes/new')
  }

  async goToQuoteDetails(quoteId: string) {
    await super.goto(`/dashboard/quotes/${quoteId}`)
  }

  // Quote Form
  async selectClient(clientName: string) {
    const select = this.page.locator('select[name="client_id"], input[name="client_id"]')
    if (await select.isVisible()) {
      await select.click()
      const option = this.page.locator(`text=${clientName}`)
      await option.click()
    }
  }

  async fillQuoteForm(data: {
    client_id?: string
    description?: string
    notes?: string
  }) {
    if (data.client_id) {
      const clientSelect = this.page.locator('select[name="client_id"]')
      await clientSelect.selectOption(data.client_id)
    }

    if (data.description) {
      await this.page.locator('textarea[name="description"]').fill(data.description)
    }

    if (data.notes) {
      await this.page.locator('textarea[name="notes"]').fill(data.notes)
    }
  }

  async addService(name: string, price: string, quantity: string = '1') {
    const addButton = this.page.locator('button:has-text("Agregar servicio"), button:has-text("Add service")')
    await addButton.click()

    await this.page.waitForTimeout(500)

    const nameInput = this.page.locator('input[name*="service_name"], input[placeholder*="Nombre"]').last()
    const priceInput = this.page.locator('input[name*="service_price"], input[placeholder*="Precio"]').last()
    const quantityInput = this.page.locator('input[name*="quantity"], input[placeholder*="Cantidad"]').last()

    await nameInput.fill(name)
    await priceInput.fill(price)
    if (quantity !== '1') {
      await quantityInput.fill(quantity)
    }
  }

  async submitQuoteForm() {
    await this.page.locator('button[type="submit"]:has-text("Crear"), button[type="submit"]:has-text("Guardar")').click()
    await this.page.waitForURL('**/dashboard/quotes', { timeout: 5000 })
  }

  // Quote List
  async getQuotesList(): Promise<string[]> {
    const quotes = await this.page.locator('table tbody tr td:first-child').allTextContents()
    return quotes.map(q => q.trim()).filter(q => q)
  }

  async getDraftQuotesCount(): Promise<number> {
    const text = await this.getText(this.page.locator('text=Borradores').locator('..').locator('div.text-2xl'))
    return parseInt(text, 10)
  }

  async getSentQuotesCount(): Promise<number> {
    const text = await this.getText(this.page.locator('text=Enviadas').locator('..').locator('div.text-2xl'))
    return parseInt(text, 10)
  }

  async getAcceptedQuotesCount(): Promise<number> {
    const text = await this.getText(this.page.locator('text=Aceptadas').locator('..').locator('div.text-2xl'))
    return parseInt(text, 10)
  }

  async getRejectedQuotesCount(): Promise<number> {
    const text = await this.getText(this.page.locator('text=Rechazadas').locator('..').locator('div.text-2xl'))
    return parseInt(text, 10)
  }

  async getQuoteByNumber(number: string) {
    return this.page.locator(`table tbody tr:has-text("${number}")`)
  }

  async clickQuoteDetailsLink(quoteNumber: string) {
    await this.page.locator(`table tbody tr:has-text("${quoteNumber}") a:has-text("Ver detalles")`).click()
    await this.page.waitForURL('**/dashboard/quotes/*')
  }

  // Quote Details Page
  async getQuoteStatus(): Promise<string> {
    const status = this.page.locator('span.inline-flex:has-text("Borrador"), span.inline-flex:has-text("Enviada"), span.inline-flex:has-text("Aceptada")')
    return await this.getText(status)
  }

  async getQuoteTotal(): Promise<string> {
    const total = this.page.locator('[data-testid="quote-total"], .quote-total, text=/Total|TOTAL/')
    return await this.getText(total)
  }

  async clickSendQuoteButton() {
    await this.page.locator('button:has-text("Enviar"), button:has-text("Send")').click()
  }

  async fillEmailForm(email: string, message?: string) {
    const emailInput = this.page.locator('input[name="email"]')
    await emailInput.fill(email)

    if (message) {
      const messageInput = this.page.locator('textarea[name="message"]')
      if (await messageInput.isVisible()) {
        await messageInput.fill(message)
      }
    }
  }

  async submitEmailForm() {
    await this.page.locator('button[type="submit"]:has-text("Enviar")').click()
  }

  async clickAcceptQuoteButton() {
    await this.page.locator('button:has-text("Aceptar"), button:has-text("Accept")').click()
  }

  async clickRejectQuoteButton() {
    await this.page.locator('button:has-text("Rechazar"), button:has-text("Reject")').click()
  }

  async clickGeneratePDFButton() {
    await this.page.locator('button:has-text("PDF"), button:has-text("Descargar")').click()
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator('text=No hay cotizaciones').isVisible()
  }

  async isNewQuoteButtonVisible(): Promise<boolean> {
    return await this.page.locator('a[href="/dashboard/quotes/new"]').isVisible()
  }
}
