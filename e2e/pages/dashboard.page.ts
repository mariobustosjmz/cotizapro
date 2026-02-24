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
    // Breadcrumb span contains "Dashboard" after header redesign (Phase 3)
    return await this.getText(
      this.page.locator('header span:has-text("Dashboard"), [role="banner"] span:has-text("Dashboard")').first()
    )
  }

  async getPageSubtitle(): Promise<string> {
    // Class changed from text-gray-600 to text-muted-foreground in redesign
    // Use .first() — multiple p.text-muted-foreground elements exist on dashboard
    return await this.getText(this.page.locator('p.text-muted-foreground').first())
  }

  // Sidebar Navigation — scoped to aside to avoid duplicate hrefs in KPI "Ver" links
  async clickClientsLink() {
    await this.page.locator('aside').locator('a[href="/dashboard/clients"]').click()
    await this.page.waitForURL('**/dashboard/clients')
  }

  async clickQuotesLink() {
    await this.page.locator('aside').locator('a[href="/dashboard/quotes"]').click()
    await this.page.waitForURL('**/dashboard/quotes')
  }

  async clickTeamLink() {
    await this.page.locator('aside').locator('a[href="/dashboard/team"]').click()
    await this.page.waitForURL('**/dashboard/team')
  }

  async clickSettingsLink() {
    await this.page.locator('aside').locator('a[href="/dashboard/settings"]').click()
    await this.page.waitForURL('**/dashboard/settings')
  }

  async clickRemindersLink() {
    const link = this.page.locator('aside').locator('a[href="/dashboard/reminders"]')
    await link.waitFor({ state: 'attached' })
    await link.click({ force: true })
    await this.page.waitForURL('**/dashboard/reminders')
  }

  // User Menu
  async openUserMenu() {
    const userMenuButton = this.page.locator('button[aria-label^="Menú de usuario"], [data-testid="user-menu"]')
    if (await userMenuButton.isVisible()) {
      await userMenuButton.click({ force: true })
    }
  }

  async clickLogout() {
    await this.page.locator('button:has-text("Cerrar sesión"), a:has-text("Logout")').click()
  }

  async logout() {
    // Clear browser cookies only — avoids invalidating server-side Supabase session
    // which would break concurrent parallel test workers sharing the same credentials
    await this.page.context().clearCookies()
    await this.page.goto('/login')
    await this.page.waitForURL('**/login')
  }

  // Navigation verification
  async isClientsSectionVisible(): Promise<boolean> {
    return await this.page.locator('text=Clientes').first().isVisible()
  }

  async isQuotesSectionVisible(): Promise<boolean> {
    return await this.page.locator('text=Cotizaciones').first().isVisible()
  }

  async isDashboardVisible(): Promise<boolean> {
    // Breadcrumb uses <span> not <h1> after header redesign (Phase 3)
    return await this.page.locator('header span:has-text("Dashboard"), [role="banner"] span:has-text("Dashboard")').first().isVisible()
  }

  // Stats
  async getTotalClientsCount(): Promise<string> {
    // CardTitle renders as <h3> (not <div>) — traverse up to Card root then find text-3xl
    const stat = this.page.locator('h3:has-text("Clientes")').locator('../..').locator('div.text-3xl')
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
      // Use regex to match any /dashboard/* URL (glob '**/dashboard' only matches exact /dashboard)
      await this.page.waitForURL(/\/dashboard/, { timeout: 2000 })
      return true
    } catch {
      return false
    }
  }
}
