import { describe, expect, it } from 'vitest'
import { getTradeTemplate } from '@cotizapro/quoting'
import type { DraftResult, DraftResultItem } from './draft-result'
import { draftItemToFormItem, draftNotes, firstItemNeedingAttention, isUnpricedItem, mergeDraftItems, mergeNotes, metersToUnit, type CatalogService } from './to-form'

const glass = getTradeTemplate('glass')!
const cancel = glass.products.find((p) => p.name === 'Cancel de baño templado')!
const SERVICES: readonly CatalogService[] = [
  { id: 'svc-cancel', name: cancel.name, unit_price: 1150, unit_type: 'per_sqm', pricing_blocks: cancel.definition },
  { id: 'svc-vidrio', name: 'Vidrio claro', unit_price: '380.00', unit_type: 'per_sqm' },
  { id: 'svc-visita', name: 'Visita de medición', unit_price: 250, unit_type: 'fixed' },
  { id: 'svc-roto', name: 'Cancel roto', unit_price: 900, unit_type: 'fixed', pricing_blocks: { version: 99 } },
]

const item = (over: Partial<DraftResultItem>): DraftResultItem => ({
  concept: 'x', quantity: 1, widthM: null, heightM: null, notes: null, serviceId: null, serviceName: null, ...over,
})

describe('draftItemToFormItem', () => {
  it('un producto configurable usa el motor y la lista de precios del negocio', () => {
    const result = draftItemToFormItem(
      item({ concept: 'Cancel de baño templado 9 mm', widthM: 0.9, heightM: 1.8, notes: 'corredizo', serviceId: 'svc-cancel' }),
      SERVICES,
      glass.priceLists,
    )
    expect(result).toEqual({
      description: 'Cancel de baño templado · Espesor templado (mm) 9 · Kit de herrajes corredizo-aluminio · 0.90 × 1.80 m · 1 pz',
      quantity: 1,
      unit_price: 5587.3,
      unit_type: 'fixed',
      input: { piezas: 1, espesor: '9', herraje: 'corredizo-aluminio', instalacion: true, ancho: 900, alto: 1800 },
      service_id: 'svc-cancel',
      needs_catalog: false,
    })
  })

  it('sin medidas el configurable queda en 0 para que el formulario pida completarlo', () => {
    const result = draftItemToFormItem(item({ concept: 'Cancel de baño', quantity: 2, serviceId: 'svc-cancel' }), SERVICES, glass.priceLists)
    expect(result.unit_price).toBe(0)
    expect(result.input).toMatchObject({ piezas: 2 })
  })

  it('un servicio simple por m² usa el área total como cantidad', () => {
    expect(draftItemToFormItem(item({ concept: 'vidrio', quantity: 2, widthM: 1.2, heightM: 1.5, serviceId: 'svc-vidrio' }), SERVICES, glass.priceLists)).toEqual({
      description: 'Vidrio claro · 1.20 × 1.50 m',
      quantity: 3.6,
      unit_price: 380,
      unit_type: 'per_sqm',
      service_id: 'svc-vidrio',
      input: null,
      needs_catalog: false,
    })
  })

  it('por m² sin medidas conserva la nota "Revisar" y no inventa un área', () => {
    const result = draftItemToFormItem(
      item({ concept: 'vidrio', quantity: 2, notes: 'Revisar: faltan medidas', serviceId: 'svc-vidrio' }),
      SERVICES,
      glass.priceLists,
    )
    expect(result.description).toBe('Vidrio claro · Revisar: faltan medidas · Revisar: faltan medidas (cantidad en piezas, el precio es por m²)')
    expect(result.quantity).toBe(2)
    expect(result.quantity).not.toBe(0)
  })

  it('por m² con una sola medida no calcula área', () => {
    const result = draftItemToFormItem(item({ concept: 'vidrio', widthM: 1.2, notes: 'Revisar: falta alto', serviceId: 'svc-vidrio' }), SERVICES, glass.priceLists)
    expect(result.quantity).toBe(1)
    expect(result.description).toContain('Revisar: falta alto')
  })

  it('el área total se redondea a 2 decimales', () => {
    const result = draftItemToFormItem(item({ concept: 'vidrio', quantity: 3, widthM: 0.333, heightM: 0.777, serviceId: 'svc-vidrio' }), SERVICES, glass.priceLists)
    expect(result.quantity).toBe(0.78)
  })

  it('una definición inválida cae al precio simple', () => {
    const result = draftItemToFormItem(item({ concept: 'cancel roto', serviceId: 'svc-roto' }), SERVICES, glass.priceLists)
    expect(result).toMatchObject({ unit_price: 900, unit_type: 'fixed', input: null })
  })

  it('sin coincidencia queda sin precio y marcada para elegir del catálogo', () => {
    expect(draftItemToFormItem(item({ concept: 'Mosquitero de fibra', quantity: 2, widthM: 1.2, heightM: 1.5 }), SERVICES, glass.priceLists)).toEqual({
      description: 'Mosquitero de fibra · 1.20 × 1.50 m',
      quantity: 2,
      unit_price: 0,
      unit_type: 'per_unit',
      service_id: null,
      input: null,
      needs_catalog: true,
    })
  })

  it('un serviceId que ya no está en el catálogo se trata como sin coincidencia', () => {
    expect(draftItemToFormItem(item({ concept: 'algo', serviceId: 'svc-borrado' }), SERVICES, glass.priceLists)).toMatchObject({ unit_price: 0, needs_catalog: true })
  })

  it('ningún campo del modelo llega al precio', () => {
    const hostile = { ...item({ concept: 'vidrio', serviceId: 'svc-vidrio' }), unit_price: 1, price: 1, unitPrice: 1, total: 1 } as DraftResultItem
    expect(draftItemToFormItem(hostile, SERVICES, glass.priceLists).unit_price).toBe(380)
    const unmatched = { ...item({ concept: 'otro' }), unit_price: 1, price: 1, unitPrice: 1 } as DraftResultItem
    expect(draftItemToFormItem(unmatched, SERVICES, glass.priceLists).unit_price).toBe(0)
  })

  it('un texto sin opción clara usa el default del motor', () => {
    const result = draftItemToFormItem(
      item({ concept: 'Cancel de baño', widthM: 0.9, heightM: 1.8, notes: 'bonito y resistente', serviceId: 'svc-cancel' }),
      SERVICES,
      glass.priceLists,
    )
    const base = draftItemToFormItem(item({ concept: 'Cancel de baño', widthM: 0.9, heightM: 1.8, serviceId: 'svc-cancel' }), SERVICES, glass.priceLists)
    expect(result.input).toEqual(base.input)
  })
})

describe('revisión y límites', () => {
  const NOTE = 'Revisar: faltan medidas (cantidad en piezas, el precio es por m²)'

  it('por m² sin medidas y sin nota del modelo marca revisión con la nota fija', () => {
    const result = draftItemToFormItem(item({ concept: 'vidrio', quantity: 2, serviceId: 'svc-vidrio' }), SERVICES, glass.priceLists)
    expect(result).toMatchObject({ needs_review: true, quantity: 2, unit_price: 380 })
    expect(result.description).toBe(`Vidrio claro · ${NOTE}`)
    expect(result.review_reason).toBeTruthy()
  })

  it('con medidas completas no marca revisión', () => {
    const result = draftItemToFormItem(item({ concept: 'vidrio', widthM: 1, heightM: 1, serviceId: 'svc-vidrio' }), SERVICES, glass.priceLists)
    expect(result.needs_review).toBeUndefined()
  })

  it('un configurable sin resultado del motor marca revisión', () => {
    const result = draftItemToFormItem(item({ concept: 'Cancel', serviceId: 'svc-cancel' }), SERVICES, glass.priceLists)
    expect(result).toMatchObject({ unit_price: 0, needs_review: true })
  })

  it('un configurable calculado no marca revisión', () => {
    const result = draftItemToFormItem(item({ concept: 'Cancel', widthM: 0.9, heightM: 1.8, serviceId: 'svc-cancel' }), SERVICES, glass.priceLists)
    expect(result.needs_review).toBeUndefined()
  })

  it('una definición inválida que cae al precio simple marca revisión', () => {
    expect(draftItemToFormItem(item({ concept: 'x', serviceId: 'svc-roto' }), SERVICES, glass.priceLists)).toMatchObject({ unit_price: 900, needs_review: true })
  })

  it('un precio de catálogo no numérico queda en 0 y en revisión', () => {
    const bad: readonly CatalogService[] = [{ id: 'b', name: 'Raro', unit_price: 'abc', unit_type: 'fixed' }]
    expect(draftItemToFormItem(item({ concept: 'x', serviceId: 'b' }), bad, glass.priceLists)).toMatchObject({ unit_price: 0, needs_review: true })
  })

  it('"9 piezas" no elige el espesor 9; "12 mm" y "12mm" sí', () => {
    const base = { widthM: 0.9, heightM: 1.8, serviceId: 'svc-cancel' }
    const pieces = draftItemToFormItem(item({ ...base, concept: 'Cancel de baño', notes: '9 piezas' }), SERVICES, glass.priceLists)
    const mm = draftItemToFormItem(item({ ...base, concept: 'Cancel de baño 12 mm' }), SERVICES, glass.priceLists)
    const glued = draftItemToFormItem(item({ ...base, concept: 'Cancel de baño 12mm' }), SERVICES, glass.priceLists)
    expect(pieces.input).toMatchObject({ espesor: '6' })
    expect(mm.input).toMatchObject({ espesor: '12' })
    expect(glued.input).toMatchObject({ espesor: '12' })
  })

  it('acota la cantidad a (0, 500]', () => {
    const big = draftItemToFormItem(item({ concept: 'otro', quantity: 9999 }), SERVICES, glass.priceLists)
    const bad = draftItemToFormItem(item({ concept: 'otro', quantity: Number.NaN }), SERVICES, glass.priceLists)
    const neg = draftItemToFormItem(item({ concept: 'otro', quantity: -3, serviceId: 'svc-visita' }), SERVICES, glass.priceLists)
    expect([big.quantity, bad.quantity, neg.quantity]).toEqual([500, 1, 1])
  })

  it('firstItemNeedingAttention incluye revisión además de falta de catálogo', () => {
    const ok = { description: 'a', quantity: 1, unit_price: 5, unit_type: 'fixed' as const, service_id: 's' }
    expect(firstItemNeedingAttention([ok, { ...ok, needs_review: true }])).toBe(1)
    expect(firstItemNeedingAttention([ok, { ...ok, unit_price: 0, needs_catalog: true }])).toBe(1)
    expect(firstItemNeedingAttention([ok])).toBe(-1)
  })
})

describe('metersToUnit', () => {
  it('convierte sin deriva de punto flotante', () => {
    expect(metersToUnit(0.9, 'mm')).toBe(900)
    expect(metersToUnit(1.15, 'mm')).toBe(1150)
    expect(metersToUnit(0.9, 'cm')).toBe(90)
    expect(metersToUnit(1.8, 'm')).toBe(1.8)
    expect(metersToUnit(2.3, 'mm')).toBe(2300)
  })
})

describe('notas y mezcla con el formulario', () => {
  const result: DraftResult = { client: { kind: 'none' }, items: [], notes: 'Quiere instalación el sábado', zone: 'San Nicolás' }
  const blank = { description: '', quantity: 1, unit_price: 0, unit_type: 'per_unit' as const, service_id: null }
  const filled = { ...blank, description: 'Espejo de baño', unit_price: 800 }
  const incoming = { ...blank, description: 'Mosquitero', needs_catalog: true }

  it('pone la zona en las notas', () => {
    expect(draftNotes(result)).toBe('Zona: San Nicolás\nQuiere instalación el sábado')
    expect(draftNotes({ ...result, notes: null, zone: null })).toBeNull()
  })

  it('reemplaza la partida vacía, conserva las capturadas y no borra nada si no llegó ninguna', () => {
    expect(mergeDraftItems([blank], [incoming])).toEqual([incoming])
    expect(mergeDraftItems([filled, blank], [incoming])).toEqual([filled, incoming])
    expect(mergeDraftItems([filled], [])).toEqual([filled])
  })

  it('agrega las notas sin borrar las existentes', () => {
    expect(mergeNotes('', 'Zona: Cumbres')).toBe('Zona: Cumbres')
    expect(mergeNotes('Llamar antes', 'Zona: Cumbres')).toBe('Llamar antes\nZona: Cumbres')
    expect(mergeNotes('Llamar antes', null)).toBe('Llamar antes')
  })

  it('una partida del borrador sin catálogo y sin precio cuenta como sin precio', () => {
    expect(isUnpricedItem(incoming)).toBe(true)
    expect(isUnpricedItem({ ...incoming, unit_price: 450 })).toBe(false)
    expect(isUnpricedItem(filled)).toBe(false)
    expect(firstItemNeedingAttention([filled, incoming])).toBe(1)
  })
})
