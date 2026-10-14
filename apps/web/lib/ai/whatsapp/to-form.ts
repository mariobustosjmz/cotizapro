import { selectOptions, validateProduct, type Block, type PriceList, type ProductDefinition } from '@cotizapro/quoting'
import { defaultInputs, previewItem, type ItemInput } from '@/lib/pricing/client-preview'
import { patchFromPreview } from '@/lib/pricing/configurable-item'
import type { QuoteFormItem, QuoteUnitType } from '@/types/quote-form'
import type { DraftResult, DraftResultItem } from './draft-result'
import { normalizeForMatch } from './normalize'

export interface CatalogService {
  readonly id: string
  readonly name: string
  readonly unit_price: number | string
  readonly unit_type: string
  readonly pricing_blocks?: unknown
}

type AreaBlock = Extract<Block, { type: 'area' }>
type SelectField = Extract<ProductDefinition['inputs'][number], { kind: 'select' }>

const UNIT_TYPES: readonly QuoteUnitType[] = ['fixed', 'per_hour', 'per_sqm', 'per_unit', 'per_lm']
const FROM_METERS = { m: 1, cm: 100, mm: 1000 } as const
const MAX_DESCRIPTION = 300
const MAX_QUANTITY = 500
const MEASURES_NOTE = 'Revisar: faltan medidas (cantidad en piezas, el precio es por m²)'
const UNIT_SUFFIX = '(mm|cm)'

function clampQuantity(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.min(value, MAX_QUANTITY) : 1
}

function isUnitType(value: string): value is QuoteUnitType {
  return (UNIT_TYPES as readonly string[]).includes(value)
}

const round2 = (value: number): number => Math.round(value * 100) / 100

function measureText(item: DraftResultItem): string | null {
  return item.widthM !== null && item.heightM !== null ? `${item.widthM.toFixed(2)} × ${item.heightM.toFixed(2)} m` : null
}

const joinParts = (parts: readonly (string | null)[]): string =>
  parts.filter((p): p is string => Boolean(p)).join(' · ').slice(0, MAX_DESCRIPTION)

/** Metros a la unidad del bloque; el redondeo evita 0.9 m → 899.9999 mm. */
export function metersToUnit(meters: number, unit: keyof typeof FROM_METERS): number {
  return Math.round(meters * FROM_METERS[unit] * 1000) / 1000
}

function dimensionInputs(definition: ProductDefinition, item: DraftResultItem): ItemInput {
  const area = definition.blocks.find((block): block is AreaBlock => block.type === 'area')
  if (!area) return {}
  const width: [string, number][] = item.widthM !== null ? [[area.widthKey, metersToUnit(item.widthM, area.inputUnit)]] : []
  const height: [string, number][] = item.heightM !== null ? [[area.heightKey, metersToUnit(item.heightM, area.inputUnit)]] : []
  return Object.fromEntries([...width, ...height])
}

/** Opción completa en el texto, o la primera opción cuya primera palabra aparece ("corredizo" → "corredizo-aluminio"). */
function pickOption(options: readonly string[], text: string): string | null {
  const padded = ` ${text} `
  const matches = (option: string): boolean => {
    const normalized = normalizeForMatch(option)
    if (/^[0-9]+$/.test(normalized)) return new RegExp(` ${normalized} ${UNIT_SUFFIX} `).test(padded)
    return padded.includes(` ${normalized} `)
  }
  const full = options.find(matches)
  if (full) return full
  const words = new Set(text.split(' '))
  return options.find((option) => {
    const first = normalizeForMatch(option).split(' ')[0] ?? ''
    return !/^[0-9]+$/.test(first) && words.has(first)
  }) ?? null
}

function selectInputs(definition: ProductDefinition, priceLists: readonly PriceList[], text: string): ItemInput {
  const normalized = normalizeForMatch(text)
  const entries = definition.inputs
    .filter((field): field is SelectField => field.kind === 'select')
    .flatMap((field): [string, string][] => {
      const option = pickOption(selectOptions(field, priceLists), normalized)
      return option ? [[field.key, option]] : []
    })
  return Object.fromEntries(entries)
}

function configurableItem(item: DraftResultItem, service: CatalogService, priceLists: readonly PriceList[]): QuoteFormItem | null {
  const parsed = validateProduct(service.pricing_blocks, priceLists)
  if (!parsed.ok) return null
  const definition = parsed.value
  const input: ItemInput = {
    ...defaultInputs(definition, priceLists),
    ...dimensionInputs(definition, item),
    ...(definition.quantityKey ? { [definition.quantityKey]: clampQuantity(item.quantity) } : {}),
    ...selectInputs(definition, priceLists, `${item.concept} ${item.notes ?? ''}`),
  }
  const preview = previewItem(service.name, service.pricing_blocks, priceLists, input)
  const patch = patchFromPreview(service.name, input, preview)
  const base: QuoteFormItem = { ...patch, service_id: service.id, needs_catalog: false }
  return preview.result ? base : { ...base, needs_review: true, review_reason: 'Faltan datos del producto para calcular el precio' }
}

function simpleItem(item: DraftResultItem, service: CatalogService, invalidDefinition: boolean): QuoteFormItem {
  const unitType = isUnitType(service.unit_type) ? service.unit_type : 'per_unit'
  const quantity = clampQuantity(item.quantity)
  const measured = item.widthM !== null && item.heightM !== null
  const missingMeasures = unitType === 'per_sqm' && !measured
  const area = unitType === 'per_sqm' && measured ? round2((item.widthM ?? 0) * (item.heightM ?? 0) * quantity) : null
  const price = Number(service.unit_price)
  const reasons = [
    missingMeasures ? MEASURES_NOTE : null,
    invalidDefinition ? 'La configuración del producto no es válida; se usó el precio simple' : null,
    Number.isFinite(price) ? null : 'El precio del catálogo no es válido',
  ].filter((r): r is string => r !== null)
  const base: QuoteFormItem = {
    description: joinParts([service.name, measureText(item), missingMeasures ? item.notes : null, missingMeasures ? MEASURES_NOTE : null]),
    quantity: area ?? quantity,
    unit_price: Number.isFinite(price) ? price : 0,
    unit_type: unitType,
    service_id: service.id,
    input: null,
    needs_catalog: false,
  }
  return reasons.length > 0 ? { ...base, needs_review: true, review_reason: reasons.join('. ') } : base
}

function unmatchedItem(item: DraftResultItem): QuoteFormItem {
  return {
    description: joinParts([item.concept, measureText(item), item.notes]),
    quantity: clampQuantity(item.quantity),
    unit_price: 0,
    unit_type: 'per_unit',
    service_id: null,
    input: null,
    needs_catalog: true,
  }
}

/** El precio sale siempre del catálogo o del motor; ningún campo del modelo llega a `unit_price`. */
export function draftItemToFormItem(item: DraftResultItem, services: readonly CatalogService[], priceLists: readonly PriceList[]): QuoteFormItem {
  const service = item.serviceId ? services.find((s) => s.id === item.serviceId) : undefined
  if (!service) return unmatchedItem(item)
  const configured = service.pricing_blocks ? configurableItem(item, service, priceLists) : null
  return configured ?? simpleItem(item, service, Boolean(service.pricing_blocks))
}

export function draftNotes(result: DraftResult): string | null {
  const lines = [result.zone ? `Zona: ${result.zone}` : null, result.notes].filter((line): line is string => Boolean(line))
  return lines.length > 0 ? lines.join('\n') : null
}

export function draftToFormPatch(
  result: DraftResult,
  services: readonly CatalogService[],
  priceLists: readonly PriceList[],
): { readonly items: readonly QuoteFormItem[]; readonly notes: string | null } {
  return { items: result.items.map((item) => draftItemToFormItem(item, services, priceLists)), notes: draftNotes(result) }
}

const isBlank = (item: QuoteFormItem): boolean => !item.description.trim() && !item.service_id

export function mergeDraftItems(current: readonly QuoteFormItem[], incoming: readonly QuoteFormItem[]): readonly QuoteFormItem[] {
  if (incoming.length === 0) return current
  return [...current.filter((item) => !isBlank(item)), ...incoming]
}

export function mergeNotes(current: string, incoming: string | null): string {
  if (!incoming) return current
  return current.trim() ? `${current}\n${incoming}` : incoming
}

/** Partida del borrador sin coincidencia en el catálogo a la que todavía nadie le puso precio. */
export function isUnpricedItem(item: QuoteFormItem): boolean {
  return item.needs_catalog === true && item.unit_price <= 0
}

/** Único criterio de "requiere atención": sin precio del catálogo o marcada para revisión. */
export function needsAttention(item: QuoteFormItem): boolean {
  return isUnpricedItem(item) || item.needs_review === true
}

export function firstItemNeedingAttention(items: readonly QuoteFormItem[]): number {
  return items.findIndex(needsAttention)
}
