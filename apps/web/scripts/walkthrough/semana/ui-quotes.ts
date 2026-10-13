/**
 * Acciones de interfaz del ciclo de una cotización: armarla, enviarla, moverla de estado, editarla,
 * cobrarla, documentar el trabajo con fotos, pedir reseña y agendar visitas y recordatorios.
 */
import type { Browser, Page } from '@playwright/test'
import { chooseComboboxOption } from '../../../e2e/helpers/combobox'
import { drawPhoto, type PhotoVariant } from '../photos'
import { money, toast, type Session } from './kit'

export type QuoteLine =
  | { readonly kind: 'free'; readonly description: string; readonly qty: string; readonly price: string }
  | { readonly kind: 'service'; readonly search: string; readonly qty?: string }
  | {
      readonly kind: 'config'
      readonly search: string
      readonly numbers?: Readonly<Record<string, string>>
      readonly selects?: Readonly<Record<string, string>>
      readonly checks?: Readonly<Record<string, boolean>>
    }

export interface QuoteSpec {
  readonly client?: string
  readonly template?: { readonly name: string; readonly items: number }
  readonly lines: readonly QuoteLine[]
  readonly discount?: string
  readonly validDays?: string
  readonly notes?: string
}

export interface CreatedQuote {
  readonly id: string
  readonly number: string
  readonly total: number
}

async function pickService(page: Page, index: number, search: string): Promise<void> {
  await page.locator('div.group').nth(index).locator('button').first().click()
  await page.locator('input[placeholder="Buscar..."]').fill(search)
  await page.locator('div.absolute button', { hasText: search }).first().dispatchEvent('mousedown')
}

async function fillLine(page: Page, index: number, line: QuoteLine): Promise<void> {
  if (line.kind === 'free') {
    await page.getByTestId(`item-description-${index}`).first().fill(line.description)
    await page.getByTestId(`item-quantity-${index}`).first().fill(line.qty)
    await page.getByTestId(`item-unit-price-${index}`).first().fill(line.price)
    return
  }
  await pickService(page, index, line.search)
  if (line.kind === 'service') {
    if (line.qty) await page.getByTestId(`item-quantity-${index}`).first().fill(line.qty)
    return
  }
  const prefix = `item-${index}`
  await page.getByTestId(`${prefix}-panel`).waitFor()
  for (const [key, value] of Object.entries(line.numbers ?? {})) await page.locator(`#${prefix}-${key}`).fill(value)
  for (const [key, value] of Object.entries(line.selects ?? {})) await chooseComboboxOption(page, `${prefix}-${key}`, value)
  for (const [key, value] of Object.entries(line.checks ?? {})) await page.locator(`#${prefix}-${key}`).setChecked(value)
}

/** Agrega partidas a partir del índice indicado; el índice 0 usa la fila vacía con la que abre el formulario. */
export async function addLines(s: Session, from: number, lines: readonly QuoteLine[]): Promise<void> {
  for (const [i, line] of lines.entries()) {
    const index = from + i
    if (index > 0) await s.page.getByRole('button', { name: 'Agregar item' }).click()
    await fillLine(s.page, index, line)
  }
}

export async function formValue(page: Page, label: 'Vigencia' | 'Descuento'): Promise<string> {
  return page.locator(`label:has-text("${label}") + div input:visible`).first().inputValue()
}

export async function termsValue(page: Page): Promise<string> {
  const terms = page.locator('label:has-text("Términos y Condiciones") + textarea')
  if (!(await terms.isVisible())) await page.getByRole('button', { name: /Notas y T/ }).click()
  return terms.inputValue()
}

/** Llena "Nueva cotización". Si ya se está en la página (p. ej. desde una solicitud) no navega. */
export async function composeQuote(s: Session, spec: QuoteSpec): Promise<void> {
  await s.pacer.gate(20)
  const page = s.page
  if (!/\/dashboard\/quotes\/new/.test(page.url())) await page.goto(`${s.base}/dashboard/quotes/new`)
  const clientInput = page.locator('input[name="client_id"]')
  await page.locator('input[name="client_id"][placeholder="Buscar cliente..."]').waitFor({ timeout: 30_000 })
  if (spec.client) {
    await clientInput.fill(spec.client)
    await page.getByRole('button', { name: new RegExp(spec.client) }).first().click()
  }
  let next = 0
  if (spec.template) {
    const select = page.locator('select:has(option:text("Sin plantilla"))')
    const value = await select.locator('option', { hasText: spec.template.name }).first().getAttribute('value')
    await select.selectOption(value!)
    await toast(page, /Plantilla .* aplicada/)
    next = spec.template.items
  }
  await addLines(s, next, spec.lines)
  await setSummary(s, spec)
}

/** Descuento, vigencia y notas del panel de resumen. */
export async function setSummary(s: Session, o: { readonly discount?: string; readonly validDays?: string; readonly notes?: string }): Promise<void> {
  const page = s.page
  if (o.discount) await page.locator('label:has-text("Descuento") + div input:visible').first().fill(o.discount)
  if (o.validDays) await page.locator('label:has-text("Vigencia") + div input:visible').first().fill(o.validDays)
  if (o.notes) {
    const notes = page.locator('label:has-text("Notas") + textarea')
    if (!(await notes.isVisible())) await page.getByRole('button', { name: /Notas y T/ }).click()
    await notes.fill(o.notes)
  }
}

export async function quoteTotalInForm(page: Page): Promise<string> {
  return ((await page.getByTestId('quote-total').textContent()) ?? '').trim()
}

/** Guarda la cotización y abre su detalle (la lista muestra primero la más reciente). */
export async function submitQuote(s: Session): Promise<CreatedQuote> {
  await s.page.getByTestId('submit-quote-btn').click()
  await toast(s.page, 'Cotización creada exitosamente', 30_000)
  await s.page.waitForURL(/\/dashboard\/quotes(\?|$)/, { timeout: 30_000 })
  await s.page.getByRole('link', { name: 'Ver' }).first().click()
  await s.page.waitForURL(/\/dashboard\/quotes\/[0-9a-f-]{36}$/)
  return readQuote(s)
}

export async function readQuote(s: Session): Promise<CreatedQuote> {
  const heading = s.page.getByRole('heading', { name: /COT-\d/ })
  await heading.waitFor({ timeout: 30_000 })
  const total = money((await s.page.locator('span:text-is("Total:") + span').textContent()) ?? '0')
  return { id: s.page.url().split('/').pop()!, number: ((await heading.textContent()) ?? '').trim(), total }
}

export async function openQuote(s: Session, id: string): Promise<CreatedQuote> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/quotes/${id}`)
  return readQuote(s)
}

/** "Enviar" → método → "Enviar". WhatsApp deja lista la liga wa.me; el correo requiere la llave de Resend. */
export async function sendQuote(s: Session, via: 'Correo' | 'WhatsApp', shot?: { id: string; title: string }): Promise<string> {
  await s.pacer.gate()
  await s.page.getByRole('button', { name: 'Enviar', exact: true }).filter({ visible: true }).first().click()
  await s.page.getByText('Enviar Cotizacion').waitFor()
  await s.page.getByRole('button', { name: via === 'Correo' ? /^Correo/ : 'WhatsApp' }).click()
  if (shot) await s.rec.shot(s.page, { ...shot, area: 'Panel del taller · Cotización', what: 'Diálogo de envío con vista previa del PDF y elección de canal. En producción aún no hay llave de correo ni de WhatsApp: el envío se registra y la cotización pasa a "Enviada".', apis: ['GET /api/export/quote/[id]', 'POST /api/quotes/[id]/send'] })
  await s.page.getByRole('button', { name: 'Enviar', exact: true }).filter({ visible: true }).last().click()
  const message = via === 'WhatsApp'
    ? (await s.page.getByText('Mensaje listo').waitFor(), 'Liga de WhatsApp lista')
    : await toast(s.page, /enviada por correo|No se pudo enviar el correo|Error/)
  await s.page.reload()
  await readQuote(s)
  return message
}

export async function setStatus(s: Session, button: string): Promise<void> {
  await s.pacer.gate()
  await s.page.getByRole('button', { name: button, exact: true }).click()
  await toast(s.page, 'Estado actualizado exitosamente')
  await s.page.reload()
  await readQuote(s)
}

export async function downloadPdf(s: Session, file: string): Promise<void> {
  await s.pacer.gate()
  const [download] = await Promise.all([s.page.waitForEvent('download'), s.page.getByRole('button', { name: 'PDF', exact: true }).first().click()])
  await download.saveAs(file)
}

export interface Payment {
  readonly amount: number
  readonly type: 'anticipo' | 'parcial' | 'liquidacion'
  readonly method: 'efectivo' | 'transferencia' | 'cheque' | 'otro'
  readonly date: string
  readonly notes: string
}

export async function registerPayment(s: Session, p: Payment): Promise<void> {
  await s.pacer.gate()
  await s.page.getByRole('button', { name: 'Registrar Pago' }).first().click()
  await s.page.locator('#amount').fill(p.amount.toFixed(2))
  await s.page.locator('#payment_type').selectOption(p.type)
  await s.page.locator('#payment_method').selectOption(p.method)
  await s.page.locator('#payment_date').fill(p.date)
  await s.page.locator('#notes').fill(p.notes)
  await s.page.getByRole('button', { name: 'Registrar', exact: true }).click()
  await s.page.locator('#amount').waitFor({ state: 'hidden', timeout: 20_000 })
}

export async function editQuote(s: Session, id: string, change: { readonly prices?: Readonly<Record<number, string>>; readonly discount?: string }): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/quotes/${id}/edit`)
  await s.page.getByRole('button', { name: 'Guardar Cambios' }).waitFor({ timeout: 30_000 })
  for (const [index, price] of Object.entries(change.prices ?? {})) {
    await s.page.locator('div.group').nth(Number(index)).locator('input[type="number"]').nth(1).fill(price)
  }
  if (change.discount) await s.page.locator('label:has-text("Descuento") + div input:visible').first().fill(change.discount)
  await s.rec.shot(s.page, { id: 'editar', title: 'Negociación: se edita la cotización antes de que el cliente la acepte', area: 'Panel del taller · Editar cotización', what: 'El cliente pidió mejor precio. Se ajusta el precio de una partida y el descuento; el total se recalcula.', apis: ['PATCH /api/quotes/[id]'], fullPage: true })
  await s.page.getByRole('button', { name: 'Guardar Cambios' }).click()
  await toast(s.page, /actualizada exitosamente/)
  await readQuote(s)
}

export async function kanbanMove(s: Session, quoteNumber: string, column: string): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/quotes?view=kanban`)
  const card = s.page.locator('div[draggable]', { hasText: `#${quoteNumber}` })
  const target = s.page.locator('div.w-64', { has: s.page.locator('h3', { hasText: new RegExp(`^${column}$`) }) })
  await card.dragTo(target)
  await target.locator('div[draggable]', { hasText: `#${quoteNumber}` }).waitFor({ timeout: 20_000 })
}

export async function uploadPhoto(s: Session, browser: Browser, kind: 'Antes' | 'Después' | 'Trabajo', label: string, variant: PhotoVariant): Promise<void> {
  await s.pacer.gate()
  const before = await s.page.getByTestId('job-photo').count()
  await s.page.getByRole('radio', { name: kind }).click()
  await s.page.getByTestId('job-photos-input').setInputFiles({ name: `${kind.toLowerCase()}.png`, mimeType: 'image/png', buffer: await drawPhoto(browser, label, variant) })
  await s.page.getByTestId('job-photo').nth(before).waitFor({ timeout: 30_000 })
}

const photoBoxes = (page: Page) => page.locator('[data-testid="job-photo"] input[type="checkbox"]')

async function persistedPhotos(s: Session): Promise<number> {
  await s.page.waitForLoadState('networkidle').catch(() => undefined)
  await s.page.reload()
  await readQuote(s)
  await s.page.getByTestId('job-photo').first().waitFor()
  return s.page.locator('[data-testid="job-photo"] input[type="checkbox"]:checked').count()
}

/**
 * Marca "En mi página" en cada foto a ritmo de persona (una tras otra, sin esperar al servidor) y recarga
 * para contar cuántas quedaron guardadas de verdad.
 */
export async function publishPhotos(s: Session): Promise<{ readonly total: number; readonly persisted: number }> {
  await s.pacer.gate()
  const boxes = photoBoxes(s.page)
  const total = await boxes.count()
  for (let i = 0; i < total; i += 1) if (!(await boxes.nth(i).isChecked())) await boxes.nth(i).click()
  return { total, persisted: await persistedPhotos(s) }
}

/** Reintento pausado: marca cada foto y espera a que el servidor confirme antes de la siguiente. */
export async function publishPhotosSlowly(s: Session): Promise<number> {
  await s.pacer.gate()
  const boxes = photoBoxes(s.page)
  for (let i = 0; i < (await boxes.count()); i += 1) {
    const box = boxes.nth(i)
    if (await box.isChecked()) continue
    await box.click()
    await s.page.waitForFunction((n) => {
      const el = document.querySelectorAll<HTMLInputElement>('[data-testid="job-photo"] input[type="checkbox"]')[n]
      return Boolean(el?.checked && !el.disabled)
    }, i)
  }
  return persistedPhotos(s)
}

/** "Pedir reseña" y lee la liga del botón de WhatsApp, como la vería la dueña. */
export async function requestReview(s: Session): Promise<string> {
  await s.pacer.gate()
  await s.page.getByTestId('review-request-button').click()
  const wa = s.page.getByRole('link', { name: 'Enviar por WhatsApp' })
  await wa.waitFor({ timeout: 20_000 })
  const href = decodeURIComponent((await wa.getAttribute('href')) ?? '')
  const token = href.match(/\/r\/[a-f0-9]{48}/)
  if (!token) throw new Error('La liga de reseña no aparece en el botón de WhatsApp')
  return token[0]
}

export interface EventData {
  readonly title: string
  readonly type: 'Instalación' | 'Medición' | 'Visita Técnica' | 'Mantenimiento' | 'Otro'
  readonly start: string
  readonly end: string
  readonly address: string
  readonly notes: string
  readonly client?: string
}

/** Desde el detalle de la cotización ("Eventos de Trabajo" → "Crear") o desde la agenda si se indica el cliente. */
export async function createEvent(s: Session, e: EventData): Promise<void> {
  await s.pacer.gate()
  if (e.client) {
    await s.page.goto(`${s.base}/dashboard/calendar/new`)
    await chooseComboboxOption(s.page, 'client_id', e.client)
  } else {
    await s.page.getByRole('link', { name: 'Crear', exact: true }).click()
    await s.page.waitForURL(/\/dashboard\/calendar\/new/, { timeout: 30_000 })
  }
  await s.page.locator('#title').fill(e.title)
  await chooseComboboxOption(s.page, 'event_type', e.type)
  await s.page.locator('#scheduled_start').fill(e.start)
  await s.page.locator('#scheduled_end').fill(e.end)
  await s.page.locator('#address').fill(e.address)
  await s.page.locator('#notes').fill(e.notes)
  await s.page.getByRole('button', { name: 'Crear evento' }).click()
  await s.page.waitForURL(/\/dashboard\/calendar$/, { timeout: 30_000 })
  s.rec.log(`Agenda: ${e.type} "${e.title}" ${e.start.replace('T', ' ')}`)
}

export interface ReminderData {
  readonly client: string
  readonly title: string
  readonly type: 'Seguimiento' | 'Mantenimiento' | 'Renovación' | 'Personalizado'
  readonly priority: 'Normal' | 'Baja' | 'Alta' | 'Urgente'
  readonly date: string
  readonly message: string
}

export async function createReminder(s: Session, r: ReminderData): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/reminders/new`)
  await chooseComboboxOption(s.page, 'client_id', r.client)
  await s.page.locator('#title').fill(r.title)
  await chooseComboboxOption(s.page, 'reminder_type', r.type)
  await chooseComboboxOption(s.page, 'priority', r.priority)
  await s.page.locator('#scheduled_date').fill(r.date)
  await s.page.locator('#description').fill(r.message)
  await s.page.getByRole('button', { name: 'Crear Recordatorio' }).click()
  await toast(s.page, 'Recordatorio creado exitosamente')
  s.rec.log(`Recordatorio "${r.title}" para ${r.date} (${r.priority})`)
}

export async function completeReminder(s: Session, title: string): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/reminders`)
  const row = s.page.locator('tr, li, div.group', { hasText: title }).filter({ has: s.page.locator('button[title="Completar"]') }).first()
  await row.locator('button[title="Completar"]').click()
  await toast(s.page, 'Recordatorio completado exitosamente')
  s.rec.log(`Recordatorio "${title}" completado`)
}

export async function convertRequest(s: Session, name: string): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/solicitudes`)
  const card = s.page.getByTestId('quote-request-card').filter({ hasText: name }).first()
  await card.waitFor({ timeout: 30_000 })
  await s.rec.shot(s.page, { id: 'bandeja', title: `Bandeja de solicitudes: llegó la de ${name}`, area: 'Panel del taller · Solicitudes', what: 'Las solicitudes de la página pública llegan aquí. Desde la tarjeta se contacta por WhatsApp, se descarta o se convierte en cliente y cotización.', apis: ['GET /api/quote-requests', 'POST /api/quote-requests/[id]/convert'] })
  await card.getByRole('button', { name: 'Convertir en cotización' }).click()
  await s.page.waitForURL(/\/dashboard\/quotes\/new\?client_id=/, { timeout: 30_000 })
}
