import { normalizeForMatch } from '../whatsapp/normalize'
import type { DraftExtraction, DraftItem } from '../whatsapp/types'

export const EVAL_TARGET = 0.9
/** Un centímetro; el margen extra absorbe el error de coma flotante (0.91 - 0.9). */
const MEASURE_TOLERANCE_M = 0.011

export interface EvalExpectedItem {
  readonly concept: string
  readonly quantity: number
  readonly widthM: number | null
  readonly heightM: number | null
}

export interface EvalExpectation {
  readonly zone: string | null
  readonly clientName: string | null
  readonly phone: string | null
  readonly items: readonly EvalExpectedItem[]
}

export interface EvalCase {
  readonly id: string
  readonly message: string
  readonly expected: EvalExpectation
}

export interface CaseScore {
  readonly id: string
  readonly zone: boolean
  readonly client: boolean
  readonly items: boolean
  readonly measures: boolean
  readonly noPrice: boolean
  readonly score: number
}

export interface EvalSummary {
  readonly cases: number
  readonly average: number
  readonly zoneRate: number
  readonly passed: boolean
}

const same = (a: string | null, b: string | null): boolean => (a === null || b === null ? a === b : normalizeForMatch(a) === normalizeForMatch(b))
const near = (a: number | null, b: number | null): boolean => (a === null || b === null ? a === b : Math.abs(a - b) <= MEASURE_TOLERANCE_M)

function findItem(expected: EvalExpectedItem, actual: readonly DraftItem[]): DraftItem | undefined {
  const concept = normalizeForMatch(expected.concept)
  return actual.find((item) => normalizeForMatch(item.concept).includes(concept))
}

function zoneMatches(expected: string | null, actual: string | null): boolean {
  if (expected === null || actual === null) return expected === actual
  return normalizeForMatch(actual).includes(normalizeForMatch(expected))
}

export function scoreCase(id: string, expected: EvalExpectation, actual: DraftExtraction, rawJson: string): CaseScore {
  const matched = expected.items.map((item) => ({ item, found: findItem(item, actual.items) }))
  const checks = {
    zone: zoneMatches(expected.zone, actual.client.zone),
    client: same(expected.clientName, actual.client.name) && expected.phone === actual.client.phone,
    items: actual.items.length === expected.items.length && matched.every((m) => m.found?.quantity === m.item.quantity),
    measures: matched.every((m) => m.found !== undefined && near(m.item.widthM, m.found.widthM) && near(m.item.heightM, m.found.heightM)),
    noPrice: !/precio|price|\$\s*\d/i.test(rawJson),
  }
  const passed = Object.values(checks).filter(Boolean).length
  return { id, ...checks, score: Math.round((passed / 5) * 100) / 100 }
}

export function summarize(scores: readonly CaseScore[]): EvalSummary {
  const cases = scores.length
  const total = scores.reduce((sum, s) => sum + s.score, 0)
  const average = cases === 0 ? 0 : Math.round((total / cases) * 100) / 100
  const zoneRate = cases === 0 ? 0 : Math.round((scores.filter((s) => s.zone).length / cases) * 100) / 100
  return { cases, average, zoneRate, passed: cases > 0 && average >= EVAL_TARGET }
}
