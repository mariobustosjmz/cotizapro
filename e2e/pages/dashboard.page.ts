import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/dashboard')
  }

  async getPageTitle(): Promise<string> {
    return await this.getText(this.page.locator('h2'))
  }

  async getPageSubtitle(): Promise<string> {
    return await this.getText(this.page.locator('p.text-gray-600'))
  }

  // Sidebar Navigation
  async clickClientsLink() {
    await this.page.locator('a[href="/dashboard/clients"]').click()
    await this.page.waitForURL('**/dashboard/clients')
  }

  async clickQuotesLink() {
    await this.page.locator('a[href="/dashboard/quotes"]').click()
    await this.page.waitForURL('**/dashboard/quotes')
  }

  async clickTeamLink() {
    await this.page.locator('a[href="/dashboard/team"]').click()
    await this.page.waitForURL('**/dashboard/team')
  }

  async clickSettingsLink() {
    await this.page.locator('a[href="/dashboard/settings"]').click()
    await this.page.waitForURL('**/dashboard/settings')
  }

  async clickRemindersLink() {
    await this.page.locator('a[href="/dashboard/reminders"]').click()
    await this.page.waitForURL('**/dashboard/reminders')
  }

  // User Menu
  async openUserMenu() {
    const userMenuButton = this.page.locator('button[aria-label="User menu"], [data-testid="user-menu"]')
    if (await userMenuButton.isVisible()) {
      await userMenuButton.click()
    }
  }

  async clickLogout() {
    await this.page.locator('button:has-text("Cerrar sesión"), a:has-text("Logout")').click()
  }

  async logout() {
    await this.openUserMenu()
    await this.clickLogout()
    await this.page.waitForURL('**/login')
  }

  // Navigation verification
  async isClientsSectionVisible(): Promise<boolean> {
    return await this.page.locator('text=Clientes').isVisible()
  }

  async isQuotesSectionVisible(): Promise<boolean> {
    return await this.page.locator('text=Cotizaciones').isVisible()
  }

  async isDashboardVisible(): Promise<boolean> {
    return await this.page.locator('text=Dashboard').isVisible()
  }

  // Stats
  async getTotalClientsCount(): Promise<string> {
    const stat = this.page.locator('text=Total Clientes').locator('..').locator('div.text-2xl')
    return await this.getText(stat)
  }

  async getDraftQuotesCount(): Promise<string> {
    const stat = this.page.locator('text=Borradores').locator('..').locator('div.text-2xl')
    return await this.getText(stat)
  }

  // Breadcrumb
  async getBreadcrumb(): Promise<string[]> {
    const breadcrumbs = await this.page.locator('[data-testid="breadcrumb"] a, .breadcrumb a').allTextContents()
    return breadcrumbs
  }

  // Check if logged in
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForURL('**/dashboard', { timeout: 2000 })
      return true
    } catch {
      return false
    }
  }
}
