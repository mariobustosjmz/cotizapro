import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class TemplatesPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await this.page.goto('/dashboard/templates', { waitUntil: 'domcontentloaded' })
    // Wait for the useEffect /api/templates fetch to complete
    await this.page.waitForResponse(
      (response) => response.url().includes('/api/templates') && response.request().method() === 'GET',
      { timeout: 15000 }
    ).catch(() => null)
    await this.page.waitForTimeout(300)
  }

  // Get the template count from the span "{N} templates" near the heading
  async getTemplateCount(): Promise<number> {
    const countSpan = this.page.locator('*:has-text("templates")').first()
    const text = await countSpan.textContent().catch(() => '0')
    const match = (text || '').match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator('text=No hay templates aun').isVisible()
  }

  async isLoadingVisible(): Promise<boolean> {
    return await this.page.locator('text=Cargando...').isVisible()
  }

  async clickNewTemplate() {
    // Button says "Nuevo" (not "Nuevo Template")
    const button = this.page.locator('button:has-text("Nuevo")').first()
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
    // Fill name (required) — modal input IDs have "modal_" prefix
    const nameInput = this.page.locator('input[id="modal_name"]')
    if (await nameInput.isVisible()) {
      await this.fill(nameInput, data.name)
    }

    // Fill description (optional)
    if (data.description) {
      const descInput = this.page.locator('textarea[id="modal_description"]')
      if (await descInput.isVisible()) {
        await this.fill(descInput, data.description)
      }
    }

    // Fill default terms (optional)
    if (data.default_terms) {
      const termsInput = this.page.locator('textarea[id="modal_terms"]')
      if (await termsInput.isVisible()) {
        await this.fill(termsInput, data.default_terms)
      }
    }

    // Fill default discount rate (optional)
    if (data.default_discount_rate) {
      const discountInput = this.page.locator('input[id="modal_discount"]')
      if (await discountInput.isVisible()) {
        await this.fill(discountInput, data.default_discount_rate)
      }
    }

    // Fill promotional label (optional)
    if (data.promotional_label) {
      const promoInput = this.page.locator('input[id="modal_promo"]')
      if (await promoInput.isVisible()) {
        await this.fill(promoInput, data.promotional_label)
      }

      // Date field appears conditionally when promotional_label has value
      if (data.promotional_valid_until) {
        await this.page.waitForTimeout(200)
        const dateInput = this.page.locator('input[id="modal_promo_date"]')
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
    // Templates render in a table — find the row containing name, click first button (edit)
    const row = this.page.locator('table tbody tr').filter({ hasText: name }).first()
    const editButton = row.locator('button').nth(0)

    await editButton.waitFor({ state: 'visible', timeout: 5000 })
    await editButton.click()
    await this.page.waitForTimeout(300)
  }

  async deleteTemplate(name: string) {
    // Auto-accept the confirm dialog BEFORE clicking (prevents deadlock)
    this.page.once('dialog', (dialog) => dialog.accept())

    const row = this.page.locator('table tbody tr').filter({ hasText: name }).first()
    const deleteButton = row.locator('button').nth(1)

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
    const templateCell = this.page.locator('table tbody tr td').filter({ hasText: name })
    return (await templateCell.count()) > 0
  }
}
