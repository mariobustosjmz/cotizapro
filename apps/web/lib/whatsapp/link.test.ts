import { describe, expect, it } from 'vitest'
import { normalizeWhatsappPhone, quoteWhatsappMessage, whatsappLink } from './link'

describe('normalizeWhatsappPhone', () => {
  it('antepone 52 a un número local de 10 dígitos', () => {
    expect(normalizeWhatsappPhone('81 5550-1001')).toBe('528155501001')
  })

  it('respeta un número que ya trae lada de país', () => {
    expect(normalizeWhatsappPhone('+52 1 81 5550 1001')).toBe('5218155501001')
  })
})

describe('whatsappLink', () => {
  it('codifica el mensaje en la liga', () => {
    expect(whatsappLink('8155501001', 'Hola & adiós')).toBe('https://wa.me/528155501001?text=Hola%20%26%20adi%C3%B3s')
  })

  it('sin número usable regresa null', () => {
    expect(whatsappLink(null, 'x')).toBeNull()
    expect(whatsappLink('12345', 'x')).toBeNull()
  })
})

describe('quoteWhatsappMessage', () => {
  const base = {
    clientName: 'Andrea Garza Villarreal',
    businessName: 'MEGAGLASS',
    quoteNumber: 'COT-2026-002',
    total: 12238.48,
    validUntil: '2026-10-27T00:00:00.000Z',
    pdfUrl: null,
  }

  it('saluda por nombre e incluye folio, negocio, total y vigencia', () => {
    const text = quoteWhatsappMessage(base)
    expect(text).toContain('Hola Andrea,')
    expect(text).toContain('COT-2026-002 de MEGAGLASS')
    expect(text).toContain('$12,238.48')
    expect(text).toContain('27 de octubre de 2026')
    expect(text).toContain('te mando el PDF')
  })

  it('usa la liga del PDF cuando existe', () => {
    expect(quoteWhatsappMessage({ ...base, pdfUrl: 'https://x/y.pdf' })).toContain('PDF: https://x/y.pdf')
  })
})
