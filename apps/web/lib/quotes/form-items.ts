import { firstItemNeedingAttention, isUnpricedItem, needsAttention } from '@/lib/ai/whatsapp/to-form'
import type { ItemInput } from '@/lib/pricing/client-preview'
import type { CustomFieldValues } from '@/types/custom-fields'
import type { QuoteFormItem, QuoteUnitType } from '@/types/quote-form'

/** Lo único que viaja a POST /api/quotes por partida (quoteItemSchema); las marcas del navegador se quedan aquí. */
export interface QuoteItemPayload {
  readonly description: string
  readonly quantity: number
  readonly unit_price: number
  readonly unit_type: QuoteUnitType
  readonly service_id: string | null
  readonly input: ItemInput | null
}

export interface QuotePayload {
  readonly client_id: string
  readonly items: readonly QuoteItemPayload[]
  readonly notes: string | null
  readonly terms_and_conditions: string | null
  readonly valid_until: string
  readonly discount_rate: number
  readonly custom_fields: CustomFieldValues
}

export interface QuotePayloadInput {
  readonly clientId: string
  readonly items: readonly QuoteFormItem[]
  readonly notes: string
  readonly terms: string
  readonly validDays: number
  readonly discountRate: number
  readonly customFields: CustomFieldValues
  readonly now?: Date
}

export type EditableItemField = 'description' | 'quantity' | 'unit_price' | 'unit_type' | 'service_id' | 'input'
type EditableValue<F extends EditableItemField> = QuoteFormItem[F]

export interface ItemAttention {
  readonly kind: 'catalog' | 'review'
  readonly text: string
}

export interface ItemProblem {
  readonly index: number
  readonly message: string
}

/** Editar cantidad, unidad, servicio, precio o medidas cuenta como revisada; la descripción no. */
const REVIEW_FIELDS: ReadonlySet<EditableItemField> = new Set(['quantity', 'unit_price', 'unit_type', 'service_id', 'input'])
const REVIEW_PREFIX = /^Revisar:\s*/
const DEFAULT_REVIEW_DETAIL = 'confirma cantidad, precio y medidas'
const DAY_MS = 86400000

export function toQuoteItemPayload(item: QuoteFormItem): QuoteItemPayload {
  return {
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    unit_type: item.unit_type,
    service_id: item.service_id ? item.service_id : null,
    input: item.input ?? null,
  }
}

const hasContent = (item: QuoteFormItem): boolean => Boolean(item.description) && item.quantity > 0

export function buildQuotePayload(input: QuotePayloadInput): QuotePayload {
  const now = (input.now ?? new Date()).getTime()
  return {
    client_id: input.clientId,
    items: input.items.filter(hasContent).map(toQuoteItemPayload),
    notes: input.notes || null,
    terms_and_conditions: input.terms || null,
    valid_until: new Date(now + input.validDays * DAY_MS).toISOString(),
    discount_rate: input.discountRate,
    custom_fields: input.customFields,
  }
}

export function clearItemReview(item: QuoteFormItem): QuoteFormItem {
  const { review_reason: reason, ...rest } = item
  return reason === undefined && item.needs_review === undefined ? item : { ...rest, needs_review: false }
}

export function editQuoteItem<F extends EditableItemField>(item: QuoteFormItem, field: F, value: EditableValue<F>): QuoteFormItem {
  const updated: QuoteFormItem = { ...item, [field]: value }
  // "Libre" (servicio vacío) deja de ser configurable: sin esto el servidor recalcularía con entradas huérfanas.
  const edited = field === 'service_id' && !value ? { ...updated, input: null } : updated
  return REVIEW_FIELDS.has(field) ? clearItemReview(edited) : edited
}

function reviewDetail(item: QuoteFormItem): string {
  const detail = (item.review_reason ?? '').replace(REVIEW_PREFIX, '').trim()
  return detail || DEFAULT_REVIEW_DETAIL
}

export function itemAttention(item: QuoteFormItem): ItemAttention | null {
  if (!needsAttention(item)) return null
  return isUnpricedItem(item) ? { kind: 'catalog', text: 'Sin precio: elige del catálogo' } : { kind: 'review', text: `Revisar: ${reviewDetail(item)}` }
}

function problemMessage(item: QuoteFormItem, position: number): string {
  if (isUnpricedItem(item)) return `La partida ${position} no tiene precio: elígela del catálogo`
  if (item.input && item.unit_price <= 0) return `Completa las medidas y opciones de la partida ${position}`
  return `Revisa la partida ${position}: ${reviewDetail(item)}`
}

/** Primera partida (en orden) que impide guardar: sin precio, configurable incompleta o marcada para revisión. */
export function firstItemProblem(items: readonly QuoteFormItem[]): ItemProblem | null {
  const incomplete = items.findIndex((item) => Boolean(item.input) && item.unit_price <= 0)
  const attention = firstItemNeedingAttention(items)
  const found = [incomplete, attention].filter((index) => index >= 0)
  if (found.length === 0) return null
  const index = Math.min(...found)
  const item = items[index]
  return item ? { index, message: problemMessage(item, index + 1) } : null
}
