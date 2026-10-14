import { describe, expect, it } from 'vitest'
import { AI_PACKS, packLink, packLinks } from './packs'

const [pack200, pack1000] = AI_PACKS

describe('paquetes de créditos', () => {
  it('ofrece +200 por $49 y +1,000 por $199', () => {
    expect(AI_PACKS.map((p) => [p.credits, p.priceMxn])).toEqual([[200, 49], [1000, 199]])
  })

  it('usa la liga de Mercado Pago si es https', () => {
    const link = packLink(pack200!, 'MEGAGLASS', { MP_LINK_AI_PACK_200: 'https://mpago.la/abc' })
    expect(link).toEqual({ pack: pack200, href: 'https://mpago.la/abc', kind: 'mercadopago' })
  })

  it('sin liga válida abre WhatsApp a soporte con el mensaje escrito', () => {
    const link = packLink(pack1000!, 'MEGAGLASS', { MP_LINK_AI_PACK_1000: 'javascript:alert(1)', SUPPORT_WHATSAPP_PHONE: '8112345678' })
    expect(link.kind).toBe('whatsapp')
    expect(link.href).toContain(encodeURIComponent('Hola, quiero el paquete de 1,000 créditos de IA para MEGAGLASS.'))
  })

  it('sin WhatsApp de soporte usa el correo', () => {
    const [first] = packLinks('MEGAGLASS', {})
    expect(first?.kind).toBe('email')
    expect(first?.href.startsWith('mailto:soporte@cotizapro.mx?subject=')).toBe(true)
  })
})
