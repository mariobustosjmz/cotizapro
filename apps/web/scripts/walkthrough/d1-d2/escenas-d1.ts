/**
 * Escenas D1 (cotización pública con Aceptar y anticipo), manejadas solo por la interfaz como lo haría
 * una persona: Configuración → Empresa, envío por WhatsApp con su liga, la liga sin sesión (escritorio y
 * celular), la aceptación del cliente y lo que ve el negocio después (campana y detalle).
 */
import type { Browser, Page } from '@playwright/test'
import { BASE, go, log, newContext, settle, text, type Recorder } from './kit'

export const TARGET_QUOTE = process.env.WALK_QUOTE ?? 'COT-2026-040'
export const CLIENT_SIGNER = 'Ing. Rodrigo Salinas'
const DEMO_PAYMENT_URL = 'https://mpago.la/megaglass-demo-anticipo'
const DEMO_INSTRUCTIONS = 'Paga el anticipo con el botón de Mercado Pago o por transferencia; te mandamos los datos bancarios por WhatsApp al confirmar. Envía tu comprobante para agendar la medición final e instalación.'
/** Rango de documentación (RFC 5737) para que el límite por IP de la liga no choque con otras corridas. */
const CLIENT_IP = '198.51.100.40'

export interface D1Result {
  readonly quoteId: string
  readonly quoteNumber: string
  readonly total: string
  readonly publicUrl: string
}

async function depositValues(page: Page): Promise<Record<string, string>> {
  return {
    'Anticipo (%)': await page.locator('#deposit_percent').inputValue(),
    'Liga de pago': (await page.locator('#deposit_payment_url').inputValue()) || '(vacío)',
    'Instrucciones de pago': (await page.locator('#deposit_instructions').inputValue()) || '(vacío)',
  }
}

export async function sceneSettings(page: Page, rec: Recorder): Promise<void> {
  log('Escena 1 · Configuración → Empresa (anticipo)')
  await go(page, '/dashboard/settings')
  await page.getByRole('button', { name: 'Empresa' }).click()
  await page.locator('#deposit_percent').waitFor()
  const form = page.locator('form:has(#deposit_percent)')
  const block = form.locator('div.pt-2:has(#deposit_percent)')
  await block.scrollIntoViewIfNeeded()
  const before = await depositValues(page)
  rec.record('anticipoAntes', before)
  const empty = before['Liga de pago'] === '(vacío)' || before['Instrucciones de pago'] === '(vacío)'
  if (!empty) {
    await page.locator('#deposit_percent').scrollIntoViewIfNeeded()
    await rec.shot(page, 1, 'empresa-anticipo', 'Configuración → Empresa: sección Anticipo', { ...before, 'Cambios': 'Ninguno: ya tenía valores' }, { clip: block })
    return
  }
  await rec.shot(page, 1, 'empresa-anticipo-antes', 'Configuración → Empresa: Anticipo antes de llenar', { ...before, 'Estado': 'Liga e instrucciones vacías' }, { clip: block })
  if (before['Liga de pago'] === '(vacío)') await page.locator('#deposit_payment_url').fill(DEMO_PAYMENT_URL)
  if (before['Instrucciones de pago'] === '(vacío)') await page.locator('#deposit_instructions').fill(DEMO_INSTRUCTIONS)
  await form.getByRole('button', { name: 'Guardar' }).click()
  await page.getByText(/actualizad|guardad/i).first().waitFor({ timeout: 30_000 }).catch(() => undefined)
  const confirmation = await text(page.getByText(/actualizad|guardad/i)).catch(() => '(sin mensaje visible)')
  await settle(page)
  await go(page, '/dashboard/settings')
  await page.getByRole('button', { name: 'Empresa' }).click()
  await page.locator('#deposit_percent').waitFor()
  await block.scrollIntoViewIfNeeded()
  const after = await depositValues(page)
  rec.record('anticipoDespues', after)
  rec.note('Configuración → Empresa no tenía liga de pago ni instrucciones; se llenaron por la interfaz con valores de demostración (liga ficticia, sin datos bancarios) y se guardaron con el botón Guardar.')
  await rec.shot(page, 1, 'empresa-anticipo-guardado', 'Configuración → Empresa: Anticipo guardado', { ...after, 'Mensaje al guardar': confirmation, 'Comprobación': 'Valores releídos tras recargar la página' }, { clip: block })
}

/** Solo para repetir la escena 1: deja la liga y las instrucciones vacías desde la misma pantalla y guarda. */
export async function clearDepositViaUi(page: Page): Promise<void> {
  await go(page, '/dashboard/settings')
  await page.getByRole('button', { name: 'Empresa' }).click()
  await page.locator('#deposit_percent').waitFor()
  await page.locator('#deposit_payment_url').fill('')
  await page.locator('#deposit_instructions').fill('')
  await page.locator('form:has(#deposit_percent)').getByRole('button', { name: 'Guardar' }).click()
  await page.getByText(/actualizad/i).first().waitFor({ timeout: 30_000 })
  await settle(page)
}

async function openQuoteFromList(page: Page): Promise<void> {
  await go(page, '/dashboard/quotes')
  const search = page.getByPlaceholder('Buscar por número...').first()
  await search.click()
  await search.pressSequentially(TARGET_QUOTE, { delay: 40 })
  await page.waitForURL(new RegExp(`q=${TARGET_QUOTE}`), { timeout: 60_000 }).catch(() => undefined)
  await settle(page, 1500)
  const row = page.locator('tr', { hasText: TARGET_QUOTE }).first()
  await row.getByRole('link', { name: 'Ver' }).click({ timeout: 60_000 })
  await page.waitForURL(/\/dashboard\/quotes\/[0-9a-f-]{36}$/, { timeout: 120_000 })
  await settle(page)
}

async function quoteHeader(page: Page): Promise<Record<string, string>> {
  const header = page.locator('h2', { hasText: /^COT-/ }).first()
  await header.waitFor({ timeout: 60_000 })
  const total = page.locator('span', { hasText: /^Total:$/ }).first().locator('xpath=..')
  return {
    Folio: await text(header),
    Estado: await text(header.locator('xpath=following-sibling::span[1]')),
    Cliente: await text(header.locator('xpath=../following-sibling::p[1]')),
    Total: (await text(total)).replace(/^Total:\s*/, ''),
  }
}

export async function sceneShare(page: Page, rec: Recorder): Promise<D1Result> {
  log(`Escena 2 · Detalle de ${TARGET_QUOTE} y liga pública`)
  await openQuoteFromList(page)
  const head = await quoteHeader(page)
  const quoteId = page.url().split('/').pop() ?? ''
  rec.record('cotizacion', { id: quoteId, ...head })
  await rec.shot(page, 2, 'detalle-cotizacion', `Detalle de la cotización ${head.Folio}`, { ...head, 'Partidas': String(await page.locator('div:has(> div > span:text-is("Items de la Cotización")) table tbody tr').count()) })

  await page.getByRole('button', { name: 'Enviar', exact: true }).first().click()
  const dialog = page.locator('div.fixed.inset-0.z-50').filter({ hasText: 'Enviar Cotización' })
  await dialog.waitFor()
  await dialog.getByRole('button', { name: 'WhatsApp', exact: true }).click()
  await dialog.getByRole('button', { name: /^Enviar$/ }).click()
  const urlInput = dialog.getByTestId('share-link-url')
  await urlInput.waitFor({ timeout: 60_000 })
  const waLink = dialog.getByTestId('share-open-whatsapp')
  await waLink.waitFor({ timeout: 30_000 })
  const publicUrl = await urlInput.inputValue()
  const waHref = (await waLink.getAttribute('href')) ?? ''
  const waUrl = new URL(waHref)
  const waMessage = waUrl.searchParams.get('text') ?? ''
  await dialog.getByTestId('share-link-panel').scrollIntoViewIfNeeded()
  rec.record('liga', { publicUrl, waHref })
  await rec.shot(page, 2, 'panel-liga', 'Enviar por WhatsApp: liga para ver y aceptar', {
    'Liga pública (input)': publicUrl,
    'Botón «Abrir WhatsApp» (href)': `${waUrl.origin}${waUrl.pathname}?text=…`,
    'Mensaje que se abre en WhatsApp': waMessage,
    'Panel': await text(dialog.getByTestId('share-link-panel')),
  })
  await dialog.getByRole('button', { name: 'Cerrar' }).click()
  return { quoteId, quoteNumber: head.Folio ?? TARGET_QUOTE, total: head.Total ?? '', publicUrl }
}

async function publicFacts(page: Page): Promise<Record<string, string>> {
  const deposit = page.getByTestId('deposit-card')
  const pay = deposit.getByRole('link', { name: 'Pagar anticipo' })
  const doubts = page.getByRole('link', { name: 'Tengo dudas' })
  const banner = page.getByTestId('quote-status-banner')
  return {
    Negocio: await text(page.getByRole('heading', { level: 1 })),
    Total: await text(page.getByTestId('public-quote-total')),
    Anticipo: (await deposit.count()) ? await text(deposit.locator('h2')) : '(sin tarjeta)',
    'Instrucciones': (await deposit.count()) ? await text(deposit.locator('p').first()) : '',
    'Botón «Pagar anticipo» (href)': (await pay.count()) ? (await pay.getAttribute('href')) ?? '' : '(no aparece)',
    '«Tengo dudas» (href)': (await doubts.count()) ? ((await doubts.getAttribute('href')) ?? '').replace(/\?text=.*/, '?text=…') : '(no aparece)',
    'Aviso de estado': (await banner.count()) ? await text(banner) : '(sin aviso)',
  }
}

export async function scenePublic(browser: Browser, rec: Recorder, d1: D1Result): Promise<void> {
  log('Escena 3 · Liga pública sin sesión (escritorio y celular)')
  for (const device of ['escritorio', 'celular'] as const) {
    const ctx = await newContext(browser, device)
    await ctx.setExtraHTTPHeaders({ 'x-forwarded-for': CLIENT_IP })
    const page = await ctx.newPage()
    await page.goto(d1.publicUrl, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 120_000 })
    await settle(page, 1200)
    const facts = await publicFacts(page)
    if (device === 'escritorio') rec.record('ligaPublica', facts)
    await rec.shot(page, 3, `liga-publica-${device}`, `Liga pública en ${device} (sin sesión)`, { ...facts, 'Sesión': 'Contexto nuevo, sin cookies' }, { full: true })
    if (device === 'celular') await sceneAccept(page, rec)
    await ctx.close()
  }
}

async function sceneAccept(page: Page, rec: Recorder): Promise<void> {
  log('Escena 4 · El cliente acepta desde su celular')
  await page.getByRole('button', { name: 'Aceptar cotización' }).click()
  await page.getByLabel('Tu nombre').fill(CLIENT_SIGNER)
  const panel = page.getByRole('form', { name: 'Confirmar aceptación' })
  await panel.scrollIntoViewIfNeeded()
  await rec.shot(page, 4, 'aceptar-confirmar', 'El cliente escribe su nombre y confirma', {
    'Pregunta': await text(panel.locator('p').first()),
    'Aviso legal': await text(panel.locator('p').nth(1)),
    'Nombre escrito': await page.getByLabel('Tu nombre').inputValue(),
  })
  await page.getByRole('button', { name: 'Confirmar aceptación' }).click()
  await page.getByTestId('quote-status-banner').filter({ hasText: /aceptada/i }).waitFor({ timeout: 60_000 })
  await settle(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  const facts = await publicFacts(page)
  rec.record('aceptacion', facts)
  await rec.shot(page, 4, 'aceptada-celular', 'Confirmación: cotización aceptada y anticipo a la vista', {
    ...facts,
    'Botón «Aceptar cotización»': (await page.getByRole('button', { name: 'Aceptar cotización' }).count()) ? 'sigue visible' : 'ya no aparece',
  }, { full: true })
}

export async function sceneOwnerSees(page: Page, rec: Recorder, d1: D1Result): Promise<void> {
  log('Escena 5 · El negocio ve la aceptación (campana y detalle)')
  await go(page, '/dashboard')
  await page.getByRole('button', { name: 'Notificaciones' }).click()
  const item = page.getByRole('link').filter({ hasText: 'Tu cliente aceptó la cotización' }).first()
  await item.waitFor({ timeout: 60_000 })
  await rec.shot(page, 5, 'campana-aceptada', 'Campana: «Tu cliente aceptó la cotización»', {
    'Aviso': await text(item),
    'Pendientes en la campana': await text(page.getByText(/pendiente/).first()).catch(() => '(sin contador)'),
  })
  await page.keyboard.press('Escape')
  await go(page, `/dashboard/quotes/${d1.quoteId}`)
  const card = page.getByTestId('client-response-card')
  await card.filter({ hasText: 'Aceptada desde la liga' }).waitFor({ timeout: 60_000 })
  const head = await quoteHeader(page)
  rec.record('respuestaCliente', { ...head, tarjeta: await text(card) })
  await card.scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -260))
  await rec.shot(page, 5, 'detalle-respuesta-cliente', 'Detalle: tarjeta «Respuesta del cliente»', {
    Folio: head.Folio ?? '',
    'Estado en el encabezado': head.Estado ?? '',
    'Respuesta del cliente': (await card.locator('li').allInnerTexts()).join(' | '),
  })
  log(`Liga usada: ${BASE.replace(/\/$/, '')}/c/…`)
}
