import { describe, expect, it } from 'vitest'
import { buildQuoteEmail, type QuoteEmailInput } from './quote-email'
import { brandPalette } from '@/lib/branding/color'

const base: QuoteEmailInput = {
  businessName: 'MEGAGLASS',
  logoUrl: 'https://api.cotizapro.mariobustos.io/storage/v1/object/public/brand-assets/x/logo.png',
  palette: brandPalette('#0E7490'),
  clientName: 'Laura <b>Pérez</b>',
  quoteNumber: 'COT-2026-0007',
  total: '12500.5',
  validUntil: '2026-11-12T00:00:00.000Z',
  contact: { phone: '81 1234 5678', email: 'ventas@megaglass.mx', address: null },
}

describe('buildQuoteEmail', () => {
  it('arma asunto con folio y negocio', () => {
    expect(buildQuoteEmail(base).subject).toBe('Cotización COT-2026-0007 de MEGAGLASS')
  })

  it('escapa el HTML de los datos del cliente', () => {
    const { html } = buildQuoteEmail(base)
    expect(html).toContain('Laura &lt;b&gt;Pérez&lt;/b&gt;')
    expect(html).not.toContain('<b>Pérez</b>')
  })

  it('muestra total con 2 decimales, color y logo del negocio', () => {
    const { html, text } = buildQuoteEmail(base)
    expect(html).toContain('$12,500.50 MXN')
    expect(text).toContain('Total: $12,500.50 MXN')
    expect(html).toContain('#0E7490')
    expect(html).toContain('brand-assets/x/logo.png')
  })

  it('omite logo, vigencia y contacto cuando faltan', () => {
    const { html, text } = buildQuoteEmail({ ...base, logoUrl: null, validUntil: null, contact: { phone: null, email: null, address: null } })
    expect(html).not.toContain('<img')
    expect(html).not.toContain('Válida hasta')
    expect(text).not.toContain('Tel.')
  })
})
