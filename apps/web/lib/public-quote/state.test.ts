import { describe, expect, it } from 'vitest'
import { publicQuoteState, statusBanner } from './state'
import { publicQuoteFixture as base } from './test-fixtures'

describe('publicQuoteState', () => {
  it.each([
    ['sent', false, 'open'],
    ['viewed', false, 'open'],
    ['sent', true, 'expired'],
    ['expired', false, 'expired'],
    ['accepted', false, 'accepted'],
    ['en_instalacion', false, 'accepted'],
    ['completado', true, 'accepted'],
    ['cobrado', false, 'accepted'],
    ['rejected', false, 'rejected'],
    ['draft', false, 'closed'],
  ] as const)('%s (vencida: %s) → %s', (status, isExpired, expected) => {
    expect(publicQuoteState({ status, is_expired: isExpired })).toBe(expected)
  })
})

describe('statusBanner', () => {
  it('no muestra aviso cuando el cliente puede responder', () => {
    expect(statusBanner(base)).toBeNull()
  })

  it('avisa al negocio que es una vista previa', () => {
    expect(statusBanner({ ...base, is_owner_preview: true })).toEqual({
      tone: 'info',
      text: 'Vista previa: así ve tu cliente esta cotización. Solo tu cliente puede aceptarla o rechazarla.',
    })
  })

  it('aceptada con fecha y nombre', () => {
    const banner = statusBanner({ ...base, status: 'accepted', accepted_at: '2026-10-14T15:05:00Z', accepted_by_name: 'Laura Pérez' })
    expect(banner?.tone).toBe('success')
    expect(banner?.text).toContain('Cotización aceptada el 14 de octubre de 2026')
    expect(banner?.text).toContain('por Laura Pérez')
  })

  it('vencida pide una actualización', () => {
    expect(statusBanner({ ...base, is_expired: true })).toEqual({ tone: 'warning', text: 'Vencida: pide una actualización a MEGAGLASS.' })
  })

  it('rechazada invita a escribir', () => {
    expect(statusBanner({ ...base, status: 'rejected' })?.text).toBe('Esta cotización fue rechazada. Si cambias de opinión, escríbele a MEGAGLASS.')
  })

  it('borrador no se puede aceptar en línea', () => {
    expect(statusBanner({ ...base, status: 'draft' })?.tone).toBe('neutral')
  })
})
