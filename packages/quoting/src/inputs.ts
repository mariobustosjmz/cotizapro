import { fail, ok } from './math'
import { dimensionValues, findPriceList } from './price-lists'
import type { InputField, InputValue, InputValues, PriceList, ProductDefinition, Result } from './types'

type NumberField = Extract<InputField, { kind: 'number' }>
type SelectField = Extract<InputField, { kind: 'select' }>

function resolveNumber(field: NumberField, raw: unknown): Result<number> {
  const value = raw === undefined || raw === null || raw === '' ? field.default : Number(raw)
  if (value === undefined || !Number.isFinite(value)) return fail(`${field.label} es requerido`)
  if (field.min !== undefined && value < field.min) return fail(`${field.label} debe ser al menos ${field.min}`)
  if (field.max !== undefined && value > field.max) return fail(`${field.label} no puede exceder ${field.max}`)
  return ok(value)
}

export function selectOptions(field: SelectField, lists: readonly PriceList[]): readonly string[] {
  if (field.options) return field.options.map((o) => o.value)
  if (!field.fromPriceList) return []
  const list = findPriceList(lists, field.fromPriceList.listId)
  return list ? dimensionValues(list, field.fromPriceList.dimension) : []
}

function resolveSelect(field: SelectField, raw: unknown, lists: readonly PriceList[]): Result<string> {
  const value = raw === undefined || raw === null ? '' : String(raw)
  if (!value) return fail(`${field.label} es requerido`)
  if (!selectOptions(field, lists).includes(value)) return fail(`${field.label}: opción no válida "${value}"`)
  return ok(value)
}

function resolveBoolean(raw: unknown, fallback: boolean | undefined): boolean {
  if (typeof raw === 'boolean') return raw
  if (raw === 'true') return true
  if (raw === 'false') return false
  return fallback ?? false
}

function resolveField(field: InputField, raw: unknown, lists: readonly PriceList[]): Result<InputValue> {
  if (field.kind === 'number') return resolveNumber(field, raw)
  if (field.kind === 'select') return resolveSelect(field, raw, lists)
  return ok(resolveBoolean(raw, field.default))
}

export function resolveInputs(
  product: ProductDefinition,
  raw: Readonly<Record<string, unknown>>,
  lists: readonly PriceList[],
): Result<InputValues> {
  const results = product.inputs.map((field) => [field.key, resolveField(field, raw[field.key], lists)] as const)
  const errors = results.flatMap(([, r]) => (r.ok ? [] : r.errors))
  if (errors.length > 0) return { ok: false, errors }
  const values = Object.fromEntries(results.map(([k, r]) => [k, r.ok ? r.value : '']))
  return ok(values)
}
