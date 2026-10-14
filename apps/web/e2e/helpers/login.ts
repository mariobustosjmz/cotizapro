import type { Page } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { DEMO_PASSWORD } from './demo-auth'

export async function loginAsDemo(page: Page, email: string): Promise<void> {
  const auth = new AuthPage(page)
  await auth.goToLogin()
  await auth.login(email, DEMO_PASSWORD)
}
