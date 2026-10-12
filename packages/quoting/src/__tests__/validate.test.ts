import { validateProduct } from '../validate'
import type { ProductDefinition } from '../types'

const ok: ProductDefinition = {
  version: 1,
  unit: 'sqm',
  inputs: [
    { kind: 'number', key: 'w', label: 'Ancho', unit: 'mm' },
    { kind: 'number', key: 'h', label: 'Alto', unit: 'mm' },
  ],
  blocks: [
    { id: 'a', type: 'area', label: 'Área', widthKey: 'w', heightKey: 'h', inputUnit: 'mm' },
    { id: 'b', type: 'base_price', label: 'Vidrio', measure: 'area_m2', rate: { kind: 'fixed', amount: 500 } },
  ],
}

describe('validateProduct', () => {
  it('acepta un producto válido', () => {
    expect(validateProduct(ok, [])).toEqual({ ok: true, value: ok })
  })

  it('rechaza bloques fuera de orden de fase', () => {
    const bad = { ...ok, blocks: [ok.blocks[1]!, ok.blocks[0]!] }
    const res = validateProduct(bad, [])
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.errors.join(' ')).toMatch(/orden/i)
  })

  it('rechaza referencias a inputs inexistentes', () => {
    const bad: ProductDefinition = { ...ok, blocks: [{ id: 'a', type: 'area', label: 'Área', widthKey: 'x', heightKey: 'h', inputUnit: 'mm' }] }
    const res = validateProduct(bad, [])
    expect(res.ok).toBe(false)
  })

  it('rechaza medidas no producidas antes de usarse', () => {
    const bad: ProductDefinition = { ...ok, blocks: [{ id: 'b', type: 'base_price', label: 'X', measure: 'perimeter_lm', rate: { kind: 'fixed', amount: 1 } }] }
    const res = validateProduct(bad, [])
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.errors.join(' ')).toContain('perimeter_lm')
  })

  it('rechaza listas de precios desconocidas', () => {
    const bad: ProductDefinition = {
      ...ok,
      blocks: [ok.blocks[0]!, { id: 'b', type: 'base_price', label: 'Vidrio', measure: 'area_m2', rate: { kind: 'price_list', listId: 'nope', keys: { espesor: 'w' } } }],
    }
    expect(validateProduct(bad, []).ok).toBe(false)
  })

  it('rechaza ids de bloque o keys de input duplicados', () => {
    const dupInputs = { ...ok, inputs: [...ok.inputs, ok.inputs[0]!] }
    expect(validateProduct(dupInputs, []).ok).toBe(false)
    const dupBlocks = { ...ok, blocks: [ok.blocks[0]!, { ...ok.blocks[1]!, id: 'a' }] }
    expect(validateProduct(dupBlocks, []).ok).toBe(false)
  })

  it('rechaza JSON con forma inválida', () => {
    expect(validateProduct({ version: 2 }, []).ok).toBe(false)
    expect(validateProduct(null, []).ok).toBe(false)
  })
})

describe('usedPriceListIds', () => {
  it('reúne listas de inputs y bloques sin repetir', async () => {
    const { usedPriceListIds } = await import('../references')
    const { getTradeTemplate } = await import('../templates')
    const shower = getTradeTemplate('glass')!.products.find((p) => p.name === 'Cancel de baño templado')!
    expect([...usedPriceListIds(shower.definition!)].sort()).toEqual(['herrajes', 'templado'])
  })
})
