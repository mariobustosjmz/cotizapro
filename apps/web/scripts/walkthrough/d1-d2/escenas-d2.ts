/**
 * Escenas D2 (cobro semi-manual, solo lectura al vencer y superadmin), manejadas por la interfaz:
 * Facturación de Megaglass, /admin con historial, suspensión y activación de Don Beto, y lo que ve
 * Don Beto en cada momento (banner, error 402 al crear un cliente, cotizaciones y Facturación).
 */
import type { Locator, Page } from '@playwright/test'
import { chooseComboboxOption } from '../../../e2e/helpers/combobox'
import { DON_BETO_ORG, donBetoState, go, log, settle, text, type Recorder } from './kit'

export const EVIDENCE_REFERENCE = 'MP-EVIDENCIA-001'
export const SUSPEND_REASON = 'MP-EVIDENCIA: pago de octubre no recibido (recorrido de evidencia D2)'

async function cardText(page: Page, label: string): Promise<string> {
  const card = page.locator('div.rounded-xl', { has: page.locator('p', { hasText: new RegExp(`^${label}$`, 'i') }) }).first()
  return (await card.count()) ? (await text(card)).replace(new RegExp(`^${label}\\s*`, 'i'), '') : '(no aparece)'
}

async function billingFacts(page: Page): Promise<Record<string, string>> {
  const cards = page.locator('[data-testid^="plan-card-"]')
  const names: string[] = []
  for (let i = 0; i < (await cards.count()); i += 1) {
    names.push((await text(cards.nth(i))).slice(0, 90))
  }
  const limits = page.getByTestId('plan-limits-table')
  return {
    'Plan actual (plan-status-line)': await text(page.getByTestId('plan-status-line')),
    'Usuarios': await cardText(page, 'Usuarios'),
    'Total mensual estimado': await cardText(page, 'Total mensual estimado'),
    'Tarjetas de plan': names.join(' | '),
    'Tabla «Qué incluye cada plan»': (await limits.count()) ? (await limits.locator('thead th').allInnerTexts()).join(' · ') + ' | ' + (await limits.locator('tbody tr').allInnerTexts()).map((r) => r.replace(/\s+/g, ' ')).join(' | ') : '(no aparece)',
  }
}

export async function sceneBilling(page: Page, rec: Recorder): Promise<void> {
  log('Escena 6 · Facturación de Megaglass')
  await go(page, '/dashboard/billing')
  await page.getByTestId('plan-status-line').waitFor({ timeout: 60_000 })
  const facts = await billingFacts(page)
  rec.record('facturacionMegaglass', facts)
  await rec.shot(page, 6, 'facturacion-megaglass', 'Facturación de Megaglass: plan, usuarios, total y planes', facts, { full: true })
}

function donBetoRow(page: Page): Locator {
  return page.getByTestId(`org-row-${DON_BETO_ORG}`)
}

async function rowFacts(row: Locator): Promise<Record<string, string>> {
  const cells = await row.locator('td').allInnerTexts()
  return {
    Empresa: (cells[0] ?? '').replace(/\s+/g, ' ').trim(),
    Plan: cells[1]?.trim() ?? '',
    Vencimiento: cells[2]?.trim() ?? '',
    Usuarios: cells[3]?.trim() ?? '',
    Alta: cells[4]?.trim() ?? '',
  }
}

async function searchAdmin(page: Page, term: string): Promise<void> {
  await page.locator('#admin-search').fill(term)
  await Promise.all([page.waitForURL(/\/admin\?q=/, { timeout: 60_000 }), page.getByRole('button', { name: 'Buscar' }).click()])
  await settle(page)
}

async function openHistory(page: Page, minEntries: number): Promise<{ dialog: Locator; entries: string[] }> {
  await donBetoRow(page).getByRole('button', { name: 'Historial' }).click()
  const dialog = page.locator('dialog[open]')
  await dialog.getByText('Cargando...').waitFor({ state: 'detached', timeout: 60_000 }).catch(() => undefined)
  if (minEntries > 0) await dialog.locator('li').nth(minEntries - 1).waitFor({ timeout: 60_000 })
  const entries = (await dialog.locator('li').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())
  return { dialog, entries }
}

export async function sceneAdmin(page: Page, rec: Recorder): Promise<void> {
  log('Escena 7 · /admin como superadmin')
  await go(page, '/admin')
  await page.getByRole('heading', { name: 'Empresas' }).waitFor({ timeout: 60_000 })
  const rows = page.locator('[data-testid^="org-row-"]')
  rec.record('adminFilas', await rows.count())
  await rec.shot(page, 7, 'admin-tabla', 'Panel de plataforma /admin: empresas y planes', {
    'Empresas en la página': String(await rows.count()),
    'Paginación': await text(page.getByRole('navigation', { name: 'Paginación' })),
    'Plomería Don Beto': Object.values(await rowFacts(donBetoRow(page))).join(' · ') || '(no está en la primera página)',
  }, { full: true })

  await searchAdmin(page, 'plomeria')
  const { dialog, entries } = await openHistory(page, 0)
  await rec.shot(page, 7, 'admin-historial-inicial', 'Historial de Plomería Don Beto antes del recorrido', {
    'Búsqueda': 'plomeria',
    'Título': await text(dialog.locator('h3')),
    'Movimientos': entries.length ? entries.join(' | ') : await text(dialog.locator('p').first()),
  })
  await dialog.getByRole('button', { name: 'Cerrar' }).click()
}

export async function sceneSuspend(page: Page, rec: Recorder): Promise<void> {
  log('Escena 8 · Suspender a Plomería Don Beto')
  const row = donBetoRow(page)
  await row.getByRole('button', { name: 'Suspender' }).click()
  const dialog = page.locator('dialog[open]')
  await dialog.locator('#suspend-reason').fill(SUSPEND_REASON)
  await rec.shot(page, 8, 'suspender-dialogo', 'Diálogo «Suspender» con motivo', {
    'Título': await text(dialog.locator('h3')),
    'Advertencia': await text(dialog.locator('p').first()),
    'Motivo escrito': await dialog.locator('#suspend-reason').inputValue(),
  })
  await dialog.getByRole('button', { name: 'Suspender', exact: true }).click()
  await dialog.waitFor({ state: 'detached', timeout: 60_000 })
  await row.filter({ hasText: 'Vencido' }).waitFor({ timeout: 60_000 })
  await settle(page)
  const facts = await rowFacts(row)
  rec.record('donBetoTrasSuspender', { fila: facts, base: donBetoState() })
  await rec.shot(page, 8, 'suspendida-fila', 'Fila de Plomería Don Beto tras suspender', { ...facts, 'Botones': (await row.getByRole('button').allInnerTexts()).join(' · ') })
}

export async function sceneReadOnly(page: Page, rec: Recorder): Promise<void> {
  log('Escena 9 · Don Beto en solo lectura')
  const banner = page.getByTestId('plan-banner-danger')
  await banner.waitFor({ timeout: 60_000 })
  rec.record('bannerVencido', await text(banner))
  await rec.shot(page, 9, 'beto-banner-vencido', 'Panel de Don Beto con el aviso rojo de plan vencido', {
    'Aviso (plan-banner-danger)': await text(banner),
    'Botón del aviso': await text(banner.getByRole('link')),
  })

  await go(page, '/dashboard/clients')
  await page.locator('main a[href="/dashboard/clients/new"]').first().click()
  await page.waitForURL(/\/dashboard\/clients\/new$/, { timeout: 120_000 })
  await page.locator('#name').waitFor()
  await page.locator('#name').fill('Cliente de prueba en solo lectura')
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/clients') && r.request().method() === 'POST', { timeout: 60_000 }),
    page.getByRole('button', { name: 'Crear Cliente' }).click(),
  ])
  const body = (await response.json().catch(() => ({}))) as { code?: string }
  const errorBox = page.locator('form div.bg-red-50').first()
  await errorBox.waitFor({ timeout: 30_000 })
  const shown = await text(errorBox)
  rec.record('crearClienteBloqueado', { status: response.status(), code: body.code ?? null, mensaje: shown })
  await rec.shot(page, 9, 'beto-cliente-bloqueado', 'Intento de crear un cliente: bloqueado por solo lectura', {
    'Mensaje en pantalla': shown,
    'Respuesta observada de POST /api/clients': `${response.status()} ${body.code ?? ''}`.trim(),
  })

  await go(page, '/dashboard/quotes')
  await page.locator('table tbody tr').first().waitFor({ timeout: 60_000 }).catch(() => undefined)
  const quoteRows = await page.locator('table tbody tr').count()
  await rec.shot(page, 9, 'beto-cotizaciones-lectura', 'Cotizaciones de Don Beto: se pueden consultar', {
    'Filas visibles': String(quoteRows),
    'Aviso rojo presente': (await banner.count()) ? 'sí' : 'no',
  })

  await go(page, '/dashboard/billing')
  await page.getByTestId('plan-status-line').waitFor({ timeout: 60_000 })
  const facts = await billingFacts(page)
  const wa = page.getByRole('link', { name: 'Pedir mi liga por WhatsApp' })
  const support = page.getByText('Escríbenos a soporte para recibir tu liga.')
  const renew = (await wa.count())
    ? `«Pedir mi liga por WhatsApp» → ${((await wa.first().getAttribute('href')) ?? '').replace(/\?text=.*/, '?text=…')}`
    : (await support.count()) ? '«Escríbenos a soporte para recibir tu liga.» (sin teléfono de soporte configurado)' : '(no aparece)'
  rec.record('facturacionVencida', { ...facts, renovacion: renew })
  await rec.shot(page, 9, 'beto-facturacion-vencida', 'Facturación de Don Beto vencida: opción para renovar', { ...facts, 'Renovación': renew }, { full: true })
}

export async function sceneActivate(page: Page, rec: Recorder): Promise<void> {
  log('Escena 10 · Activar o renovar a Don Beto')
  await go(page, '/admin')
  await searchAdmin(page, 'plomeria')
  const row = donBetoRow(page)
  await row.getByRole('button', { name: 'Activar o renovar' }).click()
  const dialog = page.locator('dialog[open]')
  await dialog.locator('#activate-reference').waitFor()
  await chooseComboboxOption(page, 'plan', 'Taller')
  await dialog.locator('#activate-users').fill('1')
  await dialog.locator('#activate-months').fill('1')
  await dialog.locator('#activate-reference').fill(EVIDENCE_REFERENCE)
  await dialog.locator('h3').click()
  const total = dialog.getByTestId('activation-total')
  await total.filter({ hasText: 'Total a registrar' }).waitFor()
  await rec.shot(page, 10, 'activar-dialogo', 'Diálogo «Activar o renovar» con el total', {
    'Título': await text(dialog.locator('h3')),
    'Plan': await dialog.locator('input[type="text"]').first().inputValue(),
    'Usuarios': await dialog.locator('#activate-users').inputValue(),
    'Meses': await dialog.locator('#activate-months').inputValue(),
    'Referencia': await dialog.locator('#activate-reference').inputValue(),
    'Total (activation-total)': await text(total),
  })
  await dialog.getByRole('button', { name: 'Activar', exact: true }).click()
  await dialog.waitFor({ state: 'detached', timeout: 60_000 })
  await row.filter({ hasText: /Vence en/ }).waitFor({ timeout: 60_000 })
  await settle(page)
  const facts = await rowFacts(row)
  rec.record('donBetoTrasActivar', { fila: facts, base: donBetoState() })
  await rec.shot(page, 10, 'activada-fila', 'Fila de Plomería Don Beto tras activar', facts)

  const { dialog: history, entries } = await openHistory(page, 2)
  rec.record('historialFinal', entries)
  await rec.shot(page, 10, 'historial-final', 'Historial con la suspensión y la activación', {
    'Título': await text(history.locator('h3')),
    ...Object.fromEntries(entries.map((e, i) => [`Movimiento ${i + 1}`, e])),
  })
  await history.getByRole('button', { name: 'Cerrar' }).click()
}

export async function sceneRenewed(page: Page, rec: Recorder): Promise<void> {
  log('Escena 11 · Don Beto renovado')
  await go(page, '/dashboard')
  await page.locator('main').waitFor()
  const danger = await page.getByTestId('plan-banner-danger').count()
  const warning = page.getByTestId('plan-banner-warning')
  const bannerState = danger ? 'aviso rojo (sigue vencido)' : (await warning.count()) ? `aviso amarillo: ${await text(warning)}` : 'sin aviso (faltan más de 7 días para vencer)'
  rec.record('bannerTrasRenovar', bannerState)
  await rec.shot(page, 11, 'beto-panel-renovado', 'Panel de Don Beto después de renovar', { 'Aviso de plan': bannerState })

  await go(page, '/dashboard/billing')
  await page.getByTestId('plan-status-line').waitFor({ timeout: 60_000 })
  const facts = await billingFacts(page)
  rec.record('facturacionRenovada', facts)
  await rec.shot(page, 11, 'beto-facturacion-renovada', 'Facturación de Don Beto con la nueva fecha', facts, { full: true })
}
