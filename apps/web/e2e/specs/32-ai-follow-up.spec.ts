import { test, expect } from '@playwright/test'
import { demoAccessToken, DEMO_PASSWORD } from '../helpers/demo-auth'
import { aiAdmin, MEGAGLASS_MEMBER, MEGAGLASS_ORG_ID, MEGAGLASS_OWNER, userIdByEmail } from '../helpers/ai-usage'
import { AuthPage } from '../pages/auth.page'

// Requiere el seed demo y AI_BASE_URL apuntando a la IA falsa (/api/dev/fake-ai/v1).
const ORG_ID = MEGAGLASS_ORG_ID
const OWNER = MEGAGLASS_OWNER
const MEMBER = MEGAGLASS_MEMBER
const DAY = 86_400_000

interface QuoteRow {
  readonly id: string
  readonly quote_number: string
  readonly sent_at: string | null
}

async function followUpEvents(since: string): Promise<number> {
  const { count, error } = await aiAdmin()
    .from('ai_usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ORG_ID)
    .eq('feature', 'follow_up')
    .gte('created_at', since)
  if (error) throw new Error(`No se pudo contar el uso de IA: ${error.message}`)
  return count ?? 0
}

async function pickSentQuote(): Promise<QuoteRow> {
  const { data } = await aiAdmin()
    .from('quotes')
    .select('id, quote_number, sent_at, clients!inner(name, phone, whatsapp_phone)')
    .eq('organization_id', ORG_ID)
    .eq('status', 'sent')
    .order('quote_number', { ascending: true })
    .not('clients.name', 'like', 'E2E%')
    .limit(20)
  const rows = (data ?? []) as unknown as (QuoteRow & { clients: { phone: string | null; whatsapp_phone: string | null } })[]
  const withPhone = rows.find((r) => r.clients.whatsapp_phone || r.clients.phone)
  if (!withPhone) throw new Error('El seed demo no tiene cotizaciones enviadas con teléfono')
  return withPhone
}

test.describe.configure({ mode: 'serial' })

test.describe('IA: seguimiento de cotizaciones', () => {
  const startedAt = new Date().toISOString()
  let quote: QuoteRow

  test.beforeAll(async () => {
    quote = await pickSentQuote()
    const { error } = await aiAdmin().from('quotes').update({ sent_at: new Date(Date.now() - 20 * DAY).toISOString() }).eq('id', quote.id)
    if (error) throw new Error(`No se pudo envejecer la cotización: ${error.message}`)
  })

  test.afterAll(async () => {
    const db = aiAdmin()
    if (quote) {
      const restored = await db.from('quotes').update({ sent_at: quote.sent_at }).eq('id', quote.id)
      if (restored.error) throw new Error(`No se restauró sent_at: ${restored.error.message}`)
    }
    const userIds = await Promise.all([userIdByEmail(OWNER), userIdByEmail(MEMBER)])
    const removed = await db
      .from('ai_usage_events')
      .delete()
      .eq('organization_id', ORG_ID)
      .eq('feature', 'follow_up')
      .in('user_id', userIds)
      .gte('created_at', startedAt)
    if (removed.error) throw new Error(`No se limpió el uso de IA: ${removed.error.message}`)
  })

  test('Inicio lista la cotización y el detalle escribe el seguimiento sin enviarlo', async ({ page }) => {
    const auth = new AuthPage(page)
    await auth.goToLogin()
    await auth.login(OWNER, DEMO_PASSWORD)

    const pending = page.getByTestId('follow-up-pending')
    await expect(pending).toContainText('Pendientes de seguimiento')
    await expect(pending.getByRole('listitem')).toHaveCount(5)
    await pending.getByText(quote.quote_number).click()

    await expect(page.getByTestId('follow-up-card')).toContainText('lleva 20 días sin responder')
    await expect(page.getByTestId('follow-up-generate')).toHaveText('Escribir seguimiento · 1 crédito')

    let outbound = 0
    page.on('request', (req) => {
      if (/wa\.me|api\.whatsapp/.test(req.url())) outbound += 1
    })
    await page.getByTestId('follow-up-generate').click()
    await expect(page.getByTestId('follow-up-text')).toHaveValue(/^Hola Laura, ¿pudiste revisar la cotización/)
    await expect(page.getByTestId('follow-up-whatsapp')).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+\?text=Hola%20Laura/)
    await expect(page.getByTestId('follow-up-copy')).toBeVisible()
    expect(outbound).toBe(0)
    expect(await followUpEvents(startedAt)).toBe(1)
  })

  test('una cotización en borrador responde 409 y no cobra', async ({ request }) => {
    const { data: draft } = await aiAdmin().from('quotes').select('id').eq('organization_id', ORG_ID).eq('status', 'draft').limit(1).single()
    const token = await demoAccessToken(MEMBER)
    const before = await followUpEvents(startedAt)
    const res = await request.post('/api/ai/follow-up', { headers: { Authorization: `Bearer ${token}` }, data: { quoteId: draft?.id } })
    expect(res.status()).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'not_eligible' })
    expect(await followUpEvents(startedAt)).toBe(before)
  })

  test('una cotización inexistente o inválida no cobra', async ({ request }) => {
    const token = await demoAccessToken(MEMBER)
    const before = await followUpEvents(startedAt)
    const headers = { Authorization: `Bearer ${token}` }
    const missing = await request.post('/api/ai/follow-up', { headers, data: { quoteId: '00000000-0000-0000-0000-000000000000' } })
    expect(missing.status()).toBe(404)
    const invalid = await request.post('/api/ai/follow-up', { headers, data: { quoteId: 'no-es-guid' } })
    expect(invalid.status()).toBe(400)
    expect(await followUpEvents(startedAt)).toBe(before)
  })
})
