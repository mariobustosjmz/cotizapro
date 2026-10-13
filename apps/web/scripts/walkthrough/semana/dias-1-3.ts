/** Lunes a miércoles: arranque del negocio, primeras cotizaciones simples y la cotización corporativa. */
import path from 'node:path'
import { chooseComboboxOption } from '../../../e2e/helpers/combobox'
import { addDays } from './kit'
import { ANDREA, COMPANY, LAURA, MEMBER_EMAIL, NOGALERA, SALINAS, SERVICES, SHOWCASE, TORRES, bathTemplate } from './escenario'
import { at, checkMoneyFormat, day, notBefore, quoteId, status, track, type Week } from './flujo'
import { adjustPriceList, clientReview, companySettings, createClient, createService, createTemplate, editPriceRow, inviteMember, onboarding, publicQuoteRequest, publishShowcase, signup, type Owner } from './ui-setup'
import {
  addLines, composeQuote, convertRequest, createEvent, createReminder, downloadPdf, formValue, kanbanMove, openQuote, quoteTotalInForm,
  registerPayment, requestReview, sendQuote, setStatus, setSummary, submitQuote, termsValue, uploadPhoto,
} from './ui-quotes'

const QUOTE_AREA = 'Panel del taller · Nueva cotización'

export async function dia1(w: Week, owner: Owner): Promise<void> {
  const { s } = w
  s.rec.startDay(1, 'Arranque: cuenta, giro, precios, catálogo, página y equipo', 'Sofía abre su cuenta, elige el giro, ajusta precios al alza de su proveedor, agrega servicios propios, arma un paquete promocional, publica su página, invita a su instalador y captura a sus primeros clientes. Cotiza y envía su primer trabajo sencillo.')
  await signup(s, owner)
  await onboarding(s)
  await companySettings(s, COMPANY)
  await adjustPriceList(s, 'Vidrio templado', 6)
  await editPriceRow(s, 'Espejo', 1, '560')
  for (const svc of SERVICES) await createService(s, svc)
  await s.page.goto(`${s.base}/dashboard/services`)
  await s.rec.shot(s.page, { id: 'servicios', title: 'Catálogo: productos configurables de la plantilla + 3 servicios propios', area: 'Panel del taller · Catálogo', what: 'Los productos "Configurable" se cotizan por medidas con el motor de precios. Los servicios simples se cobran por pieza, hora o m².', apis: ['GET /api/services', 'POST /api/services'], fullPage: true })
  await createTemplate(s, bathTemplate(addDays(w.today, 20)))
  w.slug = await publishShowcase(s, SHOWCASE)
  const expectedSlug = owner.business.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (w.slug !== expectedSlug) s.rec.finding('baja', 'La liga pública deforma nombres con acentos', `"${owner.business}" generó la liga /p/${w.slug}; se esperaba /p/${expectedSlug}. La letra acentuada se convierte en guion en lugar de perder el acento.`, 'Generación de slug de la vitrina')
  await inviteMember(s, MEMBER_EMAIL, 'member')
  await createClient(s, SALINAS, true)
  for (const c of [LAURA, TORRES, NOGALERA]) await createClient(s, c)
  for (const c of [LAURA, SALINAS, TORRES, NOGALERA]) s.rec.client({ name: c.name, company: c.company ?? '', origin: 'Alta manual', need: c.notes })
  await s.page.getByRole('heading', { name: 'Clientes' }).waitFor()
  await s.rec.shot(s.page, { id: 'clientes', title: 'Cartera inicial: 4 clientes capturados a mano', area: 'Panel del taller · Clientes', what: 'Residencial, corporativo, condominio y comercial: cada uno con etiquetas para filtrarlos después.', apis: ['GET /api/clients'] })

  await composeQuote(s, {
    client: LAURA.name,
    lines: [
      { kind: 'service', search: 'Reposición de vidrio roto', qty: '2' },
      { kind: 'free', description: 'Vidrio claro 4 mm: 0.60 × 0.80 m (cocina) y 0.50 × 0.70 m (baño)', qty: '1', price: '520' },
    ],
    notes: 'Se retira el vidrio dañado y se deja limpio.',
  })
  const validity = await formValue(s.page, 'Vigencia')
  const terms = await termsValue(s.page)
  if (validity !== COMPANY.validDays || terms !== COMPANY.terms) {
    s.rec.finding('media', 'La configuración de la empresa no se aplica a cotizaciones nuevas', `En Configuración → Empresa se guardó vigencia de ${COMPANY.validDays} días y términos propios, pero "Nueva cotización" propone ${validity} días y ${terms === COMPANY.terms ? 'los términos guardados' : 'otros términos por defecto'}.`, '/dashboard/quotes/new')
  }
  await s.rec.shot(s.page, { id: 'cotizacion-simple', title: 'Cotización sencilla: 2 reposiciones de vidrio + material', area: QUOTE_AREA, what: 'Caso directo: un servicio del catálogo por pieza y una partida libre con precio capturado a mano.', apis: ['POST /api/quotes'], facts: { total: await quoteTotalInForm(s.page), vigencia: `${validity} días` } })
  const q1 = await submitQuote(s)
  track(w, 'laura', LAURA.name, 'Sencilla', q1, 'Borrador')
  const sent = await sendQuote(s, 'WhatsApp', { id: 'envio-whatsapp', title: `Envío de ${q1.number} a Laura por WhatsApp` })
  if (/errores parciales/.test(sent)) s.rec.finding('media', 'Envío sin canal configurado', 'Al enviar por WhatsApp o correo el servidor responde "Envio con errores parciales": no hay llave de Resend ni de Twilio. La cotización queda "Enviada" aunque el cliente no recibió nada; además el WhatsApp usa Twilio y no la liga wa.me acordada.', 'Diálogo "Enviar Cotizacion"')
  status(w, 'laura', 'Enviada')
  await publicQuoteRequest(s, w.browser, w.slug, ANDREA, true)
  s.rec.client({ name: ANDREA.name, company: '', origin: 'Página pública', need: ANDREA.message })
}

export async function dia2(w: Week): Promise<void> {
  const { s } = w
  s.rec.startDay(2, 'Primer trabajo cobrado, visita de medición y la solicitud de la página', 'Laura acepta y paga en efectivo; el vidrio se repone el mismo día y se pide reseña. Sofía mide las oficinas del arquitecto y convierte la solicitud de Andrea en una cotización por medidas.')
  await openQuote(s, quoteId(w, 'laura'))
  await setStatus(s, 'Aceptar')
  status(w, 'laura', 'Aceptada')
  const total = w.s.rec.quotes.get('laura')!.total
  await registerPayment(s, { amount: total, type: 'liquidacion', method: 'efectivo', date: day(w, 2), notes: 'Pago completo en efectivo al aceptar.' })
  status(w, 'laura', 'Aceptada', total)
  await createEvent(s, { title: 'Reposición de vidrios — Laura Méndez', type: 'Instalación', start: at(w, 2, '16:00'), end: at(w, 2, '17:30'), address: LAURA.address, notes: 'Llevar vidrio claro 4 mm cortado.' })
  await openQuote(s, quoteId(w, 'laura'))
  await setStatus(s, 'Iniciar Instalación')
  await uploadPhoto(s, w.browser, 'Trabajo', 'Vidrio de cocina repuesto', 'work')
  await setStatus(s, 'Marcar Completado')
  await setStatus(s, 'Marcar Cobrado')
  status(w, 'laura', 'Cobrada')
  await checkMoneyFormat(w, '/dashboard/quotes/[id]')
  await s.rec.shot(s.page, { id: 'laura-cobrada', title: `${w.s.rec.quotes.get('laura')!.number}: pagada al 100 % en efectivo, instalada y cobrada el mismo día`, area: 'Panel del taller · Cotización', what: 'Ciclo corto completo: enviada → aceptada → en instalación → completada → cobrada, con un solo pago y foto del trabajo.', apis: ['PATCH /api/quotes/[id]', 'POST /api/quotes/[id]/payments', 'POST /api/upload/job-photos'], fullPage: true })
  w.reviews.set('laura', await requestReview(s))
  s.rec.log('Liga de reseña de un solo uso generada para Laura')

  await createEvent(s, { client: SALINAS.company, title: 'Medición oficinas — Despacho Salinas', type: 'Medición', start: at(w, 2, '10:00'), end: at(w, 2, '11:30'), address: SALINAS.address, notes: 'Medir 3 baños, 4 ventanas de fachada y barandal.' })

  await convertRequest(s, ANDREA.name)
  await composeQuote(s, {
    lines: [
      { kind: 'config', search: 'Cancel de baño', numbers: { ancho: '1500', alto: '1900' }, selects: { espesor: '9', herraje: 'Corredizo acero' } },
      { kind: 'config', search: 'Espejo a la medida', numbers: { ancho: '900', alto: '700' }, selects: { canto: 'Biselado' } },
    ],
  })
  await s.rec.shot(s.page, { id: 'cotizacion-medidas', title: 'Cotización por medidas para Andrea: cancel 1.50 × 1.90 m + espejo biselado', area: QUOTE_AREA, what: 'Partidas configurables: se capturan medidas y opciones y el motor calcula vidrio, herrajes, cantos, desperdicio e instalación con los precios ya ajustados del lunes.', apis: ['GET /api/price-lists', 'POST /api/quotes (el servidor recalcula)'], facts: { total: await quoteTotalInForm(s.page) }, fullPage: true })
  const q2 = await submitQuote(s)
  track(w, 'andrea', ANDREA.name, 'Por medidas (página pública)', q2, 'Borrador')
  await downloadPdf(s, path.join(w.out, 'cotizacion-andrea.pdf'))
  await sendQuote(s, 'Correo')
  status(w, 'andrea', 'Enviada')
}

export async function dia3(w: Week): Promise<void> {
  const { s } = w
  s.rec.startDay(3, 'Proyecto corporativo, paquete promocional y cotización comercial', 'Laura deja su reseña. Sofía arma la cotización grande del despacho (tres productos configurables, servicios por m² y por hora, descuento y vigencia corta), aplica el paquete promocional al condominio y cotiza al restaurante.')
  await clientReview(s, w.browser, w.reviews.get('laura')!, LAURA.name, 4, 'Llegaron puntuales y dejaron todo limpio. Tardaron un poco en confirmar la hora.')

  await composeQuote(s, {
    client: SALINAS.name,
    lines: [
      { kind: 'config', search: 'Cancel de baño', numbers: { ancho: '900', alto: '1900', piezas: '3' }, selects: { espesor: '10', herraje: 'Abatible acero' } },
      { kind: 'config', search: 'Ventana de aluminio', numbers: { ancho: '1800', alto: '1500', piezas: '4' }, selects: { linea: 'Serie 3', acabado: 'Negro' }, checks: { mosquitero: true } },
      { kind: 'config', search: 'Vidrio a la medida', numbers: { ancho: '1200', alto: '1000', piezas: '6' }, selects: { tipo: 'Laminado', espesor: '9' }, checks: { pulido: true, instalacion: true } },
    ],
  })
  const errors = s.page.getByTestId('item-2-errors')
  await errors.waitFor({ timeout: 15_000 })
  await errors.scrollIntoViewIfNeeded()
  await s.rec.shot(s.page, { id: 'sin-precio', title: 'Validación: laminado de 9 mm no tiene precio y el motor lo avisa', area: QUOTE_AREA, what: 'La lista "Vidrio flotado" solo tiene laminado de 6 mm. El formulario marca la partida y no deja guardar hasta corregirla.', facts: { aviso: ((await errors.textContent()) ?? '').trim() } })
  await chooseComboboxOption(s.page, 'item-2-espesor', '6')
  await errors.waitFor({ state: 'detached', timeout: 15_000 })
  await addLines(s, 3, [
    { kind: 'service', search: 'Película de seguridad', qty: '12' },
    { kind: 'service', search: 'Mano de obra adicional', qty: '6' },
  ])
  await setSummary(s, { discount: '8', validDays: '15', notes: 'Incluye retiro de canceles anteriores. Entrega en 10 días hábiles tras el anticipo.' })
  await s.rec.shot(s.page, { id: 'cotizacion-compleja', title: 'Cotización corporativa: 3 configurables + m² + horas, 8 % de descuento, vigencia 15 días', area: QUOTE_AREA, what: '3 canceles abatibles de 10 mm, 4 ventanas Serie 3 negras con mosquitero, 6 paneles laminados con pulido, 12 m² de película y 6 horas de mano de obra.', apis: ['POST /api/quotes'], facts: { total: await quoteTotalInForm(s.page) }, fullPage: true })
  const q3 = await submitQuote(s)
  track(w, 'salinas', SALINAS.company!, 'Compleja (corporativo)', q3, 'Borrador')
  await checkMoneyFormat(w, '/dashboard/quotes/[id]')
  await s.rec.shot(s.page, { id: 'detalle-compleja', title: `${q3.number}: detalle con partidas descritas por el motor`, area: 'Panel del taller · Cotización', what: 'Cada partida configurable guarda su descripción con medidas y opciones, y una copia congelada de los precios usados.', apis: ['GET /api/quotes/[id]'], fullPage: true })
  await sendQuote(s, 'Correo')
  status(w, 'salinas', 'Enviada')
  await createReminder(s, { client: SALINAS.name, title: 'Seguimiento cotización oficinas Salinas', type: 'Seguimiento', priority: 'Alta', date: notBefore(w, day(w, 5)), message: 'Llamar al arquitecto para confirmar si aprueba antes de que venza la vigencia.' })

  await composeQuote(s, { client: TORRES.name, template: { name: 'Paquete Baño Completo', items: 2 }, lines: [] })
  const templateTerms = await termsValue(s.page)
  if (!templateTerms.includes('Garantía de 1 año en herrajes')) s.rec.finding('baja', 'Los términos de la plantilla no se aplican', 'Al aplicar "Paquete Baño Completo" se cargan partidas y descuento, pero los términos guardados en la plantilla no aparecen en la cotización.', '/dashboard/quotes/new')
  await s.rec.shot(s.page, { id: 'plantilla-aplicada', title: 'Paquete promocional aplicado al condominio', area: QUOTE_AREA, what: 'La plantilla "Paquete Baño Completo" llena partidas y aplica 5 % de descuento de la "Promo Otoño".', apis: ['GET /api/templates', 'POST /api/quotes'], facts: { total: await quoteTotalInForm(s.page) }, fullPage: true })
  const q4 = await submitQuote(s)
  track(w, 'torres', TORRES.company!, 'Paquete (plantilla)', q4, 'Borrador')
  await kanbanMove(s, q4.number, 'Enviadas')
  status(w, 'torres', 'Enviada')
  await s.rec.shot(s.page, { id: 'kanban-enviar', title: `Tablero Kanban: ${q4.number} se arrastra de Borrador a Enviadas`, area: 'Panel del taller · Cotizaciones (Kanban)', what: 'El tablero permite mover el estado arrastrando la tarjeta; el servidor valida que la transición sea válida.', apis: ['PATCH /api/quotes/[id] (estado)'] })

  await composeQuote(s, {
    client: NOGALERA.name,
    lines: [
      { kind: 'service', search: 'Película de seguridad', qty: '18' },
      { kind: 'service', search: 'Mano de obra adicional', qty: '4' },
      { kind: 'free', description: 'Retiro de película anterior y limpieza de ventanal', qty: '1', price: '900' },
    ],
  })
  const q5 = await submitQuote(s)
  track(w, 'nogalera', NOGALERA.company!, 'Sencilla por m² y hora', q5, 'Borrador')
  await sendQuote(s, 'WhatsApp')
  status(w, 'nogalera', 'Enviada')
}
