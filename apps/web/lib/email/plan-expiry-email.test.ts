import { describe, expect, it } from 'vitest'
import { buildPlanExpiryEmail, type PlanExpiryEmailInput } from './plan-expiry-email'

const base: PlanExpiryEmailInput = {
  businessName: 'Plomería <b>Don Beto</b>',
  ownerName: 'Beto Ramírez',
  planName: 'Taller',
  kind: 'd3',
  daysLeft: 3,
  periodEnd: '2026-10-16T14:00:00Z',
  renewUrl: 'https://cotizapro.mariobustos.io/dashboard/billing',
}

describe('buildPlanExpiryEmail', () => {
  it('avisa cuántos días faltan y qué se limitará', () => {
    const email = buildPlanExpiryEmail(base)
    expect(email.subject).toBe('Tu plan Taller de CotizaPro vence en 3 días')
    expect(email.text).toContain('Hola Beto,')
    expect(email.text).toContain('vence el 16 de octubre de 2026')
    expect(email.text).toContain('solo lectura')
    expect(email.text).toContain('Renovar plan: https://cotizapro.mariobustos.io/dashboard/billing')
  })

  it('usa singular con 1 día', () => {
    expect(buildPlanExpiryEmail({ ...base, kind: 'd1', daysLeft: 1 }).subject).toBe('Tu plan Taller de CotizaPro vence en 1 día')
  })

  it('el día del vencimiento dice que la cuenta ya quedó en solo lectura', () => {
    const email = buildPlanExpiryEmail({ ...base, kind: 'd0', daysLeft: 0 })
    expect(email.subject).toBe('Tu plan Taller de CotizaPro venció')
    expect(email.text).toContain('quedó en solo lectura')
  })

  it('escapa el HTML y enlaza a Facturación', () => {
    const { html } = buildPlanExpiryEmail(base)
    expect(html).toContain('Plomería &lt;b&gt;Don Beto&lt;/b&gt;')
    expect(html).not.toContain('<b>Don Beto</b>')
    expect(html).toContain('href="https://cotizapro.mariobustos.io/dashboard/billing"')
  })

  it('saluda sin nombre si el propietario no lo tiene', () => {
    expect(buildPlanExpiryEmail({ ...base, ownerName: null }).text.startsWith('Hola,')).toBe(true)
  })
})
