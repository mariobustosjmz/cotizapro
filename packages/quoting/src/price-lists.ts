import { fail, ok, toCents } from './math'
import type { InputValues, PriceList, Rate, Result } from './types'

export function findPriceList(lists: readonly PriceList[], id: string): PriceList | undefined {
  return lists.find((list) => list.id === id)
}

export function dimensionValues(list: PriceList, dimension: string): readonly string[] {
  const values = list.rows.map((row) => row.keys[dimension]).filter((v): v is string => typeof v === 'string')
  return [...new Set(values)]
}

function lookupPrice(list: PriceList, rateKeys: Readonly<Record<string, string>>, values: InputValues): Result<number> {
  const wanted = Object.fromEntries(Object.entries(rateKeys).map(([dim, inputKey]) => [dim, String(values[inputKey] ?? '')]))
  const row = list.rows.find((r) => list.dimensions.every((dim) => r.keys[dim] === wanted[dim]))
  if (!row) {
    const detail = Object.entries(wanted).map(([d, v]) => `${d}=${v}`).join(', ')
    return fail(`Sin precio en "${list.name}" para ${detail}`)
  }
  return ok(toCents(row.price))
}

export function resolveRateCents(rate: Rate, values: InputValues, lists: readonly PriceList[]): Result<number> {
  if (rate.kind === 'fixed') return ok(toCents(rate.amount))
  const list = findPriceList(lists, rate.listId)
  if (!list) return fail(`Lista de precios no encontrada: ${rate.listId}`)
  return lookupPrice(list, rate.keys, values)
}
