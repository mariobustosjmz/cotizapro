import { describe, expect, it } from 'vitest'
import { inviteWhatsappLink, inviteWhatsappMessage } from './invite'

const input = { organizationName: 'MEGAGLASS', roleLabel: 'Ventas', inviteUrl: 'https://cotizapro.mx/invite/abc' } as const

describe('inviteWhatsappMessage', () => {
  it('incluye empresa, rol, liga y la vigencia de 7 días', () => {
    const text = inviteWhatsappMessage(input)
    expect(text).toContain('MEGAGLASS')
    expect(text).toContain('Ventas')
    expect(text).toContain('https://cotizapro.mx/invite/abc')
    expect(text).toContain('7 días')
  })
})

describe('inviteWhatsappLink', () => {
  it('con teléfono abre el chat de esa persona', () => {
    expect(inviteWhatsappLink('8155501001', input)).toMatch(/^https:\/\/wa\.me\/528155501001\?text=/)
  })

  it('sin teléfono deja elegir el contacto en WhatsApp', () => {
    expect(inviteWhatsappLink(null, input)).toMatch(/^https:\/\/wa\.me\/\?text=/)
    expect(inviteWhatsappLink('123', input)).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })
})
