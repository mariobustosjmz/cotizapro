import { describe, expect, it } from 'vitest'
import { PLAN_ORDER, PLANS, UPCOMING_FEATURES } from './catalog'

describe('créditos de IA en el catálogo de planes', () => {
  it('cada plan anuncia sus créditos mensuales', () => {
    for (const id of PLAN_ORDER) {
      const label = `${PLANS[id].aiCreditsMonthly.toLocaleString('es-MX')} créditos de IA al mes`
      expect(PLANS[id].features).toContain(label)
    }
  })

  it('la IA ya no aparece como próximamente', () => {
    expect(UPCOMING_FEATURES.some((feature) => feature.includes('IA'))).toBe(false)
  })
})
