import { describe, expect, it } from 'vitest'
import { getTradeTemplate } from '@cotizapro/quoting'
import { defaultInputs, formatMoney, previewItem } from './client-preview'

const glass = getTradeTemplate('glass')!
const shower = glass.products.find((p) => p.name === 'Cancel de baño templado')!

describe('client preview', () => {
  it('propone valores iniciales sin inventar medidas', () => {
    const input = defaultInputs(shower.definition!, glass.priceLists)
    expect(input).toMatchObject({ piezas: 1, espesor: '6', herraje: 'corredizo-aluminio', instalacion: true })
    expect(input).not.toHaveProperty('ancho')
  })

  it('reporta campos faltantes hasta que el usuario captura medidas', () => {
    const input = defaultInputs(shower.definition!, glass.priceLists)
    const empty = previewItem(shower.name, shower.definition, glass.priceLists, input)
    expect(empty.result).toBeNull()
    expect(empty.errors.join(' ')).toContain('Ancho es requerido')
    const full = previewItem(shower.name, shower.definition, glass.priceLists, { ...input, ancho: 1200, alto: 1800, piezas: 2, espesor: '9', herraje: 'corredizo-acero' })
    expect(full.result?.subtotalCents).toBe(1590080)
  })

  it('marca definiciones inválidas sin lanzar', () => {
    const res = previewItem('X', { version: 9 }, [], {})
    expect(res.definition).toBeNull()
    expect(res.errors.length).toBeGreaterThan(0)
  })

  it('formatea pesos mexicanos', () => {
    expect(formatMoney(1590080)).toBe('$15,900.80')
  })
})
