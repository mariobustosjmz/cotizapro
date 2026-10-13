import { describe, expect, it } from 'vitest'
import { orgBranding } from './org-branding'

describe('orgBranding', () => {
  it('lee logo y color de la configuración', () => {
    const b = orgBranding('Plomería Don Beto', { logo_url: 'https://cdn.example.com/logo.png', brand_color: '#0369a1' })
    expect(b).toMatchObject({ name: 'Plomería Don Beto', logoUrl: 'https://cdn.example.com/logo.png' })
    expect(b.palette.color).toBe('#0369A1')
  })

  it('ignora logos con esquemas peligrosos o mal formados', () => {
    expect(orgBranding('X', { logo_url: 'javascript:alert(1)' }).logoUrl).toBeNull()
    expect(orgBranding('X', { logo_url: 'no es url' }).logoUrl).toBeNull()
  })

  it('sin configuración usa nombre genérico y naranja', () => {
    const b = orgBranding(null, null)
    expect(b.name).toBe('Mi empresa')
    expect(b.palette.color).toBe('#F97316')
  })
})
