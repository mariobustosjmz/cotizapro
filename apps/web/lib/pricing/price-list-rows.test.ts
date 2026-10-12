import { describe, expect, it } from 'vitest'
import { emptyRow, parsePrice, rowsToPayload, sameRows, toEditableRows } from './price-list-rows'

const dims = ['tipo', 'espesor'] as const

describe('price list rows', () => {
  it('guarda pesos con 2 decimales y acepta separador de miles', () => {
    expect(parsePrice('1,250.5')).toBe(1250.5)
    expect(parsePrice('99.999')).toBe(100)
    expect(parsePrice('-3')).toBeNull()
    expect(parsePrice('abc')).toBeNull()
    expect(parsePrice('')).toBeNull()
    expect(parsePrice('10000001')).toBeNull()
  })

  it('convierte filas guardadas a texto editable y de regreso sin perder datos', () => {
    const original = [{ keys: { tipo: 'claro', espesor: '6' }, price: 480 }]
    const editable = toEditableRows(original)
    expect(editable[0].price).toBe('480.00')
    const payload = rowsToPayload(editable, dims)
    expect(payload).toEqual({ ok: true, rows: original })
  })

  it('reporta dimensiones vacías, precio inválido y combinaciones repetidas por fila', () => {
    const rows = [
      ...toEditableRows([{ keys: { tipo: 'claro', espesor: '6' }, price: 480 }]),
      { ...emptyRow(dims), keys: { tipo: 'claro', espesor: '6' }, price: '500' },
      { ...emptyRow(dims), keys: { tipo: 'filtrasol', espesor: '' }, price: '500' },
      { ...emptyRow(dims), keys: { tipo: 'bronce', espesor: '9' }, price: 'x' },
    ]
    const result = rowsToPayload(rows, dims)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.values(result.errors)).toEqual(['Combinación repetida', 'Falta: espesor', 'Precio inválido'])
  })

  it('detecta cambios para habilitar guardar', () => {
    const a = toEditableRows([{ keys: { tipo: 'claro', espesor: '6' }, price: 480 }])
    expect(sameRows(a, a)).toBe(true)
    expect(sameRows(a, [{ ...a[0], price: '481.00' }])).toBe(false)
    expect(sameRows(a, [...a, emptyRow(dims)])).toBe(false)
  })
})
