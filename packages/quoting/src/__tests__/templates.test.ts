import { evaluateProduct } from '../evaluate'
import { aggregateMaterials, toQuoteItemFields } from '../quote-item'
import { getTradeTemplate, instantiateTemplate, TRADE_TEMPLATES } from '../templates'
import { validateProduct } from '../validate'

describe('plantillas de giro', () => {
  it.each(TRADE_TEMPLATES.flatMap((t) => t.products.filter((p) => p.definition).map((p) => [t.key, p.name, p, t] as const)))(
    '%s / %s es un producto válido',
    (_key, _name, product, template) => {
      const res = validateProduct(product.definition, template.priceLists)
      expect(res.ok ? [] : res.errors).toEqual([])
    },
  )

  it('incluye las seis plantillas acordadas', () => {
    expect(TRADE_TEMPLATES.map((t) => t.key).sort()).toEqual(['electrical', 'general', 'glass', 'hvac', 'plumbing', 'sewing'])
    expect(getTradeTemplate('nope')).toBeUndefined()
  })

  it('cancel de baño de la plantilla de vidrio reproduce el caso dorado', () => {
    const glass = getTradeTemplate('glass')!
    const shower = glass.products.find((p) => p.name === 'Cancel de baño templado')!
    const res = evaluateProduct(
      shower.definition,
      { ancho: 1200, alto: 1800, piezas: 2, espesor: '9', herraje: 'corredizo-acero', instalacion: true },
      { name: shower.name, priceLists: glass.priceLists },
    )
    expect(res.ok && res.value.subtotalCents).toBe(1590080)
  })

  it('vidrio a la medida con pulido e instalación', () => {
    const glass = getTradeTemplate('glass')!
    const flat = glass.products.find((p) => p.name === 'Vidrio a la medida')!
    const res = evaluateProduct(
      flat.definition,
      { ancho: 800, alto: 600, piezas: 1, tipo: 'claro', espesor: '6', pulido: true, instalacion: true },
      { name: flat.name, priceLists: glass.priceLists },
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    // 0.48 m2 * 620 = 297.60 ; perímetro 2.8 ml * 55 = 154 ; desperdicio 29.76 ; instalación 0.48*180 = 86.40 => 567.76
    expect(res.value.subtotalCents).toBe(56776)
  })

  it('espejo usa el acabado de canto elegido como llave de la lista de procesos', () => {
    const glass = getTradeTemplate('glass')!
    const mirror = glass.products.find((p) => p.name === 'Espejo a la medida')!
    const pulido = evaluateProduct(mirror.definition, { ancho: 1000, alto: 1000, espesor: '4', canto: 'pulido', instalacion: false }, { name: 'E', priceLists: glass.priceLists })
    const bisel = evaluateProduct(mirror.definition, { ancho: 1000, alto: 1000, espesor: '4', canto: 'biselado', instalacion: false }, { name: 'E', priceLists: glass.priceLists })
    expect(pulido.ok && bisel.ok).toBe(true)
    if (!pulido.ok || !bisel.ok) return
    expect(bisel.value.subtotalCents - pulido.value.subtotalCents).toBe(4 * 4000)
  })

  it('instancia la plantilla con IDs nuevos y siguen validando', () => {
    const glass = getTradeTemplate('glass')!
    const inst = instantiateTemplate(glass, (id) => `uuid-${id}`)
    expect(inst.priceLists.every((l) => l.id.startsWith('uuid-'))).toBe(true)
    for (const product of inst.products.filter((p) => p.definition)) {
      const res = validateProduct(product.definition, inst.priceLists)
      expect(res.ok ? [] : res.errors).toEqual([])
    }
    expect(glass.priceLists[0]!.id).toBe('vidrio')
  })
})

describe('salida hacia quote_items y lista de materiales', () => {
  const glass = getTradeTemplate('glass')!
  const shower = glass.products.find((p) => p.name === 'Cancel de baño templado')!
  const evalShower = (piezas: number) => {
    const res = evaluateProduct(shower.definition, { ancho: 1000, alto: 1900, piezas, espesor: '9', herraje: 'corredizo-aluminio' }, { name: shower.name, priceLists: glass.priceLists })
    if (!res.ok) throw new Error(res.errors.join(','))
    return res.value
  }

  it('convierte el resultado en campos de quote_items', () => {
    const fields = toQuoteItemFields(evalShower(1))
    expect(fields.quantity).toBe(1)
    expect(fields.unit_type).toBe('fixed')
    expect(fields.unit_price).toBe(fields.subtotal)
    expect(fields.description).toContain('Cancel de baño templado')
  })

  it('agrega materiales y accesorios de varias partidas', () => {
    const rows = aggregateMaterials([evalShower(1).lines, evalShower(2).lines])
    const glassRow = rows.find((r) => r.label === 'Vidrio templado')!
    expect(glassRow.unit).toBe('m²')
    expect(glassRow.quantity).toBeCloseTo(1.9 * 3, 4)
    expect(rows.find((r) => r.label === 'Kit de herrajes')!.quantity).toBe(3)
    expect(rows.some((r) => r.label === 'Instalación')).toBe(false)
  })
})
