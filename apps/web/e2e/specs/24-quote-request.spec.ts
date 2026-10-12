import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { DEMO_PASSWORD, demoAccessToken } from '../helpers/demo-auth'

// Requiere el seed demo: SEED_DEMO_PASSWORD=... pnpm seed --only=megaglass-demo
const OWNER = 'direccion@megaglass.demo.cotizapro.mx'
const SLUG = 'megaglass-demo'

interface SubmittedRequest {
  readonly name: string
  readonly phone: string
  readonly measurements: string
}

interface ListedRequest {
  readonly id: string
  readonly name: string
  readonly status: string
  readonly client_id: string | null
}

function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

/** Rango de documentación (RFC 5737) para no agotar el límite por IP de la vitrina entre corridas. */
function testClientIp(): string {
  return `198.51.100.${1 + Math.floor(Math.random() * 250)}`
}

async function submitPublicRequest(api: APIRequestContext): Promise<SubmittedRequest> {
  const suffix = uniqueSuffix()
  const request: SubmittedRequest = {
    name: `E2E Solicitud ${suffix}`,
    phone: `81${suffix.slice(-8)}`,
    measurements: '1.50 x 2.00 m',
  }
  const res = await api.post('/api/public/quote-requests', {
    headers: { 'x-forwarded-for': testClientIp() },
    data: {
      slug: SLUG,
      name: request.name,
      phone: request.phone,
      email: '',
      message: 'Necesito un cancel de baño templado para regadera.',
      measurements: request.measurements,
      website: '',
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  return request
}

async function loginAsOwner(page: Page): Promise<void> {
  await page.goto('/login')
  await page.locator('input[name="email"]').fill(OWNER)
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
}

async function findListed(api: APIRequestContext, name: string): Promise<ListedRequest | undefined> {
  const token = await demoAccessToken(OWNER)
  const res = await api.get('/api/quote-requests', { headers: { Authorization: `Bearer ${token}` } })
  expect(res.ok()).toBeTruthy()
  const body: { data: ListedRequest[] } = await res.json()
  return body.data.find((r) => r.name === name)
}

function requestCard(page: Page, name: string) {
  return page.getByTestId('quote-request-card').filter({ hasText: name })
}

test.describe('Solicitudes de la vitrina', () => {
  test('una solicitud pública aparece en la bandeja y se convierte en cotización', async ({ page, request }) => {
    const submitted = await submitPublicRequest(request)
    await loginAsOwner(page)

    await page.goto('/dashboard/solicitudes')
    const card = requestCard(page, submitted.name)
    await expect(card).toBeVisible()
    await expect(card.getByText('Nueva', { exact: true })).toBeVisible()
    await expect(card.getByText(submitted.measurements)).toBeVisible()
    await expect(card.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      new RegExp(`^https://wa\\.me/52${submitted.phone}\\?text=`),
    )

    await card.getByRole('button', { name: 'Convertir en cotización' }).click()
    await page.waitForURL(/\/dashboard\/quotes\/new\?client_id=[0-9a-f-]{36}/, { timeout: 30000 })
    const clientId = new URL(page.url()).searchParams.get('client_id')
    await expect(page.locator('input[name="client_id"]')).toHaveValue(submitted.name, { timeout: 15000 })

    const listed = await findListed(request, submitted.name)
    expect(listed?.status).toBe('converted')
    expect(listed?.client_id).toBe(clientId)
  })

  test('una solicitud se puede descartar y restaurar', async ({ page, request }) => {
    const submitted = await submitPublicRequest(request)
    await loginAsOwner(page)

    await page.goto('/dashboard/solicitudes')
    await requestCard(page, submitted.name).getByRole('button', { name: 'Descartar' }).click()
    await expect(requestCard(page, submitted.name)).toHaveCount(0)

    await page.getByRole('tab', { name: 'Descartadas' }).click()
    const discarded = requestCard(page, submitted.name)
    await expect(discarded.getByText('Descartada', { exact: true })).toBeVisible()
    await discarded.getByRole('button', { name: 'Restaurar' }).click()
    await expect(requestCard(page, submitted.name)).toHaveCount(0)

    const listed = await findListed(request, submitted.name)
    expect(listed?.status).toBe('new')
  })
})
