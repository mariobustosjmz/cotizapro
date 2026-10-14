import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { resetAiUsage } from '../helpers/ai-usage'
import { DON_BETO_ORG, DON_BETO_OWNER, NON_ADMIN_EMAIL, SUPERADMIN_EMAIL, grantPlatformAdmin, revokePlatformAdmin } from '../helpers/billing-admin'
import { chooseComboboxOption } from '../helpers/combobox'
import { demoAccessToken } from '../helpers/demo-auth'
import { loginAsDemo } from '../helpers/login'

// Requiere 042 (superadmin), 043 (créditos de IA) y el seed demo. Opera sobre Plomería Don Beto.
test.describe.configure({ mode: 'serial' })

const toggle = (page: Page) => page.getByTestId(`admin-ai-toggle-${DON_BETO_ORG}`)
const byId = (page: Page, name: string) => page.getByTestId(`admin-ai-${name}-${DON_BETO_ORG}`)

async function ownerPackCredits(api: APIRequestContext): Promise<number> {
  const token = await demoAccessToken(DON_BETO_OWNER)
  const res = await api.get('/api/ai/status', { headers: { Authorization: `Bearer ${token}` } })
  const body: { data: { summary: { pack_credits: number } } } = await res.json()
  return body.data.summary.pack_credits
}

async function openPanel(page: Page): Promise<void> {
  await page.goto('/admin?q=plomeria-don-beto')
  await toggle(page).click()
}

async function fillPackAndReview(page: Page, reference: string): Promise<void> {
  await byId(page, 'credits-200').click()
  await chooseComboboxOption(page, 'source', 'Paquete')
  await byId(page, 'reference').fill(reference)
  await byId(page, 'grant').click()
}

test.describe('/admin: créditos de IA', () => {
  test.beforeAll(async () => {
    await grantPlatformAdmin(SUPERADMIN_EMAIL)
  })

  test.beforeEach(async () => {
    await resetAiUsage(DON_BETO_ORG)
  })

  test.afterAll(async () => {
    try {
      await resetAiUsage(DON_BETO_ORG)
    } finally {
      await revokePlatformAdmin(SUPERADMIN_EMAIL)
    }
  })

  test('el superadmin ve el uso, confirma y agrega un paquete que la empresa ve de inmediato', async ({ page, request }) => {
    await loginAsDemo(page, SUPERADMIN_EMAIL)
    await openPanel(page)
    await expect(byId(page, 'used')).toHaveText('0')
    await expect(byId(page, 'packs')).toHaveText('0')
    await expect(page.getByText(/Se reinicia el \d{1,2} de \p{L}+ de \d{4}/u)).toBeVisible()

    await fillPackAndReview(page, `MP-E2E-IA-${Date.now()}`)
    await expect(byId(page, 'confirm-text')).toContainText('200 créditos')
    expect(await ownerPackCredits(request)).toBe(0)

    await byId(page, 'confirm').click()
    await expect(page.getByRole('alert').filter({ hasText: 'Se agregaron 200 créditos' })).toBeVisible()
    await expect(byId(page, 'confirm')).toHaveCount(0)
    expect(await ownerPackCredits(request)).toBe(200)

    await toggle(page).click()
    await expect(byId(page, 'packs')).toHaveText('200')
  })

  test('la misma referencia de pago no se acredita dos veces', async ({ page, request }) => {
    const reference = `MP-E2E-DUP-${Date.now()}`
    await loginAsDemo(page, SUPERADMIN_EMAIL)
    await openPanel(page)
    await fillPackAndReview(page, reference)
    await byId(page, 'confirm').click()
    await expect(byId(page, 'confirm')).toHaveCount(0)

    await toggle(page).click()
    await fillPackAndReview(page, reference)
    await byId(page, 'confirm').click()
    await expect(byId(page, 'error')).toHaveText('Ese pago ya se acreditó')
    await expect(byId(page, 'packs')).toHaveText('200')
    expect(await ownerPackCredits(request)).toBe(200)
  })

  test('un paquete sin referencia y una cantidad fuera de rango muestran errores en español', async ({ page }) => {
    await loginAsDemo(page, SUPERADMIN_EMAIL)
    await openPanel(page)
    await byId(page, 'grant').click()
    await expect(page.getByText('Escribe la referencia del pago')).toBeVisible()
    await expect(byId(page, 'confirm')).toHaveCount(0)

    await byId(page, 'credits-input').evaluate((el: HTMLInputElement) => { el.removeAttribute('max'); el.removeAttribute('min') })
    await byId(page, 'credits-input').fill('100001')
    await byId(page, 'grant').click()
    await expect(page.getByText('Los créditos deben ser entre 1 y 100,000')).toBeVisible()
    await expect(byId(page, 'confirm')).toHaveCount(0)
  })

  test('alguien que no es superadmin no puede ver ni agregar créditos', async ({ request }) => {
    const before = await ownerPackCredits(request)
    const token = await demoAccessToken(NON_ADMIN_EMAIL)
    const headers = { Authorization: `Bearer ${token}` }
    const url = `/api/admin/organizations/${DON_BETO_ORG}/ai-credits`
    expect((await request.get(url, { headers })).status()).toBe(404)
    expect((await request.post(url, { headers, data: { credits: 200, source: 'pack', reference: 'MP-E2E-NOADMIN' } })).status()).toBe(404)
    expect(await ownerPackCredits(request)).toBe(before)
  })

  test('sin sesión recibe 404 (la guarda no revela la ruta)', async ({ request }) => {
    const res = await request.post(`/api/admin/organizations/${DON_BETO_ORG}/ai-credits`, { data: { credits: 200, source: 'pack', reference: 'MP-E2E-ANON' } })
    expect(res.status()).toBe(404)
  })
})
