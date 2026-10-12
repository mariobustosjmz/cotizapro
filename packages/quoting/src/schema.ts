import { z } from 'zod'

const key = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, 'Clave inválida: minúsculas, números y guion bajo')
const label = z.string().trim().min(1).max(80)
const money = z.number().finite().min(0).max(10_000_000)
const percent = z.number().finite().min(0).max(1000)
const lengthUnit = z.enum(['mm', 'cm', 'm'])

export const priceListRowSchema = z.object({
  keys: z.record(z.string(), z.string()),
  price: money,
})

export const priceListSchema = z.object({
  id: z.string().min(1),
  name: label,
  unit: z.enum(['sqm', 'lm', 'unit', 'hour', 'fixed']),
  dimensions: z.array(key).min(1).max(4).readonly(),
  rows: z.array(priceListRowSchema).max(2000).readonly(),
})

const numberInput = z.object({
  kind: z.literal('number'),
  key,
  label,
  unit: z.enum(['mm', 'cm', 'm', 'pz', 'h', 'ml']).optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  default: z.number().finite().optional(),
})

const selectInput = z.object({
  kind: z.literal('select'),
  key,
  label,
  options: z.array(z.object({ value: z.string().min(1), label })).min(1).max(100).readonly().optional(),
  fromPriceList: z.object({ listId: z.string().min(1), dimension: key }).optional(),
})

const booleanInput = z.object({
  kind: z.literal('boolean'),
  key,
  label,
  default: z.boolean().optional(),
})

export const inputFieldSchema = z.discriminatedUnion('kind', [numberInput, selectInput, booleanInput])

const conditionValue = z.union([z.string(), z.number(), z.boolean()])
export const conditionSchema = z.union([
  z.object({ inputKey: key, equals: conditionValue }),
  z.object({ inputKey: key, in: z.array(conditionValue).min(1).readonly() }),
])

export const rateSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fixed'), amount: money }),
  z.object({ kind: z.literal('price_list'), listId: z.string().min(1), keys: z.record(z.string(), key) }),
])

const blockBase = { id: z.string().min(1).max(40), label, when: conditionSchema.optional() }

const areaBlock = z.object({
  ...blockBase,
  type: z.literal('area'),
  widthKey: key,
  heightKey: key,
  inputUnit: lengthUnit,
  roundTo: z.number().positive().max(1).optional(),
  minPerPiece: z.number().min(0).max(100).optional(),
  as: key.optional(),
})

const perimeterBlock = z.object({
  ...blockBase,
  type: z.literal('perimeter'),
  widthKey: key,
  heightKey: key,
  inputUnit: lengthUnit,
  roundTo: z.number().positive().max(1).optional(),
  as: key.optional(),
})

const measureBlock = z.object({
  ...blockBase,
  type: z.literal('measure'),
  inputKey: key,
  as: key,
  perPiece: z.boolean().optional(),
})

const basePriceBlock = z.object({
  ...blockBase,
  type: z.literal('base_price'),
  measure: key,
  rate: rateSchema,
})

const surchargeBlock = z.discriminatedUnion('mode', [
  z.object({ ...blockBase, type: z.literal('surcharge'), mode: z.literal('percent'), percent }),
  z.object({ ...blockBase, type: z.literal('surcharge'), mode: z.literal('fixed'), amount: money, perPiece: z.boolean().optional() }),
  z.object({ ...blockBase, type: z.literal('surcharge'), mode: z.literal('per_measure'), measure: key, rate: rateSchema }),
])

const accessoryQuantity = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('per_piece'), count: z.number().positive().max(1000) }),
  z.object({ kind: z.literal('fixed'), count: z.number().positive().max(100_000) }),
  z.object({ kind: z.literal('per_measure'), measure: key, every: z.number().positive(), count: z.number().positive().max(1000) }),
])

const accessoryBlock = z.object({
  ...blockBase,
  type: z.literal('accessory'),
  rate: rateSchema,
  quantity: accessoryQuantity,
})

const wasteBlock = z.object({
  ...blockBase,
  type: z.literal('waste'),
  percent,
  appliesTo: z.array(z.enum(['material', 'process'])).min(1).readonly(),
})

const laborBlock = z.discriminatedUnion('mode', [
  z.object({ ...blockBase, type: z.literal('labor'), mode: z.literal('fixed'), amount: money }),
  z.object({ ...blockBase, type: z.literal('labor'), mode: z.literal('per_piece'), amount: money }),
  z.object({ ...blockBase, type: z.literal('labor'), mode: z.literal('per_measure'), measure: key, amount: money }),
  z.object({ ...blockBase, type: z.literal('labor'), mode: z.literal('percent_materials'), percent }),
])

const minimumChargeBlock = z.object({
  ...blockBase,
  type: z.literal('minimum_charge'),
  amount: money,
})

export const blockSchema = z.union([
  areaBlock,
  perimeterBlock,
  measureBlock,
  basePriceBlock,
  surchargeBlock,
  accessoryBlock,
  wasteBlock,
  laborBlock,
  minimumChargeBlock,
])

export const productDefinitionSchema = z.object({
  version: z.literal(1),
  unit: z.enum(['sqm', 'lm', 'unit', 'hour', 'fixed']),
  quantityKey: key.optional(),
  inputs: z.array(inputFieldSchema).max(20).readonly(),
  blocks: z.array(blockSchema).min(1).max(30).readonly(),
})
