import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Login Page
  async goToLogin() {
    await this.goto('/login')
  }

  async login(email: string, password: string) {
    await this.page.locator('input[name="email"]').fill(email)
    await this.page.locator('input[name="password"]').fill(password)
    await this.page.locator('button[type="submit"]').click()
    await this.page.waitForURL('**/dashboard', { timeout: 10000 })
  }

  async fillLoginForm(email: string, password: string) {
    const emailInput = this.page.locator('input[name="email"]')
    const passwordInput = this.page.locator('input[name="password"]')

    await emailInput.fill(email)
    await passwordInput.fill(password)
  }

  async submitLoginForm() {
    await this.page.locator('button[type="submit"]').click()
  }

  async getLoginErrorMessage(): Promise<string> {
    const errorElement = this.page.locator('[role="alert"], .error-message')
    return await this.getText(errorElement)
  }

  // Signup Page
  async goToSignup() {
    await this.goto('/signup')
  }

  async signup(email: string, password: string, confirmPassword: string) {
    await this.page.locator('input[name="email"]').fill(email)
    await this.page.locator('input[name="password"]').fill(password)
    await this.page.locator('input[name="confirmPassword"]').fill(confirmPassword)
    await this.page.locator('button[type="submit"]').click()
  }

  async fillSignupForm(email: string, password: string, confirmPassword: string) {
    const emailInput = this.page.locator('input[name="email"]')
    const passwordInput = this.page.locator('input[name="password"]')
    const confirmInput = this.page.locator('input[name="confirmPassword"]')

    await emailInput.fill(email)
    await passwordInput.fill(password)
    await confirmInput.fill(confirmPassword)
  }

  async submitSignupForm() {
    await this.page.locator('button[type="submit"]').click()
  }

  // Password Reset
  async goToForgotPassword() {
    await this.goto('/forgot-password')
  }

  async requestPasswordReset(email: string) {
    const emailInput = this.page.locator('input[name="email"]')
    await emailInput.fill(email)
    await this.page.locator('button[type="submit"]').click()
  }

  async isLoginPageVisible(): Promise<boolean> {
    return await this.page.locator('h2:has-text("Inicia sesión en tu cuenta")').isVisible()
  }

  async isSignupPageVisible(): Promise<boolean> {
    return await this.page.locator('h2:has-text("Crea tu cuenta")').isVisible()
  }

  async getSignupLink(): Promise<string> {
    return (await this.page.locator('a:has-text("crea una cuenta gratis")').getAttribute('href')) || ''
  }

  async getLoginLink(): Promise<string> {
    return (await this.page.locator('a:has-text("Inicia sesión")').getAttribute('href')) || ''
  }
}
