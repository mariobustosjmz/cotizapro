import { Page } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'

export interface TestUser {
  email: string
  password: string
  id?: string
  organization_id?: string
}

export const testUsers = {
  owner: {
    email: 'owner@example.com',
    password: 'TestPassword123!',
  },
  admin: {
    email: 'admin@example.com',
    password: 'TestPassword123!',
  },
  member: {
    email: 'member@example.com',
    password: 'TestPassword123!',
  },
}

export async function loginAs(page: Page, user: TestUser) {
  const authPage = new AuthPage(page)
  await authPage.goToLogin()
  await authPage.login(user.email, user.password)
}

export async function logout(page: Page) {
  try {
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.goto('/login', { waitUntil: 'load' })
  } catch {
    await page.reload()
  }
}

export async function ensureLoggedIn(page: Page, user: TestUser) {
  const currentUrl = page.url()
  if (!currentUrl.includes('/dashboard')) {
    await loginAs(page, user)
  }
}
