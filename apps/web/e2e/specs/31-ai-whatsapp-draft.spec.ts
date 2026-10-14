import { test, expect, type Page } from '@playwright/test'
import { aiAdmin, MEGAGLASS_ORG_ID, MEGAGLASS_OWNER, resetAiUsage } from '../helpers/ai-usage'
import { loginAsDemo } from '../helpers/login'

// Requiere el seed demo, 043 aplicada y AI_BASE_URL apuntando a la IA falsa (/api/dev/fake-ai/v1).
// La IA falsa siempre responde Laura Treviño, 81 2345 6789, San Nicolás, un cancel y dos mosquiteros (lib/ai/dev/fake-model.ts).
const MESSAGE =
  'Hola buenas tardes, soy Laura Treviño, vivo en San Nicolás. Quiero cotizar un cancel de baño templado de 9mm corredizo de 90 x 1.80 y dos mosquiteros de fibra de 120 x 150 cm. Mi cel 81 2345 6789. Me lo pueden instalar el sábado?'
const TEST_CLIENT_NAMES = ['Laura Treviño', 'Laura Treviño Garza', 'Laura Treviño Ruiz']

async function cleanupClients(): Promise<void> {
  const db = aiAdmin()
  const { data, error } = await db.from('clients').select('id').eq('organization_id', MEGAGLASS_ORG_ID).in('name', TEST_CLIENT_NAMES).limit(20)
  if (error) throw new Error(`cleanupClients: ${error.message}`)
  const ids = (data ?? []).map((row) => String(row.id))
  if (ids.length === 0) return
  const quotes = await db.from('quotes').delete().in('client_id', ids)
  if (quotes.error) throw new Error(`cleanupClients quotes: ${quotes.error.message}`)
  const clients = await db.from('clients').delete().in('id', ids)
  if (clients.error) throw new Error(`cleanupClients: ${clients.error.message}`)
}

async function seedClient(name: string): Promise<void> {
  const { error } = await aiAdmin().from('clients').insert({ organization_id: MEGAGLASS_ORG_ID, name, phone: '81 2345 6789' })
  if (error) throw new Error(`seedClient: ${error.message}`)
}

async function pasteMessage(page: Page, message: string): Promise<void> {
  await page.getByTestId('whatsapp-draft-toggle').click()
  await page.getByTestId('whatsapp-draft-message').fill(message)
  await expect(page.getByTestId('whatsapp-draft-submit')).toHaveText('Armar borrador · 3 créditos')
  await page.getByTestId('whatsapp-draft-submit').click()
}

async function expectUsage(page: Page, text: string): Promise<void> {
  await page.goto('/dashboard/billing')
  await expect(page.getByTestId('ai-usage-card')).toContainText(text)
}

test.describe.configure({ mode: 'serial' })

test.describe('IA: mensaje de WhatsApp a borrador', () => {
  test.beforeAll(async () => {
    await resetAiUsage(MEGAGLASS_ORG_ID)
    await cleanupClients()
  })

  test.beforeEach(async ({ page }) => {
    await resetAiUsage(MEGAGLASS_ORG_ID)
    await cleanupClients()
    await loginAsDemo(page, MEGAGLASS_OWNER)
  })

  test.afterAll(async () => {
    await cleanupClients()
    await resetAiUsage(MEGAGLASS_ORG_ID)
  })

  test('arma partidas con precio del catálogo, bloquea la que no tiene precio y crea el cliente al guardar', async ({ page }) => {
    await page.goto('/dashboard/quotes/new')
    await pasteMessage(page, MESSAGE)

    await expect(page.getByTestId('whatsapp-draft-notice')).toHaveText('Revisa cantidades y medidas antes de guardar')
    await expect(page.getByTestId('whatsapp-draft-summary')).toHaveText('Se agregaron 2 partidas.')
    await expect(page.getByTestId('item-description-0').first()).toHaveValue(/^Cancel de baño templado · .*0\.90 × 1\.80 m/)
    await expect(page.getByTestId('item-unit-price-0').first()).not.toHaveValue('0')
    await expect(page.getByTestId('item-description-1').first()).toHaveValue('Mosquitero de fibra · 1.20 × 1.50 m')
    await expect(page.getByTestId('item-needs-catalog-1')).toHaveText('Sin precio: elige del catálogo')
    await expect(page.getByTestId('pending-client-hint')).toContainText('Se creará el cliente "Laura Treviño" al guardar.')
    await expect(page.getByTestId('pending-client-hint')).toContainText('8123456789 · San Nicolás')

    await page.getByTestId('quote-notes-toggle').click()
    await expect(page.getByTestId('quote-notes')).toHaveValue('Zona: San Nicolás\nQuiere instalación el sábado')

    await page.getByTestId('submit-quote-btn').click()
    await expect(page.getByText('La partida 2 no tiene precio: elígela del catálogo').first()).toBeVisible()
    await expect(page.getByTestId('item-unit-price-1').first()).toBeInViewport()
    const { count: before } = await aiAdmin().from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', MEGAGLASS_ORG_ID).eq('name', 'Laura Treviño')
    expect(before).toBe(0)

    await page.getByTestId('item-unit-price-1').first().fill('450')
    await expect(page.getByTestId('item-needs-catalog-1')).toHaveCount(0)
    const quoteRequest = page.waitForRequest((request) => request.url().endsWith('/api/quotes') && request.method() === 'POST')
    await page.getByTestId('submit-quote-btn').click()
    const sentItems: unknown = (await quoteRequest).postDataJSON().items
    expect(JSON.stringify(sentItems)).not.toMatch(/needs_catalog|needs_review|review_reason/)
    await page.waitForURL('**/dashboard/quotes')

    const { data: client } = await aiAdmin()
      .from('clients')
      .select('id, phone, whatsapp_phone, address')
      .eq('organization_id', MEGAGLASS_ORG_ID)
      .eq('name', 'Laura Treviño')
      .single()
    expect(client).toMatchObject({ phone: '8123456789', whatsapp_phone: '8123456789', address: 'San Nicolás' })
    const { data: quotes } = await aiAdmin().from('quotes').select('id, notes').eq('client_id', String(client?.id)).limit(2)
    expect(quotes).toHaveLength(1)
    expect(quotes?.[0]?.notes).toBe('Zona: San Nicolás\nQuiere instalación el sábado')
    const { data: items } = await aiAdmin().from('quote_items').select('description, unit_price').eq('quote_id', String(quotes?.[0]?.id)).limit(5)
    expect(items).toHaveLength(2)
    expect(items?.map((i) => Number(i.unit_price))).toContain(450)
    await expectUsage(page, '3 de 400 créditos')
  })

  test('cliente existente por teléfono: lo preselecciona y conserva las partidas ya capturadas', async ({ page }) => {
    await seedClient('Laura Treviño')
    await page.goto('/dashboard/quotes/new')
    await page.getByTestId('item-description-0').first().fill('Espejo de baño')
    await page.getByTestId('item-unit-price-0').first().fill('800')
    await pasteMessage(page, MESSAGE)

    await expect(page.getByTestId('draft-client-found')).toContainText('Cliente encontrado por teléfono: Laura Treviño')
    await expect(page.getByPlaceholder('Buscar cliente...')).toHaveValue('Laura Treviño')
    await expect(page.getByTestId('pending-client-hint')).toHaveCount(0)
    await expect(page.getByTestId('whatsapp-draft-summary')).toHaveText('Se agregaron 2 partidas al final; se conservó la que ya tenías.')
    await expect(page.getByTestId('item-description-0').first()).toHaveValue('Espejo de baño')
    await expect(page.getByTestId('item-unit-price-0').first()).toHaveValue('800')
    await expect(page.getByTestId('item-description-2').first()).toHaveValue('Mosquitero de fibra · 1.20 × 1.50 m')
  })

  test('cliente ambiguo: no preselecciona y deja elegir', async ({ page }) => {
    await seedClient('Laura Treviño Garza')
    await seedClient('Laura Treviño Ruiz')
    await page.goto('/dashboard/quotes/new')
    await pasteMessage(page, MESSAGE)

    const choose = page.getByTestId('draft-client-choose')
    await expect(choose).toBeVisible()
    await expect(page.getByPlaceholder('Buscar cliente...')).toHaveValue('')
    await expect(page.getByTestId('submit-quote-btn')).toBeDisabled()
    await expect(page.getByTestId('draft-client-create')).toHaveText('Crear cliente nuevo: Laura Treviño')
    const names = await choose.locator('[data-testid^="draft-client-candidate-"]').allTextContents()
    expect([...names].sort()).toEqual(['Laura Treviño Garza', 'Laura Treviño Ruiz'])

    await page.getByTestId('draft-client-candidate-1').click()
    await expect(page.getByPlaceholder('Buscar cliente...')).toHaveValue(names[1] ?? '')
    await expect(choose).toHaveCount(0)
    await expect(page.getByTestId('submit-quote-btn')).toBeEnabled()
  })

  test('valida el mensaje; cerrar o Descartar cancelan sin tocar el formulario', async ({ page }) => {
    await page.goto('/dashboard/quotes/new')
    await page.getByTestId('item-description-0').first().fill('Espejo de baño')
    await page.getByTestId('whatsapp-draft-toggle').click()
    const message = page.getByTestId('whatsapp-draft-message')
    const submit = page.getByTestId('whatsapp-draft-submit')
    await message.fill('hola')
    await submit.click()
    await expect(page.getByTestId('whatsapp-draft-field-error')).toHaveText('Pega el mensaje completo del cliente')

    const tooLong = `${MESSAGE} `.repeat(20).slice(0, 4001)
    await message.fill(tooLong)
    await expect(message).toHaveValue(tooLong)
    await expect(page.getByTestId('whatsapp-draft-field-error')).toHaveText('Máximo 4,000 caracteres')
    await expect(submit).toBeDisabled()

    // La IA falsa contesta al instante: se retiene la petición hasta que el navegador la cancele.
    await page.route('**/api/ai/whatsapp-draft', async (route) => {
      await new Promise<void>((resolve) => page.once('requestfailed', () => resolve()))
      await route.continue().catch(() => undefined)
    })
    const aborted = () => page.waitForEvent('requestfailed', (request) => request.url().includes('/api/ai/whatsapp-draft'))

    await message.fill(MESSAGE)
    await expect(page.getByTestId('whatsapp-draft-field-error')).toHaveCount(0)
    const closedByToggle = aborted()
    await submit.click()
    await expect(submit).toBeDisabled()
    await page.getByTestId('whatsapp-draft-toggle').click()
    await closedByToggle
    await expect(message).toHaveCount(0)

    await page.getByTestId('whatsapp-draft-toggle').click()
    await expect(message).toHaveValue(MESSAGE)
    const discarded = aborted()
    await submit.click()
    await expect(submit).toBeDisabled()
    await page.getByTestId('whatsapp-draft-discard').click()
    await discarded

    await expect(message).toHaveCount(0)
    await expect(page.getByTestId('whatsapp-draft-error')).toHaveCount(0)
    await expect(page.getByTestId('whatsapp-draft-notice')).toHaveCount(0)
    await expect(page.getByTestId('item-description-0').first()).toHaveValue('Espejo de baño')
    await expect(page.getByTestId('item-description-1')).toHaveCount(0)
  })

  test('una falla de la IA no cobra y no toca lo capturado', async ({ page }) => {
    await page.goto('/dashboard/quotes/new')
    await page.getByTestId('item-description-0').first().fill('Espejo de baño')
    await page.getByTestId('whatsapp-draft-toggle').click()
    await page.getByTestId('whatsapp-draft-message').fill('Hola, quiero un espejo [fallo-ia] gracias')
    await page.getByTestId('whatsapp-draft-submit').click()
    await expect(page.getByTestId('whatsapp-draft-error')).toHaveText('La IA no está disponible por ahora')
    await expect(page.getByTestId('item-description-0').first()).toHaveValue('Espejo de baño')
    await expect(page.getByTestId('pending-client-hint')).toHaveCount(0)
    await page.getByTestId('whatsapp-draft-discard').click()
    await expect(page.getByTestId('whatsapp-draft-error')).toHaveCount(0)
    await expectUsage(page, '0 de 400 créditos')
  })
})
