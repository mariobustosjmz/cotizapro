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
    // Wait for API calls to complete (clients and services)
    await Promise.all([
      this.page.waitForResponse(resp => resp.url().includes('/api/clients') && resp.status() === 200).catch(() => null),
      this.page.waitForResponse(resp => resp.url().includes('/api/services') && resp.status() === 200).catch(() => null)
    ])
    // Give React a moment to render the options
    await this.page.waitForTimeout(800)
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
    itemIndex?: number
  }) {
    if (data.client_id) {
      const clientSelect = this.page.locator('select[name="client_id"]')
      await clientSelect.selectOption(data.client_id)
    }

    if (data.description) {
      const index = data.itemIndex ?? 0
      // Use .first() — desktop + mobile layouts both render the same data-testid
      await this.page.locator(`[data-testid="item-description-${index}"]`).first().fill(data.description)
    }

    if (data.notes) {
      await this.page.locator('textarea[name="notes"]').fill(data.notes)
    }
  }

  async addQuoteItem(description: string, price: string, quantity: string = '1', itemIndex: number = 0) {
    // If adding a new item (not the first one), click the add button
    if (itemIndex > 0) {
      const addButton = this.page.locator('[data-testid="add-quote-item-btn"]')
      await addButton.waitFor({ state: 'visible', timeout: 30000 })
      await addButton.click()
      await this.page.waitForTimeout(500)
    }

    // Wait for the item fields to be visible before filling
    // Use .first() — desktop + mobile layouts both render the same data-testid
    const descInput = this.page.locator(`[data-testid="item-description-${itemIndex}"]`).first()
    const priceInput = this.page.locator(`[data-testid="item-unit-price-${itemIndex}"]`).first()
    const quantityInput = this.page.locator(`[data-testid="item-quantity-${itemIndex}"]`).first()

    // Wait for fields with longer timeout and better error handling
    await descInput.waitFor({ state: 'visible', timeout: 30000 })
    await descInput.fill(description)
    await priceInput.waitFor({ state: 'visible', timeout: 5000 })
    await priceInput.fill(price)
    if (quantity !== '1') {
      await quantityInput.clear()
      await quantityInput.fill(quantity)
    }
  }

  async submitQuoteForm() {
    // Wait for API response to avoid race conditions
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes('/api/quotes') && response.request().method() === 'POST',
      { timeout: 30000 }
    ).catch(() => null)

    await this.page.locator('[data-testid="submit-quote-btn"]').click()

    await responsePromise

    await this.page.waitForURL('**/dashboard/quotes', { timeout: 30000 })

    // Force a page reload to ensure fresh data from Server Component
    await this.page.reload({ waitUntil: 'load' }).catch(() => null)

    // Wait for the table to be visible (or empty state)
    await this.page.locator('table, text=No hay cotizaciones').waitFor({ timeout: 5000 }).catch(() => null)

    // Give React time to hydrate
    await this.page.waitForTimeout(500)
  }

  // Quote List
  async getQuotesList(): Promise<string[]> {
    const quotes = await this.page.locator('table tbody tr td:first-child').allTextContents()
    return quotes.map(q => q.trim()).filter(q => q)
  }

  async getDraftQuotesCount(): Promise<number> {
    const text = await this.getText(this.page.locator('[data-testid="draft-quotes-count"]'))
    return parseInt(text, 10)
  }

  async getSentQuotesCount(): Promise<number> {
    const text = await this.getText(this.page.locator('[data-testid="sent-quotes-count"]'))
    return parseInt(text, 10)
  }

  async getAcceptedQuotesCount(): Promise<number> {
    const text = await this.getText(this.page.locator('[data-testid="accepted-quotes-count"]'))
    return parseInt(text, 10)
  }

  async getRejectedQuotesCount(): Promise<number> {
    const text = await this.getText(this.page.locator('[data-testid="rejected-quotes-count"]'))
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
    const total = this.page.locator('[data-testid="quote-total"], .quote-total')
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
    return await this.page.locator('a[href="/dashboard/quotes/new"]').first().isVisible()
  }
}
