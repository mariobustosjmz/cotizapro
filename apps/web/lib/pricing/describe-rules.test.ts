import { describe, expect, it } from 'vitest'
import { getTradeTemplate, validateProduct } from '@cotizapro/quoting'
import { describeBlocks, describeInputs } from './describe-rules'

const glass = getTradeTemplate('glass')!
const shower = glass.products.find((p) => p.name === 'Cancel de baño templado')!

describe('describe rules', () => {
  const definition = validateProduct(shower.definition, glass.priceLists)
  if (!definition.ok) throw new Error(definition.errors.join(', '))

  it('lista los campos con su tipo y origen de opciones', () => {
    const inputs = describeInputs(definition.value, glass.priceLists)
    expect(inputs.find((i) => i.key === 'ancho')?.detail).toBe('Número en mm de 50 a 4000')
    expect(inputs.find((i) => i.key === 'herraje')?.detail).toBe('Opciones de la lista "Kits de herrajes para cancel"')
    expect(inputs.find((i) => i.key === 'instalacion')?.detail).toBe('Sí / No (sí por defecto)')
  })

  it('explica cada bloque en lenguaje del negocio, con su condición', () => {
    const blocks = describeBlocks(definition.value, glass.priceLists)
    expect(blocks.map((b) => b.label)).toContain('Vidrio templado · Precio base')
    expect(blocks.map((b) => b.label)).toContain('Área')
    expect(blocks.map((b) => b.label)).not.toContain('Área · Área')
    expect(blocks.find((b) => b.label.startsWith('Vidrio templado'))?.detail).toBe('m² × precio de la lista "Vidrio templado"')
    expect(blocks.find((b) => b.label.startsWith('Instalación'))?.detail).toBe('$900.00 por pieza (solo si Incluye instalación)')
    expect(blocks.find((b) => b.label.startsWith('Desperdicio'))?.detail).toBe('10 % sobre material')
  })
})
