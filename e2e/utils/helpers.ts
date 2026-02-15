import { Page } from '@playwright/test'

export class TestHelpers {
  /**
   * Wait for a specific time (use sparingly)
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clear all cookies and local/session storage
   */
  static async clearBrowserStorage(page: Page): Promise<void> {
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  }

  /**
   * Get all table data as array of objects
   */
  static async getTableData(page: Page): Promise<Record<string, string>[]> {
    return page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'))
      const headers = Array.from(document.querySelectorAll('thead th')).map(th => th.textContent?.trim())

      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim())
        const obj: Record<string, string> = {}

        headers.forEach((header, index) => {
          if (header) {
            obj[header] = cells[index] || ''
          }
        })

        return obj
      })
    })
  }

  /**
   * Check if error message is displayed
   */
  static async hasErrorMessage(page: Page): Promise<boolean> {
    const errorSelectors = [
      '[role="alert"]',
      '.error',
      '.error-message',
      '[aria-label="error"]',
      '.text-red-500',
      '.text-red-600',
    ]

    for (const selector of errorSelectors) {
      const element = page.locator(selector)
      if (await element.isVisible()) {
        return true
      }
    }

    return false
  }

  /**
   * Get error message text
   */
  static async getErrorMessage(page: Page): Promise<string> {
    const errorSelectors = [
      '[role="alert"]',
      '.error-message',
      '.text-red-500',
    ]

    for (const selector of errorSelectors) {
      const element = page.locator(selector)
      if (await element.isVisible()) {
        return (await element.textContent()) || ''
      }
    }

    return ''
  }

  /**
   * Check if success message is displayed
   */
  static async hasSuccessMessage(page: Page): Promise<boolean> {
    const successSelectors = [
      '[role="status"]',
      '.success',
      '.success-message',
      '[aria-label="success"]',
      '.text-green-500',
      '.text-green-600',
    ]

    for (const selector of successSelectors) {
      const element = page.locator(selector)
      if (await element.isVisible()) {
        return true
      }
    }

    return false
  }

  /**
   * Get success message text
   */
  static async getSuccessMessage(page: Page): Promise<string> {
    const successSelectors = [
      '[role="status"]',
      '.success-message',
      '.text-green-500',
    ]

    for (const selector of successSelectors) {
      const element = page.locator(selector)
      if (await element.isVisible()) {
        return (await element.textContent()) || ''
      }
    }

    return ''
  }

  /**
   * Fill form fields from object
   */
  static async fillFormFields(
    page: Page,
    fields: Record<string, string>
  ): Promise<void> {
    for (const [name, value] of Object.entries(fields)) {
      const input = page.locator(`[name="${name}"]`)
      if (await input.isVisible()) {
        const tagName = await input.evaluate(el => el.tagName.toLowerCase())

        if (tagName === 'select') {
          await input.selectOption(value)
        } else if (tagName === 'textarea') {
          await input.fill(value)
        } else {
          await input.fill(value)
        }
      }
    }
  }

  /**
   * Submit form by finding submit button
   */
  static async submitForm(page: Page, buttonText?: string): Promise<void> {
    let submitButton

    if (buttonText) {
      submitButton = page.locator(`button[type="submit"]:has-text("${buttonText}")`)
    } else {
      submitButton = page.locator('button[type="submit"]')
    }

    if (await submitButton.isVisible()) {
      await submitButton.click()
    }
  }

  /**
   * Check if page has form validation errors
   */
  static async hasValidationErrors(page: Page): Promise<boolean> {
    const invalidInputs = page.locator('input:invalid, textarea:invalid, select:invalid')
    return (await invalidInputs.count()) > 0
  }

  /**
   * Get all validation error messages
   */
  static async getValidationErrors(page: Page): Promise<string[]> {
    const errors: string[] = []

    const invalidInputs = await page.locator('input:invalid, textarea:invalid').count()
    for (let i = 0; i < invalidInputs; i++) {
      const input = page.locator('input:invalid, textarea:invalid').nth(i)
      const validationMessage = await input.evaluate((el: HTMLInputElement) => el.validationMessage)
      if (validationMessage) {
        errors.push(validationMessage)
      }
    }

    return errors
  }

  /**
   * Navigate to page and wait for load
   */
  static async navigateAndWait(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForLoadState('domcontentloaded')
  }

  /**
   * Check if modal/dialog is visible
   */
  static async isModalVisible(page: Page, title?: string): Promise<boolean> {
    const modal = title
      ? page.locator(`[role="dialog"]:has-text("${title}"), .modal:has-text("${title}")`)
      : page.locator('[role="dialog"], .modal')

    return await modal.isVisible()
  }

  /**
   * Close modal
   */
  static async closeModal(page: Page): Promise<void> {
    const closeButton = page.locator('[aria-label="close"], [aria-label="Close"], button:has-text("×")')

    if (await closeButton.isVisible()) {
      await closeButton.click()
      await page.waitForTimeout(300)
    }
  }

  /**
   * Check if loading spinner is visible
   */
  static async isLoading(page: Page): Promise<boolean> {
    const loaders = [
      '[role="status"]',
      '.spinner',
      '.loading',
      '[data-testid="loader"]',
      '.animate-spin',
    ]

    for (const selector of loaders) {
      const element = page.locator(selector)
      if (await element.isVisible()) {
        return true
      }
    }

    return false
  }

  /**
   * Wait for loading to complete
   */
  static async waitForLoadingComplete(page: Page, timeout = 10000): Promise<void> {
    const loaders = page.locator('[role="status"], .spinner, .loading, [data-testid="loader"]')

    await loaders.first().waitFor({ state: 'hidden', timeout }).catch(() => {
      // Loader might not exist, which is fine
    })
  }

  /**
   * Get all text from page
   */
  static async getPageText(page: Page): Promise<string> {
    return await page.evaluate(() => document.body.innerText)
  }

  /**
   * Search for text on page
   */
  static async hasText(page: Page, text: string, caseSensitive = false): Promise<boolean> {
    const content = await TestHelpers.getPageText(page)

    if (caseSensitive) {
      return content.includes(text)
    } else {
      return content.toLowerCase().includes(text.toLowerCase())
    }
  }

  /**
   * Take screenshot with timestamp
   */
  static async takeTimestampedScreenshot(
    page: Page,
    directory = 'screenshots',
    prefix = 'screenshot'
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${prefix}-${timestamp}.png`
    const path = `${directory}/${filename}`

    await page.screenshot({ path })
    return path
  }

  /**
   * Record current time for later comparison
   */
  static recordTime(): number {
    return Date.now()
  }

  /**
   * Get elapsed time since recorded time
   */
  static getElapsedTime(startTime: number): number {
    return Date.now() - startTime
  }

  /**
   * Format bytes to readable size
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Get current date in locale format
   */
  static getCurrentDate(locale = 'es-MX'): string {
    return new Date().toLocaleDateString(locale)
  }

  /**
   * Format date for input fields
   */
  static formatDateForInput(date: Date | string): string {
    if (typeof date === 'string') {
      return date // Assume already formatted
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  /**
   * Generate unique ID
   */
  static generateId(prefix = 'id'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastError: Error | undefined

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        if (i < maxRetries - 1) {
          await TestHelpers.delay(delayMs * Math.pow(2, i))
        }
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }
}
