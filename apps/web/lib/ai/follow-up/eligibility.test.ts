import { describe, expect, it } from 'vitest'
import { daysSinceSent, followUpCutoff, isFollowUpEligible } from './eligibility'

const NOW = new Date('2026-10-13T18:00:00Z')

describe('elegibilidad de seguimiento', () => {
  it('cuenta días completos desde el envío', () => {
    expect(daysSinceSent('2026-10-08T17:00:00Z', NOW)).toBe(5)
    expect(daysSinceSent(null, NOW)).toBeNull()
    expect(daysSinceSent('no-es-fecha', NOW)).toBeNull()
  })

  it('solo enviadas o vistas con más de 48 horas', () => {
    expect(isFollowUpEligible('sent', '2026-10-11T17:59:00Z', NOW)).toBe(true)
    expect(isFollowUpEligible('viewed', '2026-10-11T18:00:00Z', NOW)).toBe(false)
    expect(isFollowUpEligible('accepted', '2026-10-01T00:00:00Z', NOW)).toBe(false)
    expect(isFollowUpEligible('sent', null, NOW)).toBe(false)
  })

  it('el corte para la lista es 48 horas antes', () => {
    expect(followUpCutoff(NOW)).toBe('2026-10-11T18:00:00.000Z')
  })
})
