import { roundHalfUp, round4 } from '../math'
import type { BreakdownLine, InputValues, LineKind, PriceList, ProductDefinition, Result } from '../types'

export interface EvalState {
  readonly measures: Readonly<Record<string, number>>
  readonly lines: readonly BreakdownLine[]
  readonly dims?: { readonly width: number; readonly height: number }
}

export interface BlockContext {
  readonly values: InputValues
  readonly lists: readonly PriceList[]
  readonly product: ProductDefinition
}

export type BlockResult = Result<EvalState>

export function makeLine(label: string, kind: LineKind, quantity: number, unit: string, unitPriceCents: number): BreakdownLine {
  const qty = round4(quantity)
  return { label, kind, quantity: qty, unit, unitPriceCents, amountCents: roundHalfUp(qty * unitPriceCents) }
}

export function amountLine(label: string, kind: LineKind, amountCents: number): BreakdownLine {
  return { label, kind, quantity: 1, unit: 'servicio', unitPriceCents: amountCents, amountCents }
}

export function withLine(state: EvalState, line: BreakdownLine): EvalState {
  return { ...state, lines: [...state.lines, line] }
}

export function withMeasure(state: EvalState, name: string, value: number): EvalState {
  return { ...state, measures: { ...state.measures, [name]: round4(value) } }
}

export function sumByKinds(lines: readonly BreakdownLine[], kinds: readonly LineKind[]): number {
  return lines.filter((l) => kinds.includes(l.kind)).reduce((acc, l) => acc + l.amountCents, 0)
}

export function measureOf(state: EvalState, name: string): Result<number> {
  const value = state.measures[name]
  if (value === undefined) return { ok: false, errors: [`Medida "${name}" no disponible`] }
  return { ok: true, value }
}

const UNIT_BY_MEASURE: Readonly<Record<string, string>> = { area_m2: 'm²', perimeter_lm: 'ml', pieces: 'pz' }

export function unitFor(measure: string): string {
  if (UNIT_BY_MEASURE[measure]) return UNIT_BY_MEASURE[measure]
  if (measure.endsWith('_lm')) return 'ml'
  if (measure.endsWith('_m2')) return 'm²'
  if (measure.endsWith('_h')) return 'h'
  return 'u'
}
