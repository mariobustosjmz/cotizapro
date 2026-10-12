import { ok, roundHalfUp, toCents } from '../math'
import type { Block } from '../types'
import { amountLine, type BlockResult, type EvalState, makeLine, measureOf, sumByKinds, unitFor, withLine } from './state'

type WasteBlock = Extract<Block, { type: 'waste' }>
type LaborBlock = Extract<Block, { type: 'labor' }>
type MinimumChargeBlock = Extract<Block, { type: 'minimum_charge' }>

export function applyWaste(block: WasteBlock, state: EvalState): BlockResult {
  const base = sumByKinds(state.lines, block.appliesTo)
  const amount = roundHalfUp((base * block.percent) / 100)
  return ok(withLine(state, amountLine(`${block.label} ${block.percent}%`, 'adjustment', amount)))
}

export function applyLabor(block: LaborBlock, state: EvalState): BlockResult {
  switch (block.mode) {
    case 'fixed':
      return ok(withLine(state, makeLine(block.label, 'labor', 1, 'servicio', toCents(block.amount))))
    case 'per_piece':
      return ok(withLine(state, makeLine(block.label, 'labor', state.measures.pieces!, 'pz', toCents(block.amount))))
    case 'per_measure': {
      const qty = measureOf(state, block.measure)
      if (!qty.ok) return qty
      return ok(withLine(state, makeLine(block.label, 'labor', qty.value, unitFor(block.measure), toCents(block.amount))))
    }
    case 'percent_materials': {
      const base = sumByKinds(state.lines, ['material'])
      return ok(withLine(state, amountLine(block.label, 'labor', roundHalfUp((base * block.percent) / 100))))
    }
  }
}

export function applyMinimumCharge(block: MinimumChargeBlock, state: EvalState): BlockResult {
  const subtotal = state.lines.reduce((acc, l) => acc + l.amountCents, 0)
  const minimum = toCents(block.amount)
  if (subtotal >= minimum) return ok(state)
  return ok(withLine(state, amountLine(block.label, 'adjustment', minimum - subtotal)))
}
