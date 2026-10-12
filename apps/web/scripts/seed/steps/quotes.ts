import { selectOptions, validateProduct } from '@cotizapro/quoting'
import type { InputField, PriceList } from '@cotizapro/quoting'
import { priceQuoteItems } from '../../../lib/pricing/price-quote-items'
import type { IncomingQuoteItem, PricedQuoteItem } from '../../../lib/pricing/types'
import type { SeededCatalog } from './catalog'
import type { SeededClient } from './clients'
import { type Admin, check, daysFromNow, isoDate, must, type Rand } from '../util'

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'en_instalacion' | 'completado' | 'cobrado'

export interface SeededQuote {
  readonly id: string
  readonly number: string
  readonly status: QuoteStatus
  readonly clientId: string
  readonly total: number
  readonly createdAt: Date
}

const STATUS_CYCLE: readonly QuoteStatus[] = [
  'cobrado', 'sent', 'en_instalacion', 'completado', 'draft', 'accepted', 'cobrado', 'viewed', 'rejected', 'cobrado',
  'sent', 'completado', 'accepted', 'expired', 'cobrado', 'en_instalacion', 'draft', 'cobrado', 'viewed', 'sent',
]

const AGE_DAYS: Readonly<Record<QuoteStatus, readonly [number, number]>> = {
  draft: [0, 4], sent: [1, 12], viewed: [2, 10], accepted: [2, 15], rejected: [10, 60],
  expired: [35, 85], en_instalacion: [3, 20], completado: [12, 50], cobrado: [25, 88],
}

function sampleInput(field: InputField, lists: readonly PriceList[], rand: Rand): number | string | boolean {
  if (field.kind === 'boolean') return rand.chance(0.7)
  if (field.kind === 'select') return rand.pick(selectOptions(field, lists))
  const ranges: Readonly<Record<string, readonly [number, number]>> = { mm: [500, 2000], cm: [90, 280], m: [2, 25], pz: [1, 3], h: [1, 6], ml: [2, 20] }
  const [lo, hi] = ranges[field.unit ?? 'pz'] ?? [1, 3]
  const min = Math.max(lo, field.min ?? lo)
  const max = Math.min(hi, field.max ?? hi)
  const value = rand.int(min, Math.max(min, max))
  return field.unit === 'mm' ? Math.round(value / 10) * 10 : value
}

function buildItems(catalog: SeededCatalog, rand: Rand): readonly IncomingQuoteItem[] {
  const count = rand.int(1, 3)
  return Array.from({ length: count }, () => {
    const svc = rand.pick(catalog.services)
    const def = svc.pricing_blocks ? validateProduct(svc.pricing_blocks, catalog.priceLists) : null
    if (def && def.ok) {
      const input = Object.fromEntries(def.value.inputs.map((f) => [f.key, sampleInput(f, catalog.priceLists, rand)]))
      return { service_id: svc.id, description: svc.name, quantity: 1, unit_price: 1, unit_type: 'fixed' as const, input }
    }
    return { service_id: svc.id, description: svc.name, quantity: rand.int(1, 3), unit_price: svc.unit_price, unit_type: svc.unit_type }
  })
}

function priceUntilValid(catalog: SeededCatalog, rand: Rand): readonly PricedQuoteItem[] {
  const ctx = { products: new Map(catalog.services.map((s) => [s.id, s])), priceLists: catalog.priceLists }
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = priceQuoteItems(buildItems(catalog, rand), ctx)
    if (res.ok) return res.value
  }
  throw new Error('No se pudo generar una cotización válida en 10 intentos')
}

function timeline(status: QuoteStatus, created: Date): Record<string, string | null> {
  const plus = (d: number) => new Date(created.getTime() + d * 86_400_000).toISOString()
  const sentish = status !== 'draft'
  const accepted = ['accepted', 'en_instalacion', 'completado', 'cobrado'].includes(status)
  return {
    sent_at: sentish ? plus(0.2) : null,
    viewed_at: sentish && status !== 'sent' ? plus(1) : null,
    accepted_at: accepted ? plus(2) : null,
    rejected_at: status === 'rejected' ? plus(3) : null,
  }
}

export async function seedQuotes(
  admin: Admin, orgId: string, ownerId: string, catalog: SeededCatalog, clients: readonly SeededClient[], rand: Rand, count: number,
): Promise<readonly SeededQuote[]> {
  const seeded: SeededQuote[] = []
  for (let i = 0; i < count; i++) {
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length]!
    const [minAge, maxAge] = AGE_DAYS[status]
    const created = daysFromNow(-rand.int(minAge, maxAge), rand.int(8, 18))
    const items = priceUntilValid(catalog, rand)
    const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0)
    const discountRate = rand.chance(0.25) ? rand.pick([5, 10]) : 0
    const discount = Math.round(subtotal * discountRate) / 100
    const tax = Math.round((subtotal - discount) * 16) / 100
    const total = Math.round((subtotal - discount + tax) * 100) / 100
    const client = clients[i % clients.length]!
    const quote = must(
      await admin.from('quotes').insert({
        organization_id: orgId, quote_number: `COT-${created.getFullYear()}-${String(i + 1).padStart(3, '0')}`, client_id: client.id, status,
        valid_until: isoDate(new Date(created.getTime() + 30 * 86_400_000)), subtotal, tax_rate: 16, tax_amount: tax,
        discount_rate: discountRate, discount_amount: discount, total, created_by: ownerId, created_at: created.toISOString(),
        sent_via: status === 'draft' ? null : ['whatsapp'], notes: 'Precios incluyen material y mano de obra salvo indicación.',
        terms_and_conditions: 'Anticipo del 50 % para iniciar. Garantía de 6 meses en mano de obra.', ...timeline(status, created),
      }).select('id, quote_number').single(),
      `insert quote ${i}`,
    )
    check(await admin.from('quote_items').insert(items.map((it, idx) => ({ ...it, quote_id: quote.id, sort_order: idx }))), `items ${i}`)
    seeded.push({ id: quote.id as string, number: quote.quote_number as string, status, clientId: client.id, total, createdAt: created })
  }
  return seeded
}

export async function seedPayments(admin: Admin, orgId: string, ownerId: string, quotes: readonly SeededQuote[], rand: Rand): Promise<number> {
  const rows = quotes.flatMap((q) => {
    const day = (offset: number) => isoDate(new Date(q.createdAt.getTime() + offset * 86_400_000))
    const half = Math.round(q.total * 50) / 100
    const base = { organization_id: orgId, quote_id: q.id, received_by: ownerId }
    if (q.status === 'cobrado') {
      return [
        { ...base, amount: half, payment_type: 'anticipo', payment_method: rand.pick(['transferencia', 'efectivo']), payment_date: day(3) },
        { ...base, amount: Math.round((q.total - half) * 100) / 100, payment_type: 'liquidacion', payment_method: 'transferencia', payment_date: day(rand.int(8, 20)) },
      ]
    }
    if (q.status === 'en_instalacion' || q.status === 'completado') {
      return [{ ...base, amount: half, payment_type: 'anticipo', payment_method: 'transferencia', payment_date: day(3) }]
    }
    return []
  })
  if (rows.length > 0) check(await admin.from('quote_payments').insert(rows), 'insert payments')
  return rows.length
}
