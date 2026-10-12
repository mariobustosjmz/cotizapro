import { test, expect, type APIRequestContext } from '@playwright/test'
import { demoAccessToken } from '../helpers/demo-auth'

// Requiere el seed demo: SEED_DEMO_PASSWORD=... pnpm seed
const OWNER = 'direccion@megaglass.demo.cotizapro.mx'

interface Ctx {
  readonly api: APIRequestContext
  readonly headers: Record<string, string>
}

async function setup(playwright: typeof import('@playwright/test')['request'], baseURL: string): Promise<Ctx> {
  const token = await demoAccessToken(OWNER)
  return { api: await playwright.newContext({ baseURL }), headers: { Authorization: `Bearer ${token}` } }
}

async function showerServiceId(ctx: Ctx): Promise<string> {
  const res = await ctx.api.get('/api/services', { headers: ctx.headers })
  const body: { data?: { id: string; name: string }[]; services?: { id: string; name: string }[] } = await res.json()
  const list = body.data ?? body.services ?? []
  const svc = list.find((s) => s.name === 'Cancel de baño templado')
  expect(svc, 'servicio sembrado').toBeTruthy()
  return svc!.id
}

async function firstClientId(ctx: Ctx): Promise<string> {
  const res = await ctx.api.get('/api/clients', { headers: ctx.headers })
  const body: { clients: { id: string }[] } = await res.json()
  return body.clients[0]!.id
}

const SHOWER_INPUT = { ancho: 1200, alto: 1800, piezas: 2, espesor: '9', herraje: 'corredizo-acero', instalacion: true }

test.describe('Producto configurable (API)', () => {
  test('el servidor recalcula e ignora el precio enviado por el cliente', async ({ playwright, baseURL }) => {
    const ctx = await setup(playwright.request, baseURL!)
    const [serviceId, clientId] = await Promise.all([showerServiceId(ctx), firstClientId(ctx)])
    const res = await ctx.api.post('/api/quotes', {
      headers: ctx.headers,
      data: {
        client_id: clientId,
        valid_until: new Date(Date.now() + 15 * 86_400_000).toISOString(),
        discount_rate: 0,
        items: [{ service_id: serviceId, description: 'precio manipulado', quantity: 1, unit_price: 1, unit_type: 'fixed', input: SHOWER_INPUT }],
      },
    })
    expect(res.status()).toBe(201)
    const quote: { data: { id: string; subtotal: number; items: { subtotal: number; description: string; breakdown: { subtotalCents: number } }[] } } = await res.json()
    expect(Number(quote.data.subtotal)).toBe(15900.8)
    expect(quote.data.items[0]!.description).toContain('Cancel de baño templado')
    expect(quote.data.items[0]!.breakdown.subtotalCents).toBe(1590080)
  })

  test('una combinación sin precio se rechaza con 422 y no guarda nada', async ({ playwright, baseURL }) => {
    const ctx = await setup(playwright.request, baseURL!)
    const [serviceId, clientId] = await Promise.all([showerServiceId(ctx), firstClientId(ctx)])
    const res = await ctx.api.post('/api/quotes', {
      headers: ctx.headers,
      data: {
        client_id: clientId,
        valid_until: new Date(Date.now() + 15 * 86_400_000).toISOString(),
        items: [{ service_id: serviceId, description: 'x', quantity: 1, unit_price: 1, unit_type: 'fixed', input: { ...SHOWER_INPUT, espesor: '19' } }],
      },
    })
    expect(res.status()).toBe(422)
    const body: { errors: string[] } = await res.json()
    expect(body.errors[0]).toMatch(/^Partida 1:/)
  })

  test('subir precios no altera cotizaciones ya guardadas', async ({ playwright, baseURL }) => {
    const ctx = await setup(playwright.request, baseURL!)
    const [serviceId, clientId] = await Promise.all([showerServiceId(ctx), firstClientId(ctx)])
    const created = await ctx.api.post('/api/quotes', {
      headers: ctx.headers,
      data: { client_id: clientId, valid_until: new Date(Date.now() + 15 * 86_400_000).toISOString(), items: [{ service_id: serviceId, description: 'x', quantity: 1, unit_price: 1, unit_type: 'fixed', input: SHOWER_INPUT }] },
    })
    const quoteId = ((await created.json()) as { data: { id: string } }).data.id

    const lists: { data: { id: string; name: string }[] } = await (await ctx.api.get('/api/price-lists', { headers: ctx.headers })).json()
    const templado = lists.data.find((l) => l.name === 'Vidrio templado')!
    const up = await ctx.api.patch(`/api/price-lists/${templado.id}`, { headers: ctx.headers, data: { adjust_percent: 10 } })
    expect(up.status()).toBe(200)
    try {
      const reread: { data: { subtotal: number } } = await (await ctx.api.get(`/api/quotes/${quoteId}`, { headers: ctx.headers })).json()
      expect(Number(reread.data.subtotal)).toBe(15900.8)
      const preview = await ctx.api.post('/api/pricing/preview', { headers: ctx.headers, data: { service_id: serviceId, input: SHOWER_INPUT } })
      const p: { data: { subtotalCents: number } } = await preview.json()
      expect(p.data.subtotalCents).toBeGreaterThan(1590080)
    } finally {
      const back = 100 / 1.1 - 100
      await ctx.api.patch(`/api/price-lists/${templado.id}`, { headers: ctx.headers, data: { adjust_percent: back } })
    }
  })
})
