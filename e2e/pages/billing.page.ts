import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class BillingPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goToPricing() {
    await super.goto('/')
  }

  async goToBillingSettings() {
    await super.goto('/dashboard/settings/billing')
  }

  async goToBillingPortal() {
    await super.goto('/dashboard/billing')
  }

  // Pricing Page
  async clickUpgradePlanButton(plan: 'pro' | 'enterprise') {
    const button = this.page.locator(`button:has-text("Actualizar a ${plan}"), button:has-text("Upgrade to ${plan}"), a:has-text("Get ${plan}")`)
    await button.click()
  }

  async clickPricingCard(plan: string) {
    const card = this.page.locator(`text=${plan}`)
    await card.click()
  }

  // Current Plan Info
  async getCurrentPlanName(): Promise<string> {
    const planName = this.page.locator('[data-testid="current-plan"], .current-plan, text=/Plan: ')
    return await this.getText(planName)
  }

  async getCurrentPlanPrice(): Promise<string> {
    const price = this.page.locator('[data-testid="plan-price"], .plan-price')
    return await this.getText(price)
  }

  // Stripe Checkout
  async isStripeCheckoutVisible(): Promise<boolean> {
    return await this.page.locator('iframe[title*="Stripe"]').isVisible() || await this.page.locator('[data-testid="stripe-form"]').isVisible()
  }

  async getCheckoutTitle(): Promise<string> {
    const title = this.page.locator('h1, h2')
    return await this.getText(title)
  }

  async fillStripeCardForm(cardNumber: string, expiry: string, cvc: string) {
    const iframeElement = this.page.locator('iframe[title*="Card"]')
    if (await iframeElement.isVisible()) {
      const frameHandle = await iframeElement.frameLocator('xpath=..')
      const cardInput = frameHandle.locator('input[placeholder*="Card"]')
      const expiryInput = frameHandle.locator('input[placeholder*="MM"]')
      const cvcInput = frameHandle.locator('input[placeholder*="CVC"]')

      await cardInput.fill(cardNumber)
      await expiryInput.fill(expiry)
      await cvcInput.fill(cvc)
    } else {
      // Fallback for non-iframe checkout
      const cardInputs = this.page.locator('input[placeholder*="Card"], input[placeholder*="4242"]')
      const expiryInputs = this.page.locator('input[placeholder*="MM"]')
      const cvcInputs = this.page.locator('input[placeholder*="CVC"], input[placeholder*="123"]')

      if (await cardInputs.isVisible()) {
        await cardInputs.fill(cardNumber)
      }
      if (await expiryInputs.isVisible()) {
        await expiryInputs.fill(expiry)
      }
      if (await cvcInputs.isVisible()) {
        await cvcInputs.fill(cvc)
      }
    }
  }

  async fillBillingEmail(email: string) {
    const emailInput = this.page.locator('input[type="email"][name*="email"], input[placeholder*="email"]')
    if (await emailInput.isVisible()) {
      await emailInput.fill(email)
    }
  }

  async submitCheckout() {
    const submitButton = this.page.locator('button:has-text("Pagar"), button:has-text("Pay"), button[type="submit"]')
    await submitButton.click()
  }

  // Billing History
  async getBillingHistoryList(): Promise<string[]> {
    const invoices = await this.page.locator('table tbody tr td:first-child').allTextContents()
    return invoices.map(i => i.trim()).filter(i => i)
  }

  async getInvoiceByDate(date: string) {
    return this.page.locator(`table tbody tr:has-text("${date}")`)
  }

  async clickDownloadInvoiceButton(date: string) {
    await this.page.locator(`table tbody tr:has-text("${date}") a:has-text("Descargar"), table tbody tr:has-text("${date}") button:has-text("Download")`).click()
  }

  // Subscription Status
  async getSubscriptionStatus(): Promise<string> {
    const status = this.page.locator('[data-testid="subscription-status"], .subscription-status')
    return await this.getText(status)
  }

  async isProPlanActive(): Promise<boolean> {
    return await this.page.locator('text=Pro').isVisible()
  }

  async isFreePlanActive(): Promise<boolean> {
    return await this.page.locator('text=Free, text=Gratis').isVisible()
  }

  // Customer Portal
  async openCustomerPortal() {
    await this.page.locator('a:has-text("Portal de cliente"), a:has-text("Manage billing")').click()
  }

  async isCustomerPortalVisible(): Promise<boolean> {
    return this.page.url().includes('billing') || await this.page.locator('text=Manage subscription').isVisible()
  }
}
