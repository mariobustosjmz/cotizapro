import type { Block, Condition, InputField, PriceList, ProductDefinition, Rate } from '@cotizapro/quoting'
import { formatAmount } from './client-preview'

export interface RuleLine {
  readonly key: string
  readonly label: string
  readonly detail: string
}

const MEASURE_LABEL: Readonly<Record<string, string>> = { area_m2: 'm²', perimeter_lm: 'ml', pieces: 'piezas' }

const BLOCK_TYPE_LABEL: Readonly<Record<Block['type'], string>> = {
  area: 'Área',
  perimeter: 'Perímetro',
  measure: 'Medida',
  base_price: 'Precio base',
  surcharge: 'Recargo',
  accessory: 'Accesorio',
  waste: 'Desperdicio',
  labor: 'Mano de obra',
  minimum_charge: 'Cargo mínimo',
}

function measureLabel(key: string): string {
  return MEASURE_LABEL[key] ?? key.replace(/_/g, ' ')
}

function money(pesos: number): string {
  return `$${formatAmount(pesos)}`
}

function rateText(rate: Rate, lists: readonly PriceList[]): string {
  if (rate.kind === 'fixed') return money(rate.amount)
  const list = lists.find((l) => l.id === rate.listId)
  return `precio de la lista "${list?.name ?? 'no encontrada'}"`
}

function inputDetail(field: InputField, lists: readonly PriceList[]): string {
  if (field.kind === 'boolean') return `Sí / No${field.default ? ' (sí por defecto)' : ''}`
  if (field.kind === 'number') {
    const range = field.min !== undefined && field.max !== undefined ? ` de ${field.min} a ${field.max}` : ''
    return `Número${field.unit ? ` en ${field.unit}` : ''}${range}`
  }
  if (field.options) return `Opciones: ${field.options.map((o) => o.label).join(', ')}`
  const list = lists.find((l) => l.id === field.fromPriceList?.listId)
  return `Opciones de la lista "${list?.name ?? 'no encontrada'}"`
}

function blockDetail(block: Block, lists: readonly PriceList[]): string {
  switch (block.type) {
    case 'area':
      return `Ancho × alto en ${block.inputUnit}${block.minPerPiece ? `, mínimo ${block.minPerPiece} m² por pieza` : ''}`
    case 'perimeter':
      return `2 × (ancho + alto) en ${block.inputUnit}`
    case 'measure':
      return `Toma el campo "${block.inputKey}"`
    case 'base_price':
      return `${measureLabel(block.measure)} × ${rateText(block.rate, lists)}`
    case 'accessory':
      return `${rateText(block.rate, lists)} × ${block.quantity.count}${block.quantity.kind === 'per_piece' ? ' por pieza' : ''}`
    case 'waste':
      return `${block.percent} % sobre ${block.appliesTo.map((a) => (a === 'material' ? 'material' : 'procesos')).join(' y ')}`
    case 'minimum_charge':
      return `El renglón no baja de ${money(block.amount)}`
    case 'surcharge':
      if (block.mode === 'percent') return `+${block.percent} %`
      if (block.mode === 'fixed') return `${money(block.amount)}${block.perPiece ? ' por pieza' : ''}`
      return `${measureLabel(block.measure)} × ${rateText(block.rate, lists)}`
    case 'labor':
      if (block.mode === 'percent_materials') return `${block.percent} % de los materiales`
      if (block.mode === 'per_measure') return `${measureLabel(block.measure)} × ${money(block.amount)}`
      return `${money(block.amount)}${block.mode === 'per_piece' ? ' por pieza' : ''}`
  }
}

function conditionText(when: Condition | undefined, inputs: readonly InputField[]): string {
  if (!when) return ''
  const label = inputs.find((i) => i.key === when.inputKey)?.label ?? when.inputKey
  if ('in' in when) return ` (solo si ${label} es ${when.in.join(' o ')})`
  return when.equals === true ? ` (solo si ${label})` : ` (solo si ${label} = ${String(when.equals)})`
}

export function describeInputs(definition: ProductDefinition, lists: readonly PriceList[]): readonly RuleLine[] {
  return definition.inputs.map((field) => ({ key: field.key, label: field.label, detail: inputDetail(field, lists) }))
}

export function describeBlocks(definition: ProductDefinition, lists: readonly PriceList[]): readonly RuleLine[] {
  return definition.blocks.map((block) => ({
    key: block.id,
    label: block.label.startsWith(BLOCK_TYPE_LABEL[block.type]) ? block.label : `${block.label} · ${BLOCK_TYPE_LABEL[block.type]}`,
    detail: blockDetail(block, lists) + conditionText(block.when, definition.inputs),
  }))
}
