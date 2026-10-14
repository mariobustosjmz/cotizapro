import { describe, expect, it } from 'vitest'
import { toPdfOrgSettings, toPdfQuote } from './pdf-input'
import { publicQuoteFixture as base } from './test-fixtures'

describe('toPdfQuote', () => {
  it('no pasa contacto del cliente ni notas internas', () => {
    const pdf = toPdfQuote(base)
    expect(pdf.client).toEqual({ name: 'Laura', email: null, phone: null })
    expect(pdf.notes).toBeNull()
    expect(pdf.terms_and_conditions).toBe('50 % de anticipo al aceptar.')
  })

  it('usa la fecha de emisión y numera las partidas sin desglose de costos', () => {
    const pdf = toPdfQuote(base)
    expect(pdf.created_at).toBe('2026-10-13')
    expect(pdf.items).toEqual([{ id: 'item-1', description: 'Cancel de baño templado', quantity: 1, unit_type: 'fixed', unit_price: 1500, subtotal: 1500 }])
  })

  it('sin nombre de cliente usa "Cliente"', () => {
    expect(toPdfQuote({ ...base, client_first_name: null }).client.name).toBe('Cliente')
  })
})

describe('toPdfOrgSettings', () => {
  it('solo incluye los datos presentes del negocio', () => {
    expect(toPdfOrgSettings({ ...base, business: { ...base.business, logo_url: null } })).toEqual({
      company_phone: '528112345678',
      brand_color: '#0E7490',
    })
  })
})
