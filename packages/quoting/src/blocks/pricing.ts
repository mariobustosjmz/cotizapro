import { ceilCount, ok, roundHalfUp, toCents } from '../math'
import { resolveRateCents } from '../price-lists'
import type { Block } from '../types'
import {
  amountLine,
  type BlockContext,
  type BlockResult,
  type EvalState,
  makeLine,
  measureOf,
  sumByKinds,
  unitFor,
  withLine,
} from './state'

type BasePriceBlock = Extract<Block, { type: 'base_price' }>
type SurchargeBlock = Extract<Block, { type: 'surcharge' }>
type AccessoryBlock = Extract<Block, { type: 'accessory' }>

export function applyBasePrice(block: BasePriceBlock, state: EvalState, ctx: BlockContext): BlockResult {
  const qty = measureOf(state, block.measure)
  if (!qty.ok) return qty
  const rate = resolveRateCents(block.rate, ctx.values, ctx.lists)
  if (!rate.ok) return rate
  return ok(withLine(state, makeLine(block.label, 'material', qty.value, unitFor(block.measure), rate.value)))
}

export function applySurcharge(block: SurchargeBlock, state: EvalState, ctx: BlockContext): BlockResult {
  if (block.mode === 'percent') {
    const base = sumByKinds(state.lines, ['material'])
    return ok(withLine(state, amountLine(block.label, 'process', roundHalfUp((base * block.percent) / 100))))
  }
  if (block.mode === 'fixed') {
    const qty = block.perPiece ? state.measures.pieces! : 1
    return ok(withLine(state, makeLine(block.label, 'process', qty, block.perPiece ? 'pz' : 'servicio', toCents(block.amount))))
  }
  const qty = measureOf(state, block.measure)
  if (!qty.ok) return qty
  const rate = resolveRateCents(block.rate, ctx.values, ctx.lists)
  if (!rate.ok) return rate
  return ok(withLine(state, makeLine(block.label, 'process', qty.value, unitFor(block.measure), rate.value)))
}

function accessoryCount(block: AccessoryBlock, state: EvalState): number | string {
  const q = block.quantity
  if (q.kind === 'fixed') return q.count
  if (q.kind === 'per_piece') return q.count * state.measures.pieces!
  const measure = state.measures[q.measure]
  if (measure === undefined) return `Medida "${q.measure}" no disponible`
  return ceilCount(measure, q.every) * q.count
}

export function applyAccessory(block: AccessoryBlock, state: EvalState, ctx: BlockContext): BlockResult {
  const count = accessoryCount(block, state)
  if (typeof count === 'string') return { ok: false, errors: [count] }
  const rate = resolveRateCents(block.rate, ctx.values, ctx.lists)
  if (!rate.ok) return rate
  return ok(withLine(state, makeLine(block.label, 'accessory', count, 'pz', rate.value)))
}
