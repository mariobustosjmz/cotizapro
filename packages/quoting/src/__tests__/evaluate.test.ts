import { evaluateProduct } from '../evaluate'
import type { PriceList, ProductDefinition } from '../types'

const GLASS_LIST: PriceList = {
  id: 'pl-templado',
  name: 'Vidrio templado',
  unit: 'sqm',
  dimensions: ['espesor'],
  rows: [
    { keys: { espesor: '6' }, price: 1150 },
    { keys: { espesor: '9' }, price: 1650 },
  ],
}

const HARDWARE_LIST: PriceList = {
  id: 'pl-herrajes',
  name: 'Herrajes cancel',
  unit: 'unit',
  dimensions: ['acabado'],
  rows: [
    { keys: { acabado: 'acero' }, price: 2800 },
    { keys: { acabado: 'aluminio' }, price: 1450 },
  ],
}

const SHOWER: ProductDefinition = {
  version: 1,
  unit: 'sqm',
  quantityKey: 'piezas',
  inputs: [
    { kind: 'number', key: 'ancho', label: 'Ancho', unit: 'mm', min: 100, max: 3000 },
    { kind: 'number', key: 'alto', label: 'Alto', unit: 'mm', min: 100, max: 3000 },
    { kind: 'number', key: 'piezas', label: 'Piezas', unit: 'pz', min: 1, default: 1 },
    { kind: 'select', key: 'espesor', label: 'Espesor', fromPriceList: { listId: 'pl-templado', dimension: 'espesor' } },
    { kind: 'select', key: 'herraje', label: 'Herraje', fromPriceList: { listId: 'pl-herrajes', dimension: 'acabado' } },
    { kind: 'boolean', key: 'instalacion', label: 'Incluye instalación', default: true },
  ],
  blocks: [
    { id: 'm1', type: 'area', label: 'Área', widthKey: 'ancho', heightKey: 'alto', inputUnit: 'mm', roundTo: 0.05, minPerPiece: 0.5 },
    { id: 'm2', type: 'perimeter', label: 'Perímetro', widthKey: 'ancho', heightKey: 'alto', inputUnit: 'mm' },
    { id: 'b1', type: 'base_price', label: 'Vidrio templado', measure: 'area_m2', rate: { kind: 'price_list', listId: 'pl-templado', keys: { espesor: 'espesor' } } },
    { id: 's1', type: 'surcharge', label: 'Pulido de canto', mode: 'per_measure', measure: 'perimeter_lm', rate: { kind: 'fixed', amount: 55 } },
    { id: 'a1', type: 'accessory', label: 'Kit de herrajes', rate: { kind: 'price_list', listId: 'pl-herrajes', keys: { acabado: 'herraje' } }, quantity: { kind: 'per_piece', count: 1 } },
    { id: 'w1', type: 'waste', label: 'Desperdicio', percent: 10, appliesTo: ['material'] },
    { id: 'l1', type: 'labor', label: 'Instalación', mode: 'per_piece', amount: 900, when: { inputKey: 'instalacion', equals: true } },
    { id: 'c1', type: 'minimum_charge', label: 'Cargo mínimo', amount: 800 },
  ],
}

const CTX = { name: 'Cancel de baño templado', priceLists: [GLASS_LIST, HARDWARE_LIST] }

describe('evaluateProduct: cancel de baño (caso dorado)', () => {
  it('calcula el total esperado a mano', () => {
    const res = evaluateProduct(SHOWER, { ancho: 1200, alto: 1800, piezas: 2, espesor: '9', herraje: 'acero', instalacion: true }, CTX)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const r = res.value
    expect(r.measures.area_m2).toBeCloseTo(4.32, 4)
    expect(r.measures.perimeter_lm).toBeCloseTo(12, 4)
    expect(r.measures.pieces).toBe(2)
    const amounts = Object.fromEntries(r.lines.map((l) => [l.label, l.amountCents]))
    expect(amounts['Vidrio templado']).toBe(712800)
    expect(amounts['Pulido de canto']).toBe(66000)
    expect(amounts['Kit de herrajes']).toBe(560000)
    expect(amounts['Desperdicio 10%']).toBe(71280)
    expect(amounts['Instalación']).toBe(180000)
    expect(r.subtotalCents).toBe(1590080)
    expect(r.description).toContain('Cancel de baño templado')
    expect(r.description).toContain('1.20 × 1.80 m')
    expect(r.description).toContain('2 pz')
  })

  it('omite la instalación cuando el booleano es falso', () => {
    const res = evaluateProduct(SHOWER, { ancho: 1200, alto: 1800, piezas: 2, espesor: '9', herraje: 'acero', instalacion: false }, CTX)
    expect(res.ok && res.value.lines.some((l) => l.label === 'Instalación')).toBe(false)
    expect(res.ok && res.value.subtotalCents).toBe(1410080)
  })

  it('redondea medidas hacia arriba al múltiplo y aplica mínimo por pieza', () => {
    const res = evaluateProduct(SHOWER, { ancho: 302, alto: 401, piezas: 1, espesor: '6', herraje: 'aluminio', instalacion: false }, CTX)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    // 0.35 x 0.45 = 0.1575 -> mínimo 0.5 m2
    expect(res.value.measures.area_m2).toBeCloseTo(0.5, 4)
  })

  it('agrega ajuste a cargo mínimo cuando el subtotal es menor', () => {
    const tiny: ProductDefinition = {
      version: 1,
      unit: 'unit',
      inputs: [],
      blocks: [
        { id: 'b', type: 'base_price', label: 'Servicio', measure: 'pieces', rate: { kind: 'fixed', amount: 100 } },
        { id: 'c', type: 'minimum_charge', label: 'Cargo mínimo', amount: 800 },
      ],
    }
    const res = evaluateProduct(tiny, {}, { name: 'X', priceLists: [] })
    expect(res.ok && res.value.subtotalCents).toBe(80000)
    expect(res.ok && res.value.lines.find((l) => l.kind === 'adjustment')?.amountCents).toBe(70000)
  })
})

describe('evaluateProduct: validación de entrada', () => {
  it('rechaza un número fuera de rango', () => {
    const res = evaluateProduct(SHOWER, { ancho: 50, alto: 1800, piezas: 1, espesor: '9', herraje: 'acero' }, CTX)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.errors.join(' ')).toContain('Ancho')
  })

  it('rechaza un número faltante', () => {
    const res = evaluateProduct(SHOWER, { alto: 1800, espesor: '9', herraje: 'acero' }, CTX)
    expect(res.ok).toBe(false)
  })

  it('rechaza una opción que no existe en la lista de precios', () => {
    const res = evaluateProduct(SHOWER, { ancho: 1000, alto: 1000, piezas: 1, espesor: '19', herraje: 'acero' }, CTX)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.errors.join(' ')).toContain('Espesor')
  })

  it('usa valores por defecto de piezas y booleanos', () => {
    const res = evaluateProduct(SHOWER, { ancho: 1000, alto: 1000, espesor: '6', herraje: 'aluminio' }, CTX)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.measures.pieces).toBe(1)
    expect(res.value.lines.some((l) => l.label === 'Instalación')).toBe(true)
  })

  it('falla si la lista de precios no tiene la combinación', () => {
    const partial: PriceList = { ...GLASS_LIST, rows: [{ keys: { espesor: '6' }, price: 1150 }] }
    const product: ProductDefinition = {
      ...SHOWER,
      inputs: SHOWER.inputs.map((i) =>
        i.key === 'espesor' ? { kind: 'select', key: 'espesor', label: 'Espesor', options: [{ value: '6', label: '6 mm' }, { value: '9', label: '9 mm' }] } : i,
      ),
    }
    const res = evaluateProduct(product, { ancho: 1000, alto: 1000, espesor: '9', herraje: 'acero' }, { name: 'X', priceLists: [partial, HARDWARE_LIST] })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.errors.join(' ')).toContain('Vidrio templado')
  })
})
