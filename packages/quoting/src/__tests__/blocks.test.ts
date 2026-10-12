import { evaluateProduct } from '../evaluate'
import type { ProductDefinition } from '../types'

const ctx = { name: 'Prueba', priceLists: [] }

function run(product: ProductDefinition, input: Record<string, unknown> = {}) {
  const res = evaluateProduct(product, input, ctx)
  if (!res.ok) throw new Error(res.errors.join('; '))
  return res.value
}

describe('bloque measure', () => {
  it('toma un input directo y lo multiplica por piezas si se pide', () => {
    const r = run(
      {
        version: 1,
        unit: 'lm',
        quantityKey: 'n',
        inputs: [
          { kind: 'number', key: 'metros', label: 'Metros', unit: 'm', min: 0 },
          { kind: 'number', key: 'n', label: 'Piezas', unit: 'pz', min: 1 },
        ],
        blocks: [
          { id: 'm', type: 'measure', label: 'Tubería', inputKey: 'metros', as: 'tuberia_lm', perPiece: true },
          { id: 'b', type: 'base_price', label: 'Tubo PPR', measure: 'tuberia_lm', rate: { kind: 'fixed', amount: 180 } },
        ],
      },
      { metros: 2.5, n: 2 },
    )
    expect(r.measures.tuberia_lm).toBe(5)
    expect(r.subtotalCents).toBe(90000)
  })
})

describe('bloque surcharge', () => {
  const base = (extra: ProductDefinition['blocks'][number]): ProductDefinition => ({
    version: 1,
    unit: 'unit',
    inputs: [{ kind: 'select', key: 'tipo', label: 'Tipo', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }],
    blocks: [{ id: 'b', type: 'base_price', label: 'Material', measure: 'pieces', rate: { kind: 'fixed', amount: 1000 } }, extra],
  })

  it('porcentaje sobre material', () => {
    const r = run(base({ id: 's', type: 'surcharge', label: 'Templado', mode: 'percent', percent: 30 }), { tipo: 'a' })
    expect(r.lines.find((l) => l.label === 'Templado')?.amountCents).toBe(30000)
    expect(r.subtotalCents).toBe(130000)
  })

  it('monto fijo por pieza, condicional con in', () => {
    const block = { id: 's', type: 'surcharge', label: 'Urgente', mode: 'fixed', amount: 250, perPiece: true, when: { inputKey: 'tipo', in: ['b'] } } as const
    expect(run(base(block), { tipo: 'a' }).subtotalCents).toBe(100000)
    expect(run(base(block), { tipo: 'b' }).subtotalCents).toBe(125000)
  })
})

describe('bloque accessory', () => {
  it('cantidad por cada X de medida, redondeando hacia arriba', () => {
    const r = run(
      {
        version: 1,
        unit: 'lm',
        inputs: [{ kind: 'number', key: 'm', label: 'Metros', unit: 'm', min: 0 }],
        blocks: [
          { id: 'm', type: 'measure', label: 'Riel', inputKey: 'm', as: 'riel_lm' },
          { id: 'a', type: 'accessory', label: 'Soporte', rate: { kind: 'fixed', amount: 35 }, quantity: { kind: 'per_measure', measure: 'riel_lm', every: 0.6, count: 1 } },
        ],
      },
      { m: 2 },
    )
    // 2 / 0.6 = 3.33 -> 4 soportes
    expect(r.lines.find((l) => l.label === 'Soporte')?.quantity).toBe(4)
    expect(r.subtotalCents).toBe(14000)
  })

  it('cantidad fija', () => {
    const r = run({
      version: 1,
      unit: 'fixed',
      inputs: [],
      blocks: [{ id: 'a', type: 'accessory', label: 'Taquetes', rate: { kind: 'fixed', amount: 2.5 }, quantity: { kind: 'fixed', count: 12 } }],
    })
    expect(r.subtotalCents).toBe(3000)
  })
})

describe('bloque labor', () => {
  const materials: ProductDefinition['blocks'] = [
    { id: 'b', type: 'base_price', label: 'Material', measure: 'pieces', rate: { kind: 'fixed', amount: 2000 } },
  ]
  it('fija', () => {
    const r = run({ version: 1, unit: 'fixed', inputs: [], blocks: [...materials, { id: 'l', type: 'labor', label: 'MO', mode: 'fixed', amount: 500 }] })
    expect(r.subtotalCents).toBe(250000)
  })
  it('porcentaje de materiales', () => {
    const r = run({ version: 1, unit: 'fixed', inputs: [], blocks: [...materials, { id: 'l', type: 'labor', label: 'MO', mode: 'percent_materials', percent: 25 }] })
    expect(r.lines.find((l) => l.label === 'MO')?.amountCents).toBe(50000)
  })
  it('por medida', () => {
    const r = run({
      version: 1,
      unit: 'sqm',
      inputs: [
        { kind: 'number', key: 'w', label: 'Ancho', unit: 'm' },
        { kind: 'number', key: 'h', label: 'Alto', unit: 'm' },
      ],
      blocks: [
        { id: 'a', type: 'area', label: 'Área', widthKey: 'w', heightKey: 'h', inputUnit: 'm' },
        { id: 'l', type: 'labor', label: 'Confección', mode: 'per_measure', measure: 'area_m2', amount: 180 },
      ],
    }, { w: 2, h: 1.5 })
    expect(r.subtotalCents).toBe(54000)
  })
})

describe('redondeo de centavos', () => {
  it('redondea half-up por línea', () => {
    const r = run({
      version: 1,
      unit: 'sqm',
      inputs: [
        { kind: 'number', key: 'w', label: 'Ancho', unit: 'cm' },
        { kind: 'number', key: 'h', label: 'Alto', unit: 'cm' },
      ],
      blocks: [
        { id: 'a', type: 'area', label: 'Área', widthKey: 'w', heightKey: 'h', inputUnit: 'cm' },
        { id: 'b', type: 'base_price', label: 'Espejo', measure: 'area_m2', rate: { kind: 'fixed', amount: 333.33 } },
      ],
    }, { w: 33, h: 33 })
    // 0.1089 m2 * 33333 c = 3629.9637 -> 3630
    expect(r.subtotalCents).toBe(3630)
  })
})
