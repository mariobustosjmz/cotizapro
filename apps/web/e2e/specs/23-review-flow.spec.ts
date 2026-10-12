import { test, expect, type APIRequestContext } from '@playwright/test'
import { demoAccessToken } from '../helpers/demo-auth'

// Requiere el seed demo: crea una cotización propia, la lleva a "cobrado" y completa la reseña.
const OWNER = 'direccion@megaglass.demo.cotizapro.mx'
const SLUG = 'megaglass-demo'
const PATH_TO_PAID = ['sent', 'accepted', 'en_instalacion', 'completado', 'cobrado'] as const

interface Ctx {
  readonly api: APIRequestContext
  readonly headers: Record<string, string>
}

async function createPaidQuote(ctx: Ctx): Promise<string> {
  const clients: { clients: { id: string }[] } = await (await ctx.api.get('/api/clients', { headers: ctx.headers })).json()
  const created = await ctx.api.post('/api/quotes', {
    headers: ctx.headers,
    data: {
      client_id: clients.clients[0]!.id,
      valid_until: new Date(Date.now() + 15 * 86_400_000).toISOString(),
      items: [{ description: 'Instalación de mampara E2E', quantity: 1, unit_price: 1500, unit_type: 'fixed' }],
    },
  })
  expect(created.status(), await created.text()).toBe(201)
  const id = ((await created.json()) as { data: { id: string } }).data.id
  for (const status of PATH_TO_PAID) {
    const res = await ctx.api.patch(`/api/quotes/${id}`, { headers: ctx.headers, data: { status } })
    expect(res.status(), `${status}: ${await res.text()}`).toBe(200)
  }
  return id
}

test.describe('Reseña verificada', () => {
  test('liga de un solo uso: cotización cobrada → cliente califica → aparece en la vitrina', async ({ playwright, baseURL, page }) => {
    const ctx: Ctx = { api: await playwright.request.newContext({ baseURL }), headers: { Authorization: `Bearer ${await demoAccessToken(OWNER)}` } }
    const quoteId = await createPaidQuote(ctx)

    const reqRes = await ctx.api.post(`/api/quotes/${quoteId}/review-request`, { headers: ctx.headers })
    expect(reqRes.status(), await reqRes.text()).toBe(201)
    const link: { data: { url: string; whatsapp_url: string | null } } = await reqRes.json()
    const token = new URL(link.data.url).pathname.split('/').pop()!
    expect(token).toMatch(/^[a-f0-9]{48}$/)

    const comment = `Excelente trabajo E2E ${Date.now()}`
    await page.goto(`/r/${token}`)
    await page.getByRole('radio', { name: '5 estrellas', exact: true }).click()
    await page.locator('textarea').fill(comment)
    await page.getByRole('button', { name: /Enviar/ }).click()
    await expect(page.getByText(/Gracias/)).toBeVisible()

    const again = await ctx.api.post(`/api/quotes/${quoteId}/review-request`, { headers: ctx.headers })
    expect(again.status()).toBe(409)

    const reuse = await ctx.api.post('/api/public/reviews', { data: { token, rating: 1 } })
    expect(reuse.status()).toBeGreaterThanOrEqual(400)

    await page.goto(`/p/${SLUG}`)
    await expect(page.getByText(comment)).toBeVisible()
  })

  test('no se puede pedir reseña de una cotización no cobrada', async ({ playwright, baseURL }) => {
    const ctx: Ctx = { api: await playwright.request.newContext({ baseURL }), headers: { Authorization: `Bearer ${await demoAccessToken(OWNER)}` } }
    const clients: { clients: { id: string }[] } = await (await ctx.api.get('/api/clients', { headers: ctx.headers })).json()
    const created = await ctx.api.post('/api/quotes', {
      headers: ctx.headers,
      data: { client_id: clients.clients[0]!.id, valid_until: new Date(Date.now() + 86_400_000).toISOString(), items: [{ description: 'Borrador E2E', quantity: 1, unit_price: 100, unit_type: 'fixed' }] },
    })
    const id = ((await created.json()) as { data: { id: string } }).data.id
    const res = await ctx.api.post(`/api/quotes/${id}/review-request`, { headers: ctx.headers })
    expect(res.status()).toBe(409)
    await ctx.api.delete(`/api/quotes/${id}`, { headers: ctx.headers })
  })
})
