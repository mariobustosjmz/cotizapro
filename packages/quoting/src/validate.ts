import { BLOCK_PHASE } from './blocks'
import { findPriceList } from './price-lists'
import { productDefinitionSchema } from './schema'
import type { Block, InputField, PriceList, ProductDefinition, Rate, Result } from './types'

function duplicates(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((v, i) => values.indexOf(v) !== i))]
}

function checkRate(rate: Rate, label: string, inputKeys: ReadonlySet<string>, lists: readonly PriceList[]): string[] {
  if (rate.kind === 'fixed') return []
  const list = findPriceList(lists, rate.listId)
  if (!list) return [`${label}: lista de precios desconocida (${rate.listId})`]
  const missingDims = list.dimensions.filter((d) => !(d in rate.keys)).map((d) => `${label}: falta dimensión "${d}" de "${list.name}"`)
  const badInputs = Object.values(rate.keys).filter((k) => !inputKeys.has(k)).map((k) => `${label}: input "${k}" no existe`)
  return [...missingDims, ...badInputs]
}

function blockInputRefs(block: Block): readonly string[] {
  const own = block.type === 'area' || block.type === 'perimeter' ? [block.widthKey, block.heightKey] : block.type === 'measure' ? [block.inputKey] : []
  return block.when ? [...own, block.when.inputKey] : own
}

function blockRates(block: Block): readonly Rate[] {
  if (block.type === 'base_price' || block.type === 'accessory') return [block.rate]
  if (block.type === 'surcharge' && block.mode === 'per_measure') return [block.rate]
  return []
}

function measureUsed(block: Block): string | undefined {
  if (block.type === 'base_price') return block.measure
  if (block.type === 'surcharge' && block.mode === 'per_measure') return block.measure
  if (block.type === 'labor' && block.mode === 'per_measure') return block.measure
  if (block.type === 'accessory' && block.quantity.kind === 'per_measure') return block.quantity.measure
  return undefined
}

function measureProduced(block: Block): string | undefined {
  if (block.type === 'area') return block.as ?? 'area_m2'
  if (block.type === 'perimeter') return block.as ?? 'perimeter_lm'
  if (block.type === 'measure') return block.as
  return undefined
}

function checkBlocks(product: ProductDefinition, lists: readonly PriceList[]): string[] {
  const inputKeys = new Set(product.inputs.map((i) => i.key))
  const errors: string[] = []
  let available = new Set(['pieces'])
  let lastPhase = -1
  for (const block of product.blocks) {
    const phase = BLOCK_PHASE[block.type]
    if (phase < lastPhase) errors.push(`${block.label}: orden de bloques inválido (fase ${block.type} después de una fase posterior)`)
    lastPhase = Math.max(lastPhase, phase)
    errors.push(...blockInputRefs(block).filter((k) => !inputKeys.has(k)).map((k) => `${block.label}: input "${k}" no existe`))
    errors.push(...blockRates(block).flatMap((r) => checkRate(r, block.label, inputKeys, lists)))
    const used = measureUsed(block)
    if (used && !available.has(used)) errors.push(`${block.label}: medida "${used}" no se calcula antes`)
    const produced = measureProduced(block)
    if (produced) available = new Set([...available, produced])
  }
  return errors
}

function checkInput(field: InputField, lists: readonly PriceList[]): string[] {
  if (field.kind !== 'select') return []
  const hasOptions = Boolean(field.options)
  const source = field.fromPriceList
  if (hasOptions === Boolean(source)) return [`${field.label}: define opciones fijas o una lista de precios, no ambas`]
  if (!source) return []
  const list = findPriceList(lists, source.listId)
  if (!list) return [`${field.label}: lista de precios desconocida (${source.listId})`]
  return list.dimensions.includes(source.dimension) ? [] : [`${field.label}: "${list.name}" no tiene la dimensión "${source.dimension}"`]
}

function checkStructure(product: ProductDefinition, lists: readonly PriceList[]): string[] {
  const keys = product.inputs.map((i) => i.key)
  const ids = product.blocks.map((b) => b.id)
  const quantityField = product.quantityKey ? product.inputs.find((i) => i.key === product.quantityKey) : undefined
  return [
    ...duplicates(keys).map((k) => `Input duplicado: ${k}`),
    ...duplicates(ids).map((id) => `Bloque duplicado: ${id}`),
    ...(product.quantityKey && quantityField?.kind !== 'number' ? [`quantityKey "${product.quantityKey}" debe ser un input numérico`] : []),
    ...product.inputs.flatMap((field) => checkInput(field, lists)),
  ]
}

export function validateProduct(raw: unknown, lists: readonly PriceList[]): Result<ProductDefinition> {
  const parsed = productDefinitionSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'producto'}: ${i.message}`) }
  }
  const product = parsed.data
  const errors = [...checkStructure(product, lists), ...checkBlocks(product, lists)]
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: product }
}
