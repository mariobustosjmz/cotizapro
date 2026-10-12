import { describe, expect, it } from 'vitest'
import { getTradeTemplate } from '@cotizapro/quoting'
import { priceQuoteItems } from './price-quote-items'
import type { PricingContext } from './types'

const glass = getTradeTemplate('glass')!
const shower = glass.products.find((p) => p.name === 'Cancel de baño templado')!

const ctx: PricingContext = {
  products: new Map([['svc-shower', { id: 'svc-shower', name: shower.name, unit_type: 'per_sqm', pricing_blocks: shower.definition }]]),
  priceLists: glass.priceLists,
}

const simpleItem = { service_id: null, description: 'Visita', quantity: 2, unit_price: 250, unit_type: 'fixed' as const }

describe('priceQuoteItems', () => {
  it('deja intactos los items simples y calcula su subtotal', () => {
    const res = priceQuoteItems([simpleItem], ctx)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value[0]).toMatchObject({ description: 'Visita', quantity: 2, unit_price: 250, subtotal: 500, input: null, breakdown: null })
  })

  it('recalcula items configurables ignorando el precio enviado por el cliente', () => {
    const tampered = {
      service_id: 'svc-shower',
      description: 'barato',
      quantity: 1,
      unit_price: 1,
      unit_type: 'fixed' as const,
      input: { ancho: 1200, alto: 1800, piezas: 2, espesor: '9', herraje: 'corredizo-acero', instalacion: true },
    }
    const res = priceQuoteItems([tampered], ctx)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const item = res.value[0]!
    expect(item.subtotal).toBe(15900.8)
    expect(item.unit_price).toBe(15900.8)
    expect(item.description).toContain('Cancel de baño templado')
    expect(item.breakdown?.subtotalCents).toBe(1590080)
    expect(item.pricing_snapshot?.priceLists.length).toBeGreaterThan(0)
  })

  it('congela solo las listas de precios usadas por el producto', () => {
    const res = priceQuoteItems(
      [{ ...simpleItem, service_id: 'svc-shower', input: { ancho: 1000, alto: 1000, espesor: '6', herraje: 'abatible-acero' } }],
      ctx,
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const ids = res.value[0]!.pricing_snapshot!.priceLists.map((l) => l.id).sort()
    expect(ids).toEqual(['herrajes', 'templado'])
  })

  it('devuelve error con número de partida si falta una combinación de precio', () => {
    const res = priceQuoteItems([simpleItem, { ...simpleItem, service_id: 'svc-shower', input: { ancho: 1000, alto: 1000, espesor: '15', herraje: 'abatible-acero' } }], ctx)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.errors[0]).toMatch(/^Partida 2:/)
  })

  it('rechaza un input para un servicio que no es configurable o no existe', () => {
    const res = priceQuoteItems([{ ...simpleItem, service_id: 'svc-unknown', input: { a: 1 } }], ctx)
    expect(res.ok).toBe(false)
  })
})
