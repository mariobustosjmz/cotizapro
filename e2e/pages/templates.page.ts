import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class TemplatesPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    // Use networkidle to wait for the /api/templates fetch in useEffect to complete
    await this.page.goto('/dashboard/templates', { waitUntil: 'networkidle' })
  }

  // Get the template count from the heading "Templates · N"
  async getTemplateCount(): Promise<number> {
    const heading = this.page.locator('h2:has-text("Templates")')
    const text = await this.getText(heading)
    // Extract number from "Templates · N"
    const match = text.match(/Templates\s*·\s*(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator('text=No hay templates aún').isVisible()
  }

  async isLoadingVisible(): Promise<boolean> {
    return await this.page.locator('text=Cargando templates').isVisible()
  }

  async clickNewTemplate() {
    const button = this.page.locator('button:has-text("Nuevo Template")')
    await button.waitFor({ state: 'visible', timeout: 10000 })
    await this.click(button)
    // Wait for modal to appear
    await this.page.waitForTimeout(300)
  }

  async fillTemplateForm(data: {
    name: string
    description?: string
    default_terms?: string
    default_discount_rate?: string
    promotional_label?: string
    promotional_valid_until?: string
  }) {
    // Fill name (required)
    const nameInput = this.page.locator('input[id="name"]')
    if (await nameInput.isVisible()) {
      await this.fill(nameInput, data.name)
    }

    // Fill description (optional)
    if (data.description) {
      const descInput = this.page.locator('textarea[id="description"]')
      if (await descInput.isVisible()) {
        await this.fill(descInput, data.description)
      }
    }

    // Fill default terms (optional)
    if (data.default_terms) {
      const termsInput = this.page.locator('textarea[id="default_terms"]')
      if (await termsInput.isVisible()) {
        await this.fill(termsInput, data.default_terms)
      }
    }

    // Fill default discount rate (optional)
    if (data.default_discount_rate) {
      const discountInput = this.page.locator('input[id="default_discount_rate"]')
      if (await discountInput.isVisible()) {
        await this.fill(discountInput, data.default_discount_rate)
      }
    }

    // Fill promotional label (optional)
    if (data.promotional_label) {
      const promoInput = this.page.locator('input[id="promotional_label"]')
      if (await promoInput.isVisible()) {
        await this.fill(promoInput, data.promotional_label)
      }

      // If promotional_label is filled and promotional_valid_until is provided, fill the date field
      if (data.promotional_valid_until) {
        // Wait for the date field to appear (it's conditionally rendered when promotional_label has value)
        await this.page.waitForTimeout(200)
        const dateInput = this.page.locator('input[id="promotional_valid_until"]')
        if (await dateInput.isVisible()) {
          await this.fill(dateInput, data.promotional_valid_until)
        }
      }
    }
  }

  async submitTemplateForm() {
    const submitButton = this.page.locator('button[type="submit"]').filter({ hasText: /Crear|Actualizar/ })
    await submitButton.waitFor({ state: 'visible', timeout: 5000 })

    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/templates') && /POST|PATCH/i.test(response.request().method()),
      { timeout: 30000 }
    ).catch(() => null)

    await submitButton.click()

    const response = await responsePromise
    if (response && !response.ok()) {
      throw new Error(`Template API request failed with status ${response.status()}`)
    }

    // Wait for modal to close (submit button disappears)
    await submitButton.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null)
    await this.page.waitForTimeout(300)
  }

  async cancelTemplateForm() {
    const cancelButton = this.page.locator('button:has-text("Cancelar")')
    if (await cancelButton.isVisible()) {
      await this.click(cancelButton)
      await this.page.waitForTimeout(300)
    }
  }

  async editTemplate(name: string) {
    // Each template card: Card > CardHeader(flex row) > [div.flex-1 with h3] [div.flex.gap-2 with buttons]
    // The grid contains all cards. Find the card containing the name, then click its first action button.
    const card = this.page.locator('.grid > div').filter({ hasText: name }).first()
    const buttons = card.locator('button')
    // First button = edit, second button = delete
    const editButton = buttons.nth(0)

    await editButton.waitFor({ state: 'visible', timeout: 5000 })
    await editButton.click()
    await this.page.waitForTimeout(300)
  }

  async deleteTemplate(name: string) {
    // Auto-accept the confirm dialog BEFORE clicking (prevents deadlock)
    this.page.once('dialog', (dialog) => dialog.accept())

    const card = this.page.locator('.grid > div').filter({ hasText: name }).first()
    const deleteButton = card.locator('button').nth(1)

    await deleteButton.waitFor({ state: 'visible', timeout: 5000 })
    await deleteButton.click()

    // Wait for DELETE API response
    await this.page.waitForResponse(
      (response) => response.url().includes('/api/templates') && response.request().method() === 'DELETE',
      { timeout: 30000 }
    ).catch(() => null)

    await this.page.waitForTimeout(300)
  }

  async isTemplateVisible(name: string): Promise<boolean> {
    const templateCard = this.page.getByText(name)
    return (await templateCard.count()) > 0
  }
}
