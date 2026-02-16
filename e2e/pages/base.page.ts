import { Page, Locator } from '@playwright/test'

export class BasePage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto(path: string) {
    await this.page.goto(path, { waitUntil: 'networkidle' })
  }

  async fill(locator: Locator, text: string) {
    await locator.fill(text)
  }

  async click(locator: Locator) {
    await locator.click()
  }

  async getText(locator: Locator): Promise<string> {
    return await locator.textContent() || ''
  }

  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible()
  }

  async waitFor(locator: Locator, timeout = 5000) {
    await locator.waitFor({ timeout, state: 'visible' })
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` })
  }

  async fillForm(data: Record<string, string>) {
    for (const [key, value] of Object.entries(data)) {
      const input = this.page.locator(`[name="${key}"]`)
      await input.fill(value)
    }
  }

  async expectUrl(path: string) {
    await this.page.waitForURL(`**${path}`, { timeout: 10000 })
  }

  async expectVisible(locator: Locator) {
    await locator.waitFor({ state: 'visible', timeout: 5000 })
  }

  async expectHidden(locator: Locator) {
    await locator.waitFor({ state: 'hidden', timeout: 5000 })
  }
}
