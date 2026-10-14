import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { DEMO_PASSWORD, demoAccessToken } from '../helpers/demo-auth'
import { MEGAGLASS_ORG_ID, resetAiUsage } from '../helpers/ai-usage'
import { AuthPage } from '../pages/auth.page'

// Requiere el seed demo y AI_BASE_URL apuntando a la IA falsa (/api/dev/fake-ai/v1).
const OWNER = 'direccion@megaglass.demo.cotizapro.mx'
const MEMBER = 'instalador@megaglass.demo.cotizapro.mx'
const HEADLINE = 'Cancelería y vidrio templado a la medida en Monterrey'
const BIO_START = /^Fabricamos e instalamos canceles de baño/

async function login(page: Page, email: string): Promise<void> {
  const auth = new AuthPage(page)
  await auth.goToLogin()
  await auth.login(email, DEMO_PASSWORD)
}

async function creditsUsed(api: APIRequestContext, email: string): Promise<number> {
  const token = await demoAccessToken(email)
  const res = await api.get('/api/ai/status', { headers: { Authorization: `Bearer ${token}` } })
  const body: { data: { summary: { used: number } } } = await res.json()
  return body.data.summary.used
}

test.describe('IA: textos de la vitrina', () => {
  test.beforeAll(async () => {
    await resetAiUsage(MEGAGLASS_ORG_ID)
  })

  test.afterAll(async () => {
    await resetAiUsage(MEGAGLASS_ORG_ID)
  })

  test('propone frase y descripción, se aceptan por campo, nada se guarda solo y cobra 2 créditos', async ({ page, request }) => {
    const before = await creditsUsed(request, OWNER)
    await login(page, OWNER)
    await page.goto('/dashboard/vitrina')
    const headline = page.locator('#vitrina-headline')
    const bio = page.locator('#vitrina-bio')
    const originalHeadline = await headline.inputValue()
    const originalBio = await bio.inputValue()

    await expect(page.getByTestId('vitrina-ai-generate')).toContainText('Proponer textos con IA')
    await page.getByTestId('vitrina-ai-generate').click()
    await expect(page.getByTestId('vitrina-ai-proposal')).toBeVisible()
    await expect(page.getByTestId('vitrina-ai-headline')).toContainText(HEADLINE)
    await expect(page.getByTestId('vitrina-ai-bio')).toContainText('Fabricamos e instalamos canceles de baño')
    await expect(headline).toHaveValue(originalHeadline)
    await expect(bio).toHaveValue(originalBio)

    await page.getByTestId('vitrina-ai-accept-headline').click()
    await expect(headline).toHaveValue(HEADLINE)
    await expect(bio).toHaveValue(originalBio)
    await expect(page.getByTestId('vitrina-ai-notice')).toBeVisible()
    await expect(page.getByTestId('vitrina-ai-bio')).toBeVisible()

    await page.getByTestId('vitrina-ai-accept-bio').click()
    await expect(bio).toHaveValue(BIO_START)
    await expect(page.getByTestId('vitrina-ai-proposal')).toHaveCount(0)

    await page.reload()
    await expect(page.locator('#vitrina-headline')).toHaveValue(originalHeadline)
    await expect(page.locator('#vitrina-bio')).toHaveValue(originalBio)

    expect(await creditsUsed(request, OWNER)).toBe(before + 2)
  })

  test('descartar deja los campos como estaban', async ({ page }) => {
    await login(page, OWNER)
    await page.goto('/dashboard/vitrina')
    const original = await page.locator('#vitrina-headline').inputValue()
    await page.getByTestId('vitrina-ai-generate').click()
    await expect(page.getByTestId('vitrina-ai-proposal')).toBeVisible()
    await page.getByTestId('vitrina-ai-discard').click()
    await expect(page.getByTestId('vitrina-ai-proposal')).toHaveCount(0)
    await expect(page.locator('#vitrina-headline')).toHaveValue(original)
  })

  test('un miembro no ve el botón y la API le responde 403 sin cobrar', async ({ page, request }) => {
    const before = await creditsUsed(request, MEMBER)
    await login(page, MEMBER)
    await page.goto('/dashboard/vitrina')
    await expect(page.locator('#vitrina-headline')).toBeVisible()
    await expect(page.getByTestId('vitrina-ai-generate')).toHaveCount(0)
    const token = await demoAccessToken(MEMBER)
    const res = await request.post('/api/ai/showcase-texts', { headers: { Authorization: `Bearer ${token}` } })
    expect(res.status()).toBe(403)
    expect(await creditsUsed(request, MEMBER)).toBe(before)
  })
})
