import type { Block, BlockType, Condition, InputValues } from '../types'
import { applyLabor, applyMinimumCharge, applyWaste } from './adjustments'
import { applyArea, applyMeasure, applyPerimeter } from './measures'
import { applyAccessory, applyBasePrice, applySurcharge } from './pricing'
import type { BlockContext, BlockResult, EvalState } from './state'

export const BLOCK_PHASE: Readonly<Record<BlockType, number>> = {
  area: 0,
  perimeter: 0,
  measure: 0,
  base_price: 1,
  surcharge: 2,
  accessory: 3,
  waste: 4,
  labor: 5,
  minimum_charge: 6,
}

export function conditionHolds(condition: Condition | undefined, values: InputValues): boolean {
  if (!condition) return true
  const value = values[condition.inputKey]
  if ('equals' in condition) return value === condition.equals
  return condition.in.some((candidate) => candidate === value || String(candidate) === String(value))
}

export function applyBlock(block: Block, state: EvalState, ctx: BlockContext): BlockResult {
  switch (block.type) {
    case 'area':
      return applyArea(block, state, ctx)
    case 'perimeter':
      return applyPerimeter(block, state, ctx)
    case 'measure':
      return applyMeasure(block, state, ctx)
    case 'base_price':
      return applyBasePrice(block, state, ctx)
    case 'surcharge':
      return applySurcharge(block, state, ctx)
    case 'accessory':
      return applyAccessory(block, state, ctx)
    case 'waste':
      return applyWaste(block, state)
    case 'labor':
      return applyLabor(block, state)
    case 'minimum_charge':
      return applyMinimumCharge(block, state)
  }
}

export type { BlockContext, EvalState } from './state'
