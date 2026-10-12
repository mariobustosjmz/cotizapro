import { applyBlock, conditionHolds, type BlockContext, type EvalState } from './blocks'
import { resolveInputs } from './inputs'
import type { EvaluationContext, InputValues, ProductDefinition, QuoteLineResult, Result } from './types'
import { validateProduct } from './validate'

export const ENGINE_VERSION = '1.0.0'

function describe(name: string, product: ProductDefinition, values: InputValues, state: EvalState): string {
  const selects = product.inputs
    .filter((f) => f.kind === 'select')
    .map((f) => {
      const value = String(values[f.key])
      const option = f.kind === 'select' ? f.options?.find((o) => o.value === value) : undefined
      return option ? option.label : `${f.label} ${value}`
    })
  const dims = state.dims ? [`${state.dims.width.toFixed(2)} × ${state.dims.height.toFixed(2)} m`] : []
  return [name, ...selects, ...dims, `${state.measures.pieces} pz`].join(' · ')
}

function runBlocks(product: ProductDefinition, ctx: BlockContext, initial: EvalState): Result<EvalState> {
  let state = initial
  for (const block of product.blocks) {
    if (!conditionHolds(block.when, ctx.values)) continue
    const next = applyBlock(block, state, ctx)
    if (!next.ok) return next
    state = next.value
  }
  return { ok: true, value: state }
}

export function evaluateProduct(
  rawProduct: unknown,
  rawInput: Readonly<Record<string, unknown>>,
  context: EvaluationContext,
): Result<QuoteLineResult> {
  const product = validateProduct(rawProduct, context.priceLists)
  if (!product.ok) return product
  const values = resolveInputs(product.value, rawInput, context.priceLists)
  if (!values.ok) return values

  const pieces = product.value.quantityKey ? Number(values.value[product.value.quantityKey]) : 1
  const ctx: BlockContext = { values: values.value, lists: context.priceLists, product: product.value }
  const state = runBlocks(product.value, ctx, { measures: { pieces }, lines: [] })
  if (!state.ok) return state

  const lines = state.value.lines.filter((l) => l.amountCents !== 0)
  const subtotalCents = lines.reduce((acc, l) => acc + l.amountCents, 0)
  return {
    ok: true,
    value: {
      measures: { ...state.value.measures, pieces },
      lines,
      subtotalCents,
      description: describe(context.name, product.value, values.value, state.value),
      input: values.value,
      engineVersion: ENGINE_VERSION,
    },
  }
}
