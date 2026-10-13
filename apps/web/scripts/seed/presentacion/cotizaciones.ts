import { priceQuoteItems } from '../../../lib/pricing/price-quote-items'
import type { IncomingQuoteItem, PricedQuoteItem } from '../../../lib/pricing/types'
import type { SeededCatalog } from '../steps/catalog'
import { type Admin, check, must } from '../util'
import { COMPANY_SETTINGS, ROLE_INDEX } from './cuenta'
import { instant, wallClock, ymd } from './fechas'
import type { CaseClient, CaseLine, CaseQuote } from './tipos'

export interface SavedQuote {
  readonly key: string
  readonly id: string
  readonly number: string
  readonly clientId: string
  readonly total: number
  readonly paid: number
  readonly status: CaseQuote['status']
  readonly story: string
}

export type ClientIds = ReadonlyMap<string, { readonly id: string; readonly address: string }>

const round2 = (n: number): number => Math.round(n * 100) / 100

export async function insertClients(admin: Admin, orgId: string, ownerId: string, clients: readonly CaseClient[]): Promise<ClientIds> {
  const rows = clients.map((c) => ({
    organization_id: orgId, name: c.name, company_name: c.company ?? null, email: c.email ?? null, phone: c.phone, whatsapp_phone: c.phone,
    address: c.address, city: c.city, state: 'Nuevo León', postal_code: c.postalCode, tags: [...c.tags], notes: c.notes ?? null, created_by: ownerId,
  }))
  const data = must(await admin.from('clients').insert(rows).select('id, name, address'), 'insert clients')
  return new Map(clients.map((c) => {
    const row = data.find((d) => d.name === c.name)
    if (!row) throw new Error(`cliente sin id: ${c.name}`)
    return [c.key, { id: row.id as string, address: c.address }] as const
  }))
}

export function priceLines(lines: readonly CaseLine[], catalog: SeededCatalog): readonly PricedQuoteItem[] {
  const items: IncomingQuoteItem[] = lines.map((line) => {
    const svc = catalog.services.find((s) => s.name === line.service)
    if (!svc) throw new Error(`servicio no encontrado en el catálogo: ${line.service}`)
    return line.input
      ? { service_id: svc.id, description: svc.name, quantity: 1, unit_price: 1, unit_type: 'fixed', input: line.input }
      : { service_id: svc.id, description: svc.name, quantity: line.quantity ?? 1, unit_price: svc.unit_price, unit_type: svc.unit_type }
  })
  const res = priceQuoteItems(items, { products: new Map(catalog.services.map((s) => [s.id, s])), priceLists: catalog.priceLists })
  if (!res.ok) throw new Error(`precio inválido: ${res.errors.join('; ')}`)
  return res.value
}

function totals(items: readonly PricedQuoteItem[], discountRate: number): { subtotal: number; discount: number; tax: number; total: number } {
  const subtotal = round2(items.reduce((acc, it) => acc + it.subtotal, 0))
  const discount = round2((subtotal * discountRate) / 100)
  const tax = round2(((subtotal - discount) * COMPANY_SETTINGS.tax_rate) / 100)
  return { subtotal, discount, tax, total: round2(subtotal - discount + tax) }
}

async function insertPayments(admin: Admin, orgId: string, ownerId: string, q: CaseQuote, quoteId: string, total: number): Promise<number> {
  let paid = 0
  const rows = (q.payments ?? []).map((p) => {
    const amount = p.share === 'resto' ? round2(total - paid) : round2(total * p.share)
    paid = round2(paid + amount)
    return { organization_id: orgId, quote_id: quoteId, amount, payment_type: p.type, payment_method: p.method, payment_date: ymd(p.when), notes: p.notes, received_by: ownerId }
  })
  if (rows.length > 0) check(await admin.from('quote_payments').insert(rows), `pagos ${q.key}`)
  return paid
}

async function insertEvents(admin: Admin, orgId: string, userIds: readonly string[], q: CaseQuote, quoteId: string, client: { id: string; address: string }): Promise<void> {
  const rows = (q.events ?? []).map((e) => ({
    organization_id: orgId, client_id: client.id, quote_id: quoteId, assigned_to: userIds[ROLE_INDEX[e.assignee]], title: e.title,
    event_type: e.type, scheduled_start: wallClock(e.start), scheduled_end: wallClock(e.start, e.hours), address: client.address, status: e.status, notes: e.notes,
  }))
  if (rows.length > 0) check(await admin.from('work_events').insert(rows), `eventos ${q.key}`)
}

/** Inserta las cotizaciones en orden cronológico para que los folios COT-AAAA-NNN sigan la historia. */
export async function insertQuotes(
  admin: Admin, orgId: string, userIds: readonly string[], catalog: SeededCatalog, clients: ClientIds, quotes: readonly CaseQuote[],
): Promise<readonly SavedQuote[]> {
  const ownerId = userIds[0]!
  const saved: SavedQuote[] = []
  const ordered = [...quotes].sort((a, b) => a.created.day - b.created.day || a.created.hour - b.created.hour)
  for (const [i, q] of ordered.entries()) {
    const client = clients.get(q.client)
    if (!client) throw new Error(`cliente desconocido: ${q.client}`)
    const items = priceLines(q.lines, catalog)
    const t = totals(items, q.discountRate ?? 0)
    const createdAt = instant(q.created.day, q.created.hour)
    const at = (day: number | undefined, hour: number): string | null => (day === undefined ? null : instant(day, hour))
    const quote = must(await admin.from('quotes').insert({
      organization_id: orgId, quote_number: `COT-${createdAt.slice(0, 4)}-${String(i + 1).padStart(3, '0')}`, client_id: client.id, status: q.status,
      valid_until: ymd(q.created.day + COMPANY_SETTINGS.quote_valid_days), subtotal: t.subtotal, tax_rate: COMPANY_SETTINGS.tax_rate, tax_amount: t.tax,
      discount_rate: q.discountRate ?? 0, discount_amount: t.discount, total: t.total, created_by: ownerId, created_at: createdAt,
      sent_via: q.sent === undefined ? null : ['whatsapp'], notes: q.notes, terms_and_conditions: COMPANY_SETTINGS.quote_terms,
      sent_at: at(q.sent, q.created.hour + 1), viewed_at: at(q.viewed, 20), accepted_at: at(q.accepted, 13), rejected_at: at(q.rejected, 13),
    }).select('id, quote_number').single(), `cotización ${q.key}`)
    check(await admin.from('quote_items').insert(items.map((it, idx) => ({ ...it, quote_id: quote.id, sort_order: idx }))), `partidas ${q.key}`)
    const paid = await insertPayments(admin, orgId, ownerId, q, quote.id as string, t.total)
    await insertEvents(admin, orgId, userIds, q, quote.id as string, client)
    saved.push({ key: q.key, id: quote.id as string, number: quote.quote_number as string, clientId: client.id, total: t.total, paid, status: q.status, story: q.story })
  }
  return saved
}
