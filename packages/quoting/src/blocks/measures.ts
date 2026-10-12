import { ceilToStep, lengthToMeters, ok } from '../math'
import type { Block } from '../types'
import { type BlockContext, type BlockResult, type EvalState, withMeasure } from './state'

type AreaBlock = Extract<Block, { type: 'area' }>
type PerimeterBlock = Extract<Block, { type: 'perimeter' }>
type MeasureBlock = Extract<Block, { type: 'measure' }>

function dimensions(block: AreaBlock | PerimeterBlock, ctx: BlockContext): { width: number; height: number } {
  const raw = {
    width: lengthToMeters(Number(ctx.values[block.widthKey]), block.inputUnit),
    height: lengthToMeters(Number(ctx.values[block.heightKey]), block.inputUnit),
  }
  if (!block.roundTo) return raw
  return { width: ceilToStep(raw.width, block.roundTo), height: ceilToStep(raw.height, block.roundTo) }
}

function rememberDims(state: EvalState, block: AreaBlock | PerimeterBlock, ctx: BlockContext): EvalState {
  if (state.dims) return state
  const width = lengthToMeters(Number(ctx.values[block.widthKey]), block.inputUnit)
  const height = lengthToMeters(Number(ctx.values[block.heightKey]), block.inputUnit)
  return { ...state, dims: { width, height } }
}

export function applyArea(block: AreaBlock, state: EvalState, ctx: BlockContext): BlockResult {
  const { width, height } = dimensions(block, ctx)
  const perPiece = Math.max(width * height, block.minPerPiece ?? 0)
  const next = withMeasure(state, block.as ?? 'area_m2', perPiece * state.measures.pieces!)
  return ok(rememberDims(next, block, ctx))
}

export function applyPerimeter(block: PerimeterBlock, state: EvalState, ctx: BlockContext): BlockResult {
  const { width, height } = dimensions(block, ctx)
  const next = withMeasure(state, block.as ?? 'perimeter_lm', 2 * (width + height) * state.measures.pieces!)
  return ok(rememberDims(next, block, ctx))
}

export function applyMeasure(block: MeasureBlock, state: EvalState, ctx: BlockContext): BlockResult {
  const base = Number(ctx.values[block.inputKey])
  const value = block.perPiece ? base * state.measures.pieces! : base
  return ok(withMeasure(state, block.as, value))
}
