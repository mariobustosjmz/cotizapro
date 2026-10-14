import { describe, expect, it } from 'vitest'
import { activatePlanSchema, listOrganizationsQuerySchema, organizationIdSchema, suspendPlanSchema } from './schemas'

describe('organizationIdSchema', () => {
  it('acepta los ids demo que no son UUID RFC 4122', () => {
    expect(organizationIdSchema.safeParse('00000000-0000-0000-00c0-000000000003').success).toBe(true)
  })

  it('acepta UUID v4 y rechaza texto', () => {
    expect(organizationIdSchema.safeParse('1a04b7b9-4265-4997-aee6-cc033ca4ccaa').success).toBe(true)
    expect(organizationIdSchema.safeParse('plomeria-don-beto').success).toBe(false)
  })
})

describe('activatePlanSchema', () => {
  it('convierte números y recorta la referencia', () => {
    expect(activatePlanSchema.parse({ plan: 'pro', users: '4', months: '2', reference: '  MP-123 ' }))
      .toEqual({ plan: 'pro', users: 4, months: 2, reference: 'MP-123' })
  })

  it('exige la referencia de Mercado Pago en planes pagados', () => {
    const result = activatePlanSchema.safeParse({ plan: 'pro', users: 1, months: 1, reference: '' })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.reference?.[0]).toContain('referencia')
  })

  it('Gratis no pide referencia', () => {
    expect(activatePlanSchema.safeParse({ plan: 'free', users: 1, months: 1 }).success).toBe(true)
  })

  it('Solo no admite más de 1 usuario', () => {
    const result = activatePlanSchema.safeParse({ plan: 'starter', users: 2, months: 1, reference: 'MP-1' })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.users?.[0]).toContain('Solo')
  })

  it('meses entre 1 y 12', () => {
    expect(activatePlanSchema.safeParse({ plan: 'pro', users: 1, months: 13, reference: 'MP-1' }).success).toBe(false)
    expect(activatePlanSchema.safeParse({ plan: 'pro', users: 1, months: 0, reference: 'MP-1' }).success).toBe(false)
  })
})

describe('suspendPlanSchema y listOrganizationsQuerySchema', () => {
  it('exige un motivo de al menos 3 caracteres', () => {
    expect(suspendPlanSchema.safeParse({ reason: 'x' }).success).toBe(false)
    expect(suspendPlanSchema.parse({ reason: '  Pago rechazado ' })).toEqual({ reason: 'Pago rechazado' })
  })

  it('usa valores por omisión en la búsqueda', () => {
    expect(listOrganizationsQuerySchema.parse({})).toEqual({ q: '', page: 1 })
    expect(listOrganizationsQuerySchema.parse({ q: ' plomer ', page: '2' })).toEqual({ q: 'plomer', page: 2 })
  })
})
