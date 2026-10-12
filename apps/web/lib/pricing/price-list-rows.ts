import type { PriceListRow } from '@cotizapro/quoting'

export interface EditableRow {
  readonly uid: string
  readonly keys: Readonly<Record<string, string>>
  readonly price: string
}

export type RowsPayloadResult =
  | { readonly ok: true; readonly rows: readonly PriceListRow[] }
  | { readonly ok: false; readonly errors: Readonly<Record<string, string>> }

const MAX_PRICE = 10_000_000

function newUid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function toEditableRows(rows: readonly PriceListRow[]): readonly EditableRow[] {
  return rows.map((row) => ({ uid: newUid(), keys: { ...row.keys }, price: row.price.toFixed(2) }))
}

export function emptyRow(dimensions: readonly string[]): EditableRow {
  return { uid: newUid(), keys: Object.fromEntries(dimensions.map((d) => [d, ''])), price: '' }
}

/** Precio en pesos con 2 decimales; acepta separador de miles con coma. Null si no es válido. */
export function parsePrice(text: string): number | null {
  const normalized = text.replace(/,/g, '').trim()
  if (normalized === '' || !/^\d+(\.\d+)?$/.test(normalized)) return null
  const value = Math.round(Number(normalized) * 100) / 100
  return value <= MAX_PRICE ? value : null
}

function rowError(row: EditableRow, dimensions: readonly string[], seen: ReadonlySet<string>): string | null {
  const missing = dimensions.filter((d) => !(row.keys[d] ?? '').trim())
  if (missing.length > 0) return `Falta: ${missing.join(', ')}`
  if (parsePrice(row.price) === null) return 'Precio inválido'
  if (seen.has(comboKey(row, dimensions))) return 'Combinación repetida'
  return null
}

function comboKey(row: EditableRow, dimensions: readonly string[]): string {
  return dimensions.map((d) => (row.keys[d] ?? '').trim()).join('|')
}

export function rowsToPayload(rows: readonly EditableRow[], dimensions: readonly string[]): RowsPayloadResult {
  const { errors } = rows.reduce<{ seen: ReadonlySet<string>; errors: Readonly<Record<string, string>> }>(
    (acc, row) => {
      const error = rowError(row, dimensions, acc.seen)
      return {
        seen: new Set([...acc.seen, comboKey(row, dimensions)]),
        errors: error ? { ...acc.errors, [row.uid]: error } : acc.errors,
      }
    },
    { seen: new Set<string>(), errors: {} },
  )
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  const payload = rows.map((row) => ({
    keys: Object.fromEntries(dimensions.map((d) => [d, (row.keys[d] ?? '').trim()])),
    price: parsePrice(row.price) ?? 0,
  }))
  return { ok: true, rows: payload }
}

export function sameRows(a: readonly EditableRow[], b: readonly EditableRow[]): boolean {
  if (a.length !== b.length) return false
  return a.every((row, i) => row.price === b[i].price && JSON.stringify(row.keys) === JSON.stringify(b[i].keys))
}
