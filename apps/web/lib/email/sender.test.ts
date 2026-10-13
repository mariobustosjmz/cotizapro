import { describe, expect, it } from 'vitest'
import { fromHeader, senderAddress, safeReplyTo } from './sender'

describe('senderAddress', () => {
  it('extrae la dirección de "Nombre <correo>"', () => {
    expect(senderAddress('CotizaPro <cotizaciones@tokenizate.mariobustos.io>')).toBe('cotizaciones@tokenizate.mariobustos.io')
  })
  it('acepta una dirección sola', () => {
    expect(senderAddress('hola@ejemplo.mx')).toBe('hola@ejemplo.mx')
  })
  it('usa la de respaldo si no hay valor o es inválido', () => {
    expect(senderAddress(undefined)).toBe('cotizaciones@tokenizate.mariobustos.io')
    expect(senderAddress('sin arroba')).toBe('cotizaciones@tokenizate.mariobustos.io')
  })
})

describe('fromHeader', () => {
  it('pone el nombre del negocio vía CotizaPro', () => {
    expect(fromHeader('MEGAGLASS', 'x <c@d.mx>')).toBe('"MEGAGLASS vía CotizaPro" <c@d.mx>')
  })
  it('limpia caracteres que romperían el encabezado', () => {
    expect(fromHeader('Vidrios "El Sol" <spam>\r\nBcc: x', 'c@d.mx')).toBe('"Vidrios El Sol spamBcc: x vía CotizaPro" <c@d.mx>')
  })
  it('sin nombre usa CotizaPro', () => {
    expect(fromHeader('  ', 'c@d.mx')).toBe('"CotizaPro" <c@d.mx>')
  })
})

describe('safeReplyTo', () => {
  it('acepta un correo válido y descarta lo demás', () => {
    expect(safeReplyTo(' Ventas@Negocio.MX ')).toBe('ventas@negocio.mx')
    expect(safeReplyTo('no es correo')).toBeNull()
    expect(safeReplyTo(42)).toBeNull()
  })
})
