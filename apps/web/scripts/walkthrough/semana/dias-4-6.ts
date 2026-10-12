/** Jueves a sábado: aceptaciones, rechazo, negociación, instalaciones, cobranza y cierre de la semana. */
import { addDays, money, mxn } from './kit'
import { ANDREA, LAURA, ROBERTO, SALINAS, TORRES } from './escenario'
import { at, checkMoneyFormat, day, half, notBefore, quoteId, refreshTotal, status, track, type Week } from './flujo'
import { clientReview, finalPublicPage, publicQuoteRequest } from './ui-setup'
import {
  completeReminder, composeQuote, convertRequest, createEvent, createReminder, editQuote, openQuote, publishPhotos, publishPhotosSlowly,
  registerPayment, requestReview, sendQuote, setStatus, submitQuote, uploadPhoto,
} from './ui-quotes'

const QUOTE = 'Panel del taller · Cotización'

export async function dia4(w: Week): Promise<void> {
  const { s } = w
  s.rec.startDay(4, 'Respuestas: un rechazo, dos aceptaciones con anticipo y una negociación', 'El restaurante elige a otro proveedor. El despacho aprueba y paga 50 % por transferencia; Andrea también. La administradora del condominio pide mejor precio y se edita la cotización. Llega una segunda solicitud por la página.')
  await openQuote(s, quoteId(w, 'nogalera'))
  await setStatus(s, 'Rechazar')
  status(w, 'nogalera', 'Rechazada')
  await s.rec.shot(s.page, { id: 'rechazada', title: 'Cotización rechazada: el restaurante eligió a otro proveedor', area: QUOTE, what: 'El rechazo queda registrado y la cotización pasa a "Archivadas" en el tablero; cuenta para la tasa de conversión.', apis: ['PATCH /api/quotes/[id] (estado)'] })

  await openQuote(s, quoteId(w, 'salinas'))
  await setStatus(s, 'Aceptar')
  status(w, 'salinas', 'Aceptada')
  const salinasTotal = await refreshTotal(w, 'salinas')
  const salinasAdvance = half(salinasTotal)
  await registerPayment(s, { amount: salinasAdvance, type: 'anticipo', method: 'transferencia', date: day(w, 4), notes: 'Anticipo 50 % — transferencia SPEI.' })
  status(w, 'salinas', 'Aceptada', salinasAdvance)
  await checkMoneyFormat(w, 'Sección Pagos de /dashboard/quotes/[id]')
  await s.page.getByText('Pagos', { exact: true }).first().scrollIntoViewIfNeeded()
  await s.rec.shot(s.page, { id: 'anticipo', title: 'Proyecto corporativo aceptado: anticipo de 50 % por transferencia', area: QUOTE, what: 'El pago queda con tipo, método, fecha y notas; la barra muestra el avance y el saldo por cobrar.', apis: ['POST /api/quotes/[id]/payments'] })
  await createEvent(s, { title: 'Instalación oficinas — Despacho Salinas', type: 'Instalación', start: at(w, 5, '09:00'), end: at(w, 5, '18:00'), address: SALINAS.address, notes: 'Cuadrilla de 3. Canceles y ventanas el viernes, barandal el sábado.' })
  await completeReminder(s, 'Seguimiento cotización oficinas Salinas')

  await openQuote(s, quoteId(w, 'andrea'))
  await setStatus(s, 'Aceptar')
  status(w, 'andrea', 'Aceptada')
  const andreaAdvance = half(await refreshTotal(w, 'andrea'))
  await registerPayment(s, { amount: andreaAdvance, type: 'anticipo', method: 'transferencia', date: day(w, 4), notes: 'Anticipo 50 %.' })
  status(w, 'andrea', 'Aceptada', andreaAdvance)
  await createEvent(s, { title: 'Instalación cancel y espejo — Andrea Villarreal', type: 'Instalación', start: at(w, 5, '12:00'), end: at(w, 5, '14:00'), address: 'Domicilio de la cliente (confirmar por WhatsApp)', notes: 'Segunda cuadrilla.' })

  await editQuote(s, quoteId(w, 'torres'), { prices: { 0: '8400' }, discount: '7' })
  await refreshTotal(w, 'torres')
  s.rec.log('Condominio: cancel a $8,400 y descuento de 7 % tras negociar')

  await publicQuoteRequest(s, w.browser, w.slug, ROBERTO, false)
  s.rec.client({ name: ROBERTO.name, company: '', origin: 'Página pública', need: ROBERTO.message })
}

export async function dia5(w: Week): Promise<void> {
  const { s } = w
  s.rec.startDay(5, 'Instalaciones, liquidación y reseña con fotos', 'Se instala lo de Andrea con fotos antes y después que se publican en la página; liquida y deja 5 estrellas. Arranca la obra del despacho. El condominio acepta. Se cotiza el espejo de Roberto y se agenda su seguimiento.')
  await openQuote(s, quoteId(w, 'andrea'))
  await setStatus(s, 'Iniciar Instalacion')
  await uploadPhoto(s, w.browser, 'Antes', 'Antes: regadera sin cancel', 'before')
  await setStatus(s, 'Marcar Completado')
  await uploadPhoto(s, w.browser, 'Después', 'Después: cancel templado 9 mm', 'after')
  const published = await publishPhotos(s)
  if (published.persisted < published.total) {
    s.rec.finding('media', 'Publicar varias fotos seguidas pierde marcas', `Se marcaron ${published.total} fotos "En mi página" una tras otra y al recargar solo ${published.persisted} quedaron guardadas. El portafolio público pierde fotos sin avisar.`, 'components/quotes/job-photos-section.tsx')
    const retry = await publishPhotosSlowly(s)
    s.rec.log(`Fotos publicadas tras reintento pausado: ${retry} de ${published.total}`)
  }
  const andrea = s.rec.quotes.get('andrea')!
  const balance = Math.round((andrea.total - andrea.paid) * 100) / 100
  await registerPayment(s, { amount: balance, type: 'liquidacion', method: 'transferencia', date: day(w, 5), notes: 'Liquidación al terminar.' })
  status(w, 'andrea', 'Completada', balance)
  await setStatus(s, 'Marcar Cobrado')
  status(w, 'andrea', 'Cobrada')
  await s.page.getByTestId('job-photos-section').scrollIntoViewIfNeeded()
  await s.rec.shot(s.page, { id: 'andrea-cobrada', title: `${andrea.number}: anticipo + liquidación, fotos antes/después publicadas en la página`, area: QUOTE, what: 'Las fotos marcadas "En mi página" se vuelven portafolio público. Al quedar cobrada se habilita pedir reseña verificada.', apis: ['POST /api/upload/job-photos', 'PATCH /api/job-photos/[id]', 'POST /api/quotes/[id]/payments'], fullPage: true })
  const reviewPath = await requestReview(s)
  await s.page.getByTestId('review-request-card').scrollIntoViewIfNeeded()
  await s.rec.shot(s.page, { id: 'pedir-resena', title: 'Liga de reseña de un solo uso lista para WhatsApp, correo o copiar', area: QUOTE, what: 'La liga identifica la cotización cobrada; solo puede usarse una vez y caduca.', apis: ['POST /api/quotes/[id]/review-request'] })
  await clientReview(s, w.browser, reviewPath, ANDREA.name, 5, 'Midieron el mismo día, el cancel quedó perfecto y el espejo biselado se ve increíble. Muy recomendables.')

  await openQuote(s, quoteId(w, 'salinas'))
  await setStatus(s, 'Iniciar Instalacion')
  await uploadPhoto(s, w.browser, 'Trabajo', 'Oficinas: ventanas Serie 3 negras', 'work')
  status(w, 'salinas', 'En instalación')

  await openQuote(s, quoteId(w, 'torres'))
  await setStatus(s, 'Aceptar')
  status(w, 'torres', 'Aceptada')
  const torresAdvance = half(await refreshTotal(w, 'torres'))
  await registerPayment(s, { amount: torresAdvance, type: 'anticipo', method: 'transferencia', date: day(w, 5), notes: 'Anticipo 50 % — cuenta del condominio.' })
  status(w, 'torres', 'Aceptada', torresAdvance)
  await createEvent(s, { title: 'Instalación depto. muestra — Torres del Lago', type: 'Instalación', start: at(w, 6, '10:00'), end: at(w, 6, '14:00'), address: TORRES.address, notes: 'Pedir acceso en caseta.' })

  await convertRequest(s, ROBERTO.name)
  await composeQuote(s, {
    lines: [{ kind: 'config', search: 'Espejo a la medida', numbers: { ancho: '2400', alto: '1800' }, selects: { espesor: '6', canto: 'Biselado' }, checks: { instalacion: true } }],
    notes: 'Espejo de una pieza con fijación oculta. Se requiere acceso para pieza de 2.40 m.',
  })
  const q6 = await submitQuote(s)
  track(w, 'roberto', ROBERTO.name, 'Por medidas (página pública)', q6, 'Borrador')
  await sendQuote(s, 'WhatsApp')
  status(w, 'roberto', 'Enviada')
  await createReminder(s, { client: ROBERTO.name, title: 'Seguimiento espejo gimnasio — Roberto', type: 'Seguimiento', priority: 'Normal', date: notBefore(w, addDays(day(w, 5), 3)), message: 'Preguntar si tiene dudas sobre el espejo y ofrecer visita de medición.' })
}

async function overview(w: Week): Promise<void> {
  const { s } = w
  const views: readonly { path: string; id: string; title: string; area: string; what: string; full?: boolean }[] = [
    { path: '/dashboard/quotes?view=kanban', id: 'kanban-final', title: 'Tablero Kanban al cierre: cada cotización en su etapa', area: 'Panel del taller · Cotizaciones (Kanban)', what: 'Borrador, enviadas, aceptadas, en instalación, completadas y cobradas; los rechazos quedan en "Archivadas".' },
    { path: '/dashboard/quotes', id: 'lista-final', title: 'Lista de cotizaciones con contadores por estado', area: 'Panel del taller · Cotizaciones', what: 'Vista de lista con filtros por estado y búsqueda por número.' },
    { path: '/dashboard/calendar', id: 'agenda', title: 'Agenda de la semana: medición e instalaciones', area: 'Panel del taller · Agenda', what: 'Eventos de medición e instalación ligados a clientes y cotizaciones.' },
    { path: '/dashboard/reminders', id: 'recordatorios', title: 'Recordatorios: uno completado y uno pendiente', area: 'Panel del taller · Recordatorios', what: 'Seguimientos de cotizaciones enviadas, con prioridad y fecha.' },
    { path: '/dashboard/clients', id: 'clientes-final', title: 'Clientes al cierre: 4 capturados + 2 llegados por la página', area: 'Panel del taller · Clientes', what: 'Los que llegaron por la página quedan etiquetados "vitrina".' },
    { path: '/dashboard/analytics', id: 'analitica', title: 'Analítica de la semana: conversión, ingresos y saldo pendiente', area: 'Panel del taller · Analítica', what: 'Cotizaciones por estado, tasa de conversión, ingresos cobrados y saldo por cobrar.', full: true },
    { path: '/dashboard', id: 'tablero-final', title: 'Tablero principal al cierre de la semana', area: 'Panel del taller', what: 'Resumen de clientes, cotizaciones, ingresos aceptados y recordatorios.' },
  ]
  for (const v of views) {
    await s.pacer.gate(15)
    await s.page.goto(`${s.base}${v.path}`)
    await s.page.waitForLoadState('networkidle').catch(() => undefined)
    if (v.id === 'kanban-final') await s.page.setViewportSize({ width: 2400, height: 900 })
    if (v.id === 'agenda') await auditCalendar(w)
    if (v.id === 'analitica') await auditAnalytics(w)
    await s.rec.shot(s.page, { id: v.id, title: v.title, area: v.area, what: v.what, fullPage: v.full ?? false })
    if (v.id === 'kanban-final') await s.page.setViewportSize({ width: 1366, height: 900 })
  }
}

/** Fila horaria (8:00–20:00) en la que la cuadrícula dibuja un evento, según su posición vertical. */
async function drawnHour(w: Week, titleStart: string): Promise<string | null> {
  const block = w.s.page.locator(`[title^="${titleStart}"]`).first()
  if (!(await block.isVisible().catch(() => false))) return null
  const top = (await block.boundingBox())!.y
  const labels = w.s.page.getByText(/^\d{1,2}:00$/)
  let best: { text: string; y: number } | null = null
  for (let i = 0; i < (await labels.count()); i += 1) {
    const box = await labels.nth(i).boundingBox()
    if (box && box.y <= top + 6 && (!best || box.y > best.y)) best = { text: (await labels.nth(i).textContent()) ?? '', y: box.y }
  }
  return best?.text.trim() ?? null
}

/** Compara los eventos creados con lo que la agenda dibuja: cuántos se ven y a qué hora. */
async function auditCalendar(w: Week): Promise<void> {
  const header = ((await w.s.page.getByText(/\d+ eventos? esta semana/).first().textContent().catch(() => '')) ?? '').trim()
  const drawn = await w.s.page.locator('[title*=" - "]').count()
  const laura = await drawnHour(w, 'Reposición de vidrios')
  w.s.rec.log(`Agenda: "${header}", ${drawn} bloques visibles; la reposición de Laura (16:00) se dibuja en la fila ${laura ?? 'no visible'}`)
  if (drawn < 5 || (laura && laura !== '16:00')) {
    w.s.rec.finding('alta', 'La agenda muestra los eventos a otra hora', `Se agendaron 5 eventos entre 09:00 y 18:00 (hora de Monterrey). La cuadrícula dibuja ${drawn} ("${header}") y la reposición de Laura, programada a las 16:00, aparece en la fila de ${laura ?? '— (fuera de la vista)'}. La hora se guarda sin zona horaria y se reinterpreta; los eventos que caen antes de las 8:00 desaparecen de la cuadrícula. El detalle de la cotización también lista la hora corrida.`, 'components/dashboard/work-event-form.tsx · app/api/calendar/events/route.ts')
  }
}

/** Contrasta las cifras de la analítica con lo que realmente se cobró y cerró en la semana. */
async function auditAnalytics(w: Week): Promise<void> {
  const text = await w.s.page.locator('main').innerText()
  const shown = text.match(/Ingresos\s+(\$[\d,.]+)/)?.[1] ?? '—'
  const funnelPaid = text.match(/Embudo de Conversi[oó]n[\s\S]*?Cobradas\s+(\d+)/)?.[1] ?? '—'
  const quotes = [...w.s.rec.quotes.values()]
  const collected = quotes.reduce((a, q) => a + q.paid, 0)
  const paidCount = quotes.filter((q) => q.status === 'Cobrada').length
  w.s.rec.log(`Analítica: Ingresos ${shown}, embudo "Cobradas" ${funnelPaid}; real: cobrado ${mxn(collected)}, ${paidCount} cobradas`)
  if (money(shown) !== Math.round(collected * 100) / 100 || funnelPaid !== String(paidCount)) {
    w.s.rec.finding('alta', 'La analítica no refleja lo cobrado', `La tarjeta "Ingresos" muestra ${shown} y el embudo ${funnelPaid} cotizaciones cobradas, pero en la semana se cobraron ${mxn(collected)} en pagos y ${paidCount} cotizaciones llegaron a "Cobrada". La analítica no considera los estados en instalación, completada y cobrada.`, '/dashboard/analytics')
  }
}

export async function dia6(w: Week): Promise<void> {
  const { s } = w
  s.rec.startDay(6, 'Cierre de semana: obra terminada con saldo, borrador nuevo y revisión', 'Se termina la obra del despacho y se recibe un pago parcial, quedando saldo por cobrar. Laura pide otra cotización que queda en borrador. Sofía revisa su tablero, agenda, recordatorios, analítica y su página pública.')
  await openQuote(s, quoteId(w, 'salinas'))
  await setStatus(s, 'Marcar Completado')
  const salinas = s.rec.quotes.get('salinas')!
  const partial = Math.round(salinas.total * 30) / 100
  await registerPayment(s, { amount: partial, type: 'parcial', method: 'transferencia', date: day(w, 6), notes: 'Pago parcial 30 %; resta 20 % contra entrega de garantías.' })
  status(w, 'salinas', 'Completada', partial)
  await s.page.getByText('Pagos', { exact: true }).first().scrollIntoViewIfNeeded()
  await s.rec.shot(s.page, { id: 'saldo-pendiente', title: `${salinas.number}: obra completada con 80 % cobrado y saldo pendiente`, area: QUOTE, what: 'Caso real de cobranza: la obra terminó pero falta un 20 %. La cotización se queda en "Completada" hasta liquidar.', apis: ['POST /api/quotes/[id]/payments'], fullPage: true })

  await composeQuote(s, {
    client: LAURA.name,
    lines: [
      { kind: 'service', search: 'Mosquitero corredizo', qty: '2' },
      { kind: 'service', search: 'Mano de obra adicional', qty: '1' },
    ],
    notes: 'Mosquiteros para las ventanas de la cocina y la recámara.',
  })
  const q7 = await submitQuote(s)
  track(w, 'laura-2', LAURA.name, 'Sencilla (cliente recurrente)', q7, 'Borrador')

  await overview(w)
  await finalPublicPage(s, w.browser, w.slug)
}
