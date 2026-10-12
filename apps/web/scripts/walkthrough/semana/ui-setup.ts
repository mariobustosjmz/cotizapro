/**
 * Acciones de interfaz para dar de alta y configurar el negocio, y las que hace un cliente sin sesión.
 * Todo pasa por la pantalla: clics, formularios y diálogos, igual que una persona.
 */
import type { Browser, BrowserContext } from '@playwright/test'
import { chooseComboboxOption } from '../../../e2e/helpers/combobox'
import { toast, type Pacer, type Session } from './kit'

export interface Owner {
  readonly fullName: string
  readonly email: string
  readonly password: string
  readonly business: string
}

export async function signup(s: Session, o: Owner): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/signup`)
  await s.page.locator('input[name="fullName"]').fill(o.fullName)
  await s.page.locator('input[name="email"]').fill(o.email)
  await s.page.locator('input[name="orgName"]').fill(o.business)
  await s.page.locator('input[name="password"]').fill(o.password)
  await s.rec.shot(s.page, { id: 'registro', title: 'Registro del negocio nuevo', area: 'Acceso', what: 'La dueña crea su cuenta: nombre, correo, nombre del negocio y contraseña. Se crean usuario, organización y perfil de dueña.', apis: ['Supabase Auth: POST /auth/v1/signup', 'RPC create_organization_with_owner'], facts: { negocio: o.business, correo: o.email } })
  await s.page.locator('button[type="submit"]').click()
  await s.page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

export async function onboarding(s: Session): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard`)
  await s.page.getByTestId('setup-banner').waitFor()
  await s.rec.shot(s.page, { id: 'tablero-vacio', title: 'Primer ingreso: tablero vacío y aviso "Configura tu cuenta"', area: 'Panel del taller', what: 'Cuenta recién creada: sin clientes ni cotizaciones. El aviso solo lo ve la dueña mientras no configure su giro.' })
  await s.page.getByTestId('setup-banner').click()
  await s.page.getByTestId('account-type-company').click()
  await s.page.getByTestId('trade-glass').click()
  await s.rec.shot(s.page, { id: 'giro', title: 'Configuración: "Como empresa", giro vidrio y aluminio, con precios de ejemplo', area: 'Panel del taller · Configuración', what: 'Elegir el giro carga listas de precios y productos configurables de vidrio, y crea la página pública en borrador.', apis: ['POST /api/organization/setup'], fullPage: true })
  await s.page.getByTestId('account-setup-submit').click()
  await s.page.waitForURL(/\/dashboard\/vitrina/, { timeout: 30_000 })
}

export interface CompanyData {
  readonly email: string
  readonly phone: string
  readonly address: string
  readonly validDays: string
  readonly terms: string
}

export async function companySettings(s: Session, c: CompanyData): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/settings`)
  await s.page.getByRole('button', { name: 'Empresa', exact: true }).click()
  await s.page.locator('#company_email').fill(c.email)
  await s.page.locator('#company_phone').fill(c.phone)
  await s.page.locator('#company_address').fill(c.address)
  await s.page.locator('#quote_valid_days').fill(c.validDays)
  await s.page.locator('#quote_terms').fill(c.terms)
  await s.page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await toast(s.page, 'Organización actualizada exitosamente')
  await s.rec.shot(s.page, { id: 'empresa', title: 'Datos de la empresa: contacto, vigencia de 15 días y términos propios', area: 'Panel del taller · Configuración', what: 'Datos fiscales y de contacto que deberían usarse en cotizaciones y PDF: vigencia por defecto y términos y condiciones del taller.', apis: ['PATCH /api/settings/organization'], fullPage: true })
}

function priceListSection(s: Session, name: string) {
  return s.page.locator('section[data-testid^="price-list-"]').filter({ has: s.page.getByRole('heading', { name, exact: true }) })
}

export async function adjustPriceList(s: Session, name: string, percent: number): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/price-lists`)
  const section = priceListSection(s, name)
  await section.locator('input[id$="-adjust"]').fill(String(percent))
  await section.getByRole('button', { name: 'Aplicar', exact: true }).click()
  const dialog = s.page.getByRole('dialog')
  await dialog.waitFor()
  await s.rec.shot(s.page, { id: 'ajuste-precios', title: `Ajuste masivo: +${percent} % a "${name}" por alza del proveedor`, area: 'Panel del taller · Motor de precios', what: 'El proveedor subió el vidrio templado. Un ajuste porcentual actualiza toda la tabla; las cotizaciones ya guardadas conservan su precio.', apis: ['PATCH /api/price-lists/[id] (adjust_percent)'] })
  await dialog.getByRole('button', { name: 'Aplicar ajuste' }).click()
  await toast(s.page, /Ajuste de .* aplicado/)
}

export async function editPriceRow(s: Session, name: string, row: number, price: string): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/price-lists`)
  const section = priceListSection(s, name)
  await section.getByLabel(`Precio fila ${row}`, { exact: true }).fill(price)
  await section.getByRole('button', { name: 'Guardar', exact: true }).click()
  await toast(s.page, `Precios de "${name}" guardados`)
  await section.scrollIntoViewIfNeeded()
  await s.rec.shot(s.page, { id: 'precio-fila', title: `Precio puntual editado en "${name}" (fila ${row} → $${price})`, area: 'Panel del taller · Motor de precios', what: 'Edición directa de una fila de la tabla de precios, sin tocar las demás.', apis: ['PATCH /api/price-lists/[id] (rows)'] })
}

export interface SimpleService {
  readonly name: string
  readonly unit: 'Precio Fijo' | 'Por Hora' | 'Por m²' | 'Por Unidad'
  readonly price: string
  readonly description: string
}

export async function createService(s: Session, svc: SimpleService): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/services/new`)
  await s.page.locator('#name').fill(svc.name)
  await chooseComboboxOption(s.page, 'category', 'Otros')
  await chooseComboboxOption(s.page, 'unit_type', svc.unit)
  await s.page.locator('#unit_price').fill(svc.price)
  await s.page.locator('#description').fill(svc.description)
  await s.page.getByRole('button', { name: 'Crear Servicio' }).click()
  await toast(s.page, 'Servicio creado exitosamente')
  s.rec.log(`Servicio "${svc.name}" (${svc.unit}, $${svc.price})`)
}

export interface TemplateItem {
  readonly description: string
  readonly qty: string
  readonly price: string
  readonly unit: 'fixed' | 'per_hour' | 'per_sqm' | 'per_unit'
}

export interface TemplateData {
  readonly name: string
  readonly description: string
  readonly terms: string
  readonly discount: string
  readonly promo: string
  readonly promoUntil: string
  readonly items: readonly TemplateItem[]
}

export async function createTemplate(s: Session, t: TemplateData): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/templates`)
  await s.page.getByRole('button', { name: /^(Nuevo|Crear Primer Template)$/ }).first().click()
  await s.page.locator('#modal_name').fill(t.name)
  await s.page.locator('#modal_description').fill(t.description)
  await s.page.locator('#modal_terms').fill(t.terms)
  await s.page.locator('#modal_discount').fill(t.discount)
  await s.page.locator('#modal_promo').fill(t.promo)
  await s.page.locator('#modal_promo_date').fill(t.promoUntil)
  for (const [i, item] of t.items.entries()) {
    await s.page.getByRole('button', { name: 'Agregar', exact: true }).click()
    await s.page.locator('input[placeholder="Descripción"]').nth(i).fill(item.description)
    await s.page.locator('input[placeholder="Cant."]').nth(i).fill(item.qty)
    await s.page.locator('input[placeholder="Precio"]').nth(i).fill(item.price)
    await s.page.locator('select:has(option[value="per_sqm"])').nth(i).selectOption(item.unit)
  }
  await s.rec.shot(s.page, { id: 'plantilla', title: `Plantilla "${t.name}" con promoción "${t.promo}"`, area: 'Panel del taller · Plantillas', what: 'Paquete reutilizable: partidas por defecto, descuento, términos y etiqueta de promoción con vigencia.', apis: ['POST /api/templates'] })
  await s.page.getByRole('button', { name: 'Crear', exact: true }).click()
  await toast(s.page, 'Template creado exitosamente')
}

export interface ShowcaseData {
  readonly headline: string
  readonly bio: string
  readonly city: string
  readonly area: string
  readonly whatsapp: string
  readonly email: string
}

export async function publishShowcase(s: Session, v: ShowcaseData): Promise<string> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/vitrina`)
  await s.page.locator('#vitrina-headline').fill(v.headline)
  await s.page.locator('#vitrina-bio').fill(v.bio)
  await s.page.locator('#vitrina-city').fill(v.city)
  await s.page.locator('#vitrina-service_area').fill(v.area)
  await s.page.locator('#vitrina-whatsapp_phone').fill(v.whatsapp)
  await s.page.locator('#vitrina-contact_email').fill(v.email)
  await s.page.getByTestId('vitrina-is_published').check()
  await s.page.getByTestId('vitrina-save').click()
  await s.page.getByText('Cambios guardados').waitFor()
  const url = (await s.page.getByTestId('vitrina-url').textContent())!.trim()
  await s.rec.shot(s.page, { id: 'mi-pagina', title: 'Página pública publicada: liga y código QR para compartir', area: 'Panel del taller · Vitrina', what: 'Se publican descripción, zona de servicio y contacto. La liga y el QR se comparten en WhatsApp, tarjetas y lonas.', apis: ['PUT /api/showcase/profile', 'GET /api/showcase/qr-card'], facts: { liga: url }, fullPage: true })
  return url.split('/p/')[1]!
}

export async function inviteMember(s: Session, email: string, role: 'member' | 'admin' | 'viewer'): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/team/invite`)
  await s.page.locator('#email').fill(email)
  await s.page.locator('select#role').selectOption(role)
  await s.page.getByRole('button', { name: /Enviar Invitaci/ }).click()
  await s.page.waitForURL(/\/dashboard\/team$/, { timeout: 30_000 })
  await s.page.getByText('Pendiente').first().waitFor()
  await s.rec.shot(s.page, { id: 'equipo', title: 'Equipo: invitación al instalador pendiente de aceptar', area: 'Panel del taller · Equipo', what: 'La dueña invita a su instalador con rol "Miembro". La invitación queda pendiente por 7 días.', apis: ['POST /api/team/invitations'], facts: { invitado: email, rol: role } })
}

export interface ClientData {
  readonly name: string
  readonly company?: string
  readonly email?: string
  readonly phone: string
  readonly address: string
  readonly tags: string
  readonly notes: string
}

export async function createClient(s: Session, c: ClientData, shot = false): Promise<void> {
  await s.pacer.gate()
  await s.page.goto(`${s.base}/dashboard/clients/new`)
  await s.page.locator('#name').fill(c.name)
  if (c.company) await s.page.locator('#company_name').fill(c.company)
  if (c.email) await s.page.locator('#email').fill(c.email)
  await s.page.locator('#phone').fill(c.phone)
  await s.page.locator('#address').fill(c.address)
  await s.page.locator('#tags').fill(c.tags)
  await s.page.locator('#notes').fill(c.notes)
  if (shot) await s.rec.shot(s.page, { id: 'cliente-nuevo', title: `Alta manual de cliente: ${c.company ?? c.name}`, area: 'Panel del taller · Clientes', what: 'Cliente que llegó por teléfono o recomendación: se captura con empresa, contacto, dirección, etiquetas y notas.', apis: ['POST /api/clients'], fullPage: true })
  await s.page.getByRole('button', { name: 'Crear Cliente' }).click()
  await toast(s.page, 'Cliente creado exitosamente')
  s.rec.log(`Cliente "${c.company ? `${c.company} (${c.name})` : c.name}" dado de alta`)
}

export interface PublicRequest {
  readonly name: string
  readonly phone: string
  readonly email?: string
  readonly message: string
  readonly measures: string
}

/**
 * Celular de un cliente anónimo. Solo en local cada cliente simula su propia IP para poder repetir la corrida;
 * en producción Caddy agrega la IP real como último salto y es la que cuenta para el límite.
 */
async function mobileContext(browser: Browser, pacer: Pacer, base: string): Promise<BrowserContext> {
  const local = /localhost|127\.0\.0\.1/.test(base)
  const extraHTTPHeaders = local ? { 'x-forwarded-for': `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } : undefined
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Monterrey', extraHTTPHeaders })
  pacer.attach(ctx)
  return ctx
}

export async function publicQuoteRequest(s: Session, browser: Browser, slug: string, r: PublicRequest, first: boolean): Promise<void> {
  await s.pacer.gate()
  const ctx = await mobileContext(browser, s.pacer, s.base)
  const page = await ctx.newPage()
  try {
    await page.goto(`${s.base}/p/${slug}`)
    if (first) await s.rec.shot(page, { id: 'vitrina-movil', title: 'Lo que ve un cliente en su celular al abrir la liga', area: 'Página pública (sin sesión)', what: 'Página del taller vista por cualquier persona: servicios con precio desde, zona y botón para pedir cotización.', apis: ['RPC get_public_profile'] })
    await page.locator('#qr-name').fill(r.name)
    await page.locator('#qr-phone').fill(r.phone)
    if (r.email) await page.locator('#qr-email').fill(r.email)
    await page.locator('#qr-message').fill(r.message)
    await page.locator('#qr-measurements').fill(r.measures)
    await page.locator('#pedir-cotizacion').scrollIntoViewIfNeeded()
    await s.rec.shot(page, { id: 'cliente-pide', title: `${r.name} pide cotización desde la página`, area: 'Página pública (sin sesión)', what: `Necesidad: ${r.message}`, apis: ['POST /api/public/quote-requests'], facts: { medidas: r.measures } })
    const response = page.waitForResponse((res) => res.url().endsWith('/api/public/quote-requests') && res.request().method() === 'POST')
    await page.getByRole('button', { name: 'Enviar solicitud' }).click()
    if ((await response).status() === 429) throw new Error('La página pública rechazó la solicitud (429): se alcanzó el límite de 5 solicitudes por hora desde esta IP. Espera una hora y vuelve a correr.')
    await page.getByTestId('quote-request-sent').waitFor({ timeout: 20_000 })
    s.rec.log(`Solicitud pública recibida de ${r.name}`)
  } finally {
    await ctx.close()
  }
}

export async function clientReview(s: Session, browser: Browser, reviewPath: string, who: string, stars: number, comment: string): Promise<void> {
  await s.pacer.gate()
  const ctx = await mobileContext(browser, s.pacer, s.base)
  const page = await ctx.newPage()
  try {
    await page.goto(`${s.base}${reviewPath}`)
    const label = stars === 1 ? '1 estrella' : `${stars} estrellas`
    await page.getByRole('radio', { name: label, exact: true }).click()
    await page.locator('#review-comment').fill(comment)
    await s.rec.shot(page, { id: 'resena', title: `${who} califica con ${stars} estrellas desde su celular`, area: 'Liga de reseña (sin sesión)', what: 'La liga de un solo uso llega por WhatsApp. El cliente califica y comenta; solo quien recibió el trabajo puede reseñar.', apis: ['RPC get_review_request', 'POST /api/public/reviews'], facts: { comentario: comment } })
    await page.getByRole('button', { name: 'Enviar reseña' }).click()
    await page.getByTestId('review-sent').waitFor({ timeout: 20_000 })
    s.rec.log(`Reseña de ${who}: ${stars} estrellas`)
  } finally {
    await ctx.close()
  }
}

export async function finalPublicPage(s: Session, browser: Browser, slug: string): Promise<void> {
  await s.pacer.gate()
  const ctx = await mobileContext(browser, s.pacer, s.base)
  const page = await ctx.newPage()
  try {
    await page.goto(`${s.base}/p/${slug}`)
    await s.rec.shot(page, { id: 'vitrina-final', title: 'Página pública al cierre de la semana', area: 'Página pública (sin sesión)', what: 'Trabajos realizados con fotos antes/después, calificación promedio y reseñas verificadas de clientes reales del taller.', apis: ['RPC get_public_profile'], fullPage: true })
  } finally {
    await ctx.close()
  }
}
