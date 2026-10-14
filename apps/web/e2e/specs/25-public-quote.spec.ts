import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { DEMO_PASSWORD, demoAccessToken } from '../helpers/demo-auth'

// Requiere el seed demo (megaglass-demo) y la migración 041 aplicada en la base local.
const OWNER = 'direccion@megaglass.demo.cotizapro.mx'
const BUSINESS = 'MEGAGLASS Demo'
const TOKEN_PATH = /\/c\/([a-f0-9]{64})$/

interface Ctx {
  readonly api: APIRequestContext
  readonly headers: Record<string, string>
}

interface SentQuote {
  readonly id: string
  readonly token: string
  readonly total: number
}

interface QuoteRow {
  readonly status: string
  readonly total: number | string
  readonly accepted_at: string | null
  readonly accepted_by_name: string | null
}

function money(value: number): string {
  return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Rango de documentación (RFC 5737): cada prueba usa otra IP y no agota el límite por IP de respond. */
function testClientIp(): string {
  return `198.51.100.${1 + Math.floor(Math.random() * 250)}`
}

async function ownerCtx(api: APIRequestContext): Promise<Ctx> {
  return { api, headers: { Authorization: `Bearer ${await demoAccessToken(OWNER)}` } }
}

async function getQuote(ctx: Ctx, id: string): Promise<QuoteRow> {
  const res = await ctx.api.get(`/api/quotes/${id}`, { headers: ctx.headers })
  expect(res.ok(), await res.text()).toBeTruthy()
  return ((await res.json()) as { data: QuoteRow }).data
}

async function createSentQuote(ctx: Ctx): Promise<SentQuote> {
  const clients: { clients: { id: string }[] } = await (await ctx.api.get('/api/clients', { headers: ctx.headers })).json()
  const created = await ctx.api.post('/api/quotes', {
    headers: ctx.headers,
    data: {
      client_id: clients.clients[0]!.id,
      valid_until: new Date(Date.now() + 15 * 86_400_000).toISOString(),
      items: [{ description: 'Cancel de baño templado E2E', quantity: 1, unit_price: 1500, unit_type: 'fixed' }],
    },
  })
  expect(created.status(), await created.text()).toBe(201)
  const id = ((await created.json()) as { data: { id: string } }).data.id
  const sent = await ctx.api.post(`/api/quotes/${id}/send`, { headers: ctx.headers, data: { send_via: ['whatsapp'], whatsapp_override: '8112345678' } })
  expect(sent.status(), await sent.text()).toBe(200)
  const body: { share_url: string; status_updated: boolean; results: { whatsapp: { url: string } } } = await sent.json()
  const match = TOKEN_PATH.exec(new URL(body.share_url).pathname)
  expect(match, body.share_url).not.toBeNull()
  expect(decodeURIComponent(body.results.whatsapp.url)).toContain('Revísala y acéptala aquí:')
  const quote = await getQuote(ctx, id)
  expect(quote.status).toBe('sent')
  return { id, token: match![1]!, total: Number(quote.total) }
}

async function acceptedRevenue(ctx: Ctx): Promise<number> {
  const res = await ctx.api.get('/api/analytics/trends?period=week&metric=revenue', { headers: ctx.headers })
  expect(res.ok(), await res.text()).toBeTruthy()
  const body: { trends: { revenue?: { amount: number }[] } } = await res.json()
  return (body.trends.revenue ?? []).reduce((sum, row) => sum + row.amount, 0)
}

async function anonymousPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': testClientIp() } })
  return context.newPage()
}

async function loginAsOwner(page: Page): Promise<void> {
  await page.goto('/login')
  await page.locator('input[name="email"]').fill(OWNER)
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
}

test.describe('Cotización pública con Aceptar y anticipo', () => {
  test('el cliente abre la liga sin sesión, ve el anticipo, acepta y el negocio la ve aceptada', async ({ playwright, baseURL, browser, page }) => {
    const ctx = await ownerCtx(await playwright.request.newContext({ baseURL }))
    const quote = await createSentQuote(ctx)
    const revenueBefore = await acceptedRevenue(ctx)
    const client = await anonymousPage(browser)

    await client.goto(`/c/${quote.token}`)
    await expect(client.getByRole('heading', { level: 1 })).toHaveText(BUSINESS)
    await expect(client.getByTestId('public-quote-total')).toContainText(`$${money(quote.total)}`)
    const deposit = client.getByTestId('deposit-card')
    await expect(deposit).toContainText(`Anticipo: $${money(Math.round(quote.total * 50) / 100)} (50 %)`)
    await expect(deposit).toContainText(`El pago lo recibe directamente ${BUSINESS}`)
    await expect(client.getByRole('link', { name: 'Tengo dudas' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+\?text=/)
    await expect.poll(async () => (await getQuote(ctx, quote.id)).status).toBe('viewed')

    await client.getByRole('button', { name: 'Aceptar cotización' }).click()
    await client.getByLabel('Tu nombre').fill('Laura Pérez E2E')
    await client.getByRole('button', { name: 'Confirmar aceptación' }).click()
    await expect(client.getByTestId('quote-status-banner')).toContainText('Cotización aceptada')
    await expect(client.getByRole('button', { name: 'Aceptar cotización' })).toHaveCount(0)

    const again = await client.request.post(`/api/public/quotes/${quote.token}/respond`, { data: { action: 'accept', name: 'Otra Persona' } })
    expect(again.status(), await again.text()).toBe(200)
    expect(((await again.json()) as { data: { changed: boolean } }).data.changed).toBe(false)

    const accepted = await getQuote(ctx, quote.id)
    expect(accepted.status).toBe('accepted')
    expect(accepted.accepted_at).not.toBeNull()
    expect(accepted.accepted_by_name).toBe('Laura Pérez E2E')
    await expect.poll(() => acceptedRevenue(ctx)).toBeGreaterThanOrEqual(revenueBefore + quote.total - 0.01)

    await loginAsOwner(page)
    await page.goto(`/dashboard/quotes/${quote.id}`)
    await expect(page.getByTestId('client-response-card')).toContainText('Aceptada desde la liga')
    await expect(page.getByTestId('client-response-card')).toContainText('Laura Pérez E2E')
    await client.context().close()
  })

  test('una liga revocada o mal formada muestra "Liga no disponible" y su PDF responde 404', async ({ playwright, baseURL, browser }) => {
    const ctx = await ownerCtx(await playwright.request.newContext({ baseURL }))
    const quote = await createSentQuote(ctx)
    const client = await anonymousPage(browser)

    const pdf = await client.request.get(`/api/public/quotes/${quote.token}/pdf`)
    expect(pdf.status()).toBe(200)
    expect(pdf.headers()['content-type']).toContain('application/pdf')

    const revoked = await ctx.api.delete(`/api/quotes/${quote.id}/share`, { headers: ctx.headers })
    expect(revoked.status(), await revoked.text()).toBe(200)
    await client.goto(`/c/${quote.token}`)
    await expect(client.getByRole('heading', { name: 'Liga no disponible' })).toBeVisible()
    expect((await client.request.get(`/api/public/quotes/${quote.token}/pdf`)).status()).toBe(404)

    await client.goto('/c/no-es-un-token')
    await expect(client.getByRole('heading', { name: 'Liga no disponible' })).toBeVisible()
    await client.context().close()
  })

  test('el negocio abre su propia liga en vista previa: no marca "Vista" ni puede responder', async ({ playwright, baseURL, page }) => {
    const ctx = await ownerCtx(await playwright.request.newContext({ baseURL }))
    const quote = await createSentQuote(ctx)

    await loginAsOwner(page)
    await page.goto(`/c/${quote.token}`)
    await expect(page.getByTestId('quote-status-banner')).toContainText('Vista previa')
    await expect(page.getByRole('button', { name: 'Aceptar cotización' })).toHaveCount(0)
    const res = await page.request.post(`/api/public/quotes/${quote.token}/respond`, { data: { action: 'accept' } })
    expect(res.status()).toBe(403)
    expect((await getQuote(ctx, quote.id)).status).toBe('sent')
  })

  test('una cotización vista por el cliente se puede aceptar a mano desde el detalle', async ({ playwright, baseURL, browser, page }) => {
    const ctx = await ownerCtx(await playwright.request.newContext({ baseURL }))
    const quote = await createSentQuote(ctx)
    const client = await anonymousPage(browser)
    await client.goto(`/c/${quote.token}`)
    await expect.poll(async () => (await getQuote(ctx, quote.id)).status).toBe('viewed')

    await loginAsOwner(page)
    await page.goto(`/dashboard/quotes/${quote.id}`)
    await expect(page.getByTestId('client-response-card')).toContainText('Vista por el cliente')
    await page.getByRole('button', { name: 'Aceptar', exact: true }).click()
    await expect.poll(async () => (await getQuote(ctx, quote.id)).status).toBe('accepted')
    await client.context().close()
  })

  test('anticipo 0 en la cotización oculta la tarjeta de anticipo', async ({ playwright, baseURL, browser }) => {
    const ctx = await ownerCtx(await playwright.request.newContext({ baseURL }))
    const quote = await createSentQuote(ctx)
    const res = await ctx.api.patch(`/api/quotes/${quote.id}`, { headers: ctx.headers, data: { deposit_percent: 0 } })
    expect(res.status(), await res.text()).toBe(200)

    const client = await anonymousPage(browser)
    await client.goto(`/c/${quote.token}`)
    await expect(client.getByRole('button', { name: 'Aceptar cotización' })).toBeVisible()
    await expect(client.getByTestId('deposit-card')).toHaveCount(0)
    await client.context().close()
  })

  test('Configuración → Empresa muestra la sección Anticipo', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard/settings')
    await page.getByRole('button', { name: 'Empresa' }).click()
    await expect(page.getByLabel('Anticipo (%)')).toBeVisible()
    await expect(page.getByLabel('Liga de pago')).toBeVisible()
    await expect(page.getByLabel('Instrucciones de pago')).toBeVisible()
  })
})
