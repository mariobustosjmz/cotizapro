import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { DEMO_PASSWORD, demoAccessToken } from '../helpers/demo-auth'
import { AuthPage } from '../pages/auth.page'
import { chooseComboboxOption } from '../helpers/combobox'
import {
  DON_BETO_ORG,
  DON_BETO_OWNER,
  E2E_REFERENCE_PREFIX,
  NON_ADMIN_EMAIL,
  SUPERADMIN_EMAIL,
  grantPlatformAdmin,
  restoreDonBeto,
  revokePlatformAdmin,
  setBillingPeriod,
} from '../helpers/billing-admin'

// Requiere el seed demo y la migración 042. Usa Plomería Don Beto y la deja como estaba al terminar.
const DAY = 86_400_000
test.describe.configure({ mode: 'serial' })

async function login(page: Page, email: string): Promise<void> {
  const auth = new AuthPage(page)
  await auth.goToLogin()
  await auth.login(email, DEMO_PASSWORD)
}

interface QuoteAttempt {
  readonly status: number
  readonly code: string | null
  readonly id: string | null
}

async function tryCreateQuote(api: APIRequestContext, token: string): Promise<QuoteAttempt> {
  const headers = { Authorization: `Bearer ${token}` }
  const clients: { clients: { id: string }[] } = await (await api.get('/api/clients', { headers })).json()
  const res = await api.post('/api/quotes', {
    headers,
    data: {
      client_id: clients.clients[0]!.id,
      valid_until: new Date(Date.now() + 15 * DAY).toISOString(),
      items: [{ description: 'Revisión de fuga E2E', quantity: 1, unit_price: 500, unit_type: 'fixed' }],
    },
  })
  const body: { code?: string; data?: { id: string } } = await res.json()
  return { status: res.status(), code: body.code ?? null, id: body.data?.id ?? null }
}

test.describe('Cobro semi-manual y vencimiento (D2)', () => {
  test.beforeAll(async () => {
    await restoreDonBeto()
    await grantPlatformAdmin(SUPERADMIN_EMAIL)
  })

  test.afterAll(async () => {
    await restoreDonBeto()
    await revokePlatformAdmin(SUPERADMIN_EMAIL)
  })

  test('quien no es superadmin ve 404 en /admin', async ({ page }) => {
    await login(page, NON_ADMIN_EMAIL)
    const res = await page.goto('/admin')
    expect(res?.status()).toBe(404)
  })

  test('las rutas de superadmin responden 404 a quien no lo es', async ({ playwright, baseURL }) => {
    const api = await playwright.request.newContext({ baseURL })
    const res = await api.post(`/api/admin/organizations/${DON_BETO_ORG}/activate`, {
      headers: { Authorization: `Bearer ${await demoAccessToken(DON_BETO_OWNER)}` },
      data: { plan: 'enterprise', users: 1, months: 12, reference: 'intento' },
    })
    expect(res.status()).toBe(404)
  })

  test('el superadmin activa Taller por 1 mes y la empresa ve el vencimiento', async ({ page, browser }) => {
    await login(page, SUPERADMIN_EMAIL)
    await page.goto('/admin?q=plomeria-don-beto')
    const row = page.getByTestId(`org-row-${DON_BETO_ORG}`)
    await row.getByRole('button', { name: 'Activar o renovar' }).click()
    await chooseComboboxOption(page, 'plan', 'Taller')
    await page.locator('#activate-reference').fill(`${E2E_REFERENCE_PREFIX}001`)
    await expect(page.getByTestId('activation-total')).toContainText('999')
    await page.getByRole('button', { name: 'Activar', exact: true }).click()
    await expect(row).toContainText(/Vence en (2[89]|3[01]) días/)

    const owner = await browser.newPage()
    await login(owner, DON_BETO_OWNER)
    await owner.goto('/dashboard/billing')
    await expect(owner.getByTestId('plan-status-line')).toContainText('Plan Taller · vence el')
    await expect(owner.getByTestId('plan-limits-table')).toBeVisible()
    await owner.close()
  })

  test('vencido: crear cotización da 402 y sale el banner rojo; al renovar se quita', async ({ page, playwright, baseURL }) => {
    await setBillingPeriod(DON_BETO_ORG, 'pro', new Date(Date.now() - 3_600_000))
    const api = await playwright.request.newContext({ baseURL })
    const ownerToken = await demoAccessToken(DON_BETO_OWNER)

    expect(await tryCreateQuote(api, ownerToken)).toMatchObject({ status: 402, code: 'PLAN_EXPIRED' })

    await login(page, DON_BETO_OWNER)
    await expect(page.getByTestId('plan-banner-danger')).toContainText('solo lectura')

    const renew = await api.post(`/api/admin/organizations/${DON_BETO_ORG}/activate`, {
      headers: { Authorization: `Bearer ${await demoAccessToken(SUPERADMIN_EMAIL)}` },
      data: { plan: 'pro', users: 1, months: 1, reference: `${E2E_REFERENCE_PREFIX}renew` },
    })
    expect(renew.status(), await renew.text()).toBe(200)

    const allowed = await tryCreateQuote(api, ownerToken)
    expect(allowed.status).toBe(201)
    if (allowed.id) await api.delete(`/api/quotes/${allowed.id}`, { headers: { Authorization: `Bearer ${ownerToken}` } })

    await page.reload()
    await expect(page.getByTestId('plan-banner-danger')).toHaveCount(0)
  })

  test('a 3 días de vencer sale el banner amarillo', async ({ page }) => {
    await setBillingPeriod(DON_BETO_ORG, 'pro', new Date(Date.now() + 3 * DAY - 3_600_000))
    await login(page, DON_BETO_OWNER)
    await expect(page.getByTestId('plan-banner-warning')).toContainText('vence en 3 días')
  })
})
