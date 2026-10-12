import type { z } from 'zod'
import type {
  blockSchema,
  conditionSchema,
  inputFieldSchema,
  priceListRowSchema,
  priceListSchema,
  productDefinitionSchema,
  rateSchema,
} from './schema'

export type PriceListRow = z.infer<typeof priceListRowSchema>
export type PriceList = z.infer<typeof priceListSchema>
export type InputField = z.infer<typeof inputFieldSchema>
export type Condition = z.infer<typeof conditionSchema>
export type Rate = z.infer<typeof rateSchema>
export type Block = z.infer<typeof blockSchema>
export type ProductDefinition = z.infer<typeof productDefinitionSchema>
export type ProductUnit = ProductDefinition['unit']
export type BlockType = Block['type']

export type InputValue = number | string | boolean
export type InputValues = Readonly<Record<string, InputValue>>

export type LineKind = 'material' | 'process' | 'accessory' | 'labor' | 'adjustment'

export interface BreakdownLine {
  readonly label: string
  readonly kind: LineKind
  readonly quantity: number
  readonly unit: string
  readonly unitPriceCents: number
  readonly amountCents: number
}

export interface Measures {
  readonly pieces: number
  readonly [name: string]: number
}

export interface QuoteLineResult {
  readonly measures: Measures
  readonly lines: readonly BreakdownLine[]
  readonly subtotalCents: number
  readonly description: string
  readonly input: InputValues
  readonly engineVersion: string
}

export interface EvaluationContext {
  readonly name: string
  readonly priceLists: readonly PriceList[]
}

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly errors: readonly string[] }
