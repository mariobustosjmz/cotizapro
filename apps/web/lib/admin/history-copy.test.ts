import { describe, expect, it } from 'vitest'
import { describeActivation } from './history-copy'
import type { PlanActivationRow } from './types'

const base: PlanActivationRow = {
  id: 'a1',
  action: 'activate',
  previous_plan: 'pro',
  new_plan: 'pro',
  users_billed: 1,
  months: 1,
  amount: '999.00',
  reference: 'MP-1',
  reason: null,
  period_start: '2026-10-13T15:00:00Z',
  period_end: '2026-11-13T15:00:00Z',
  activated_by_email: 'operador@example.test',
  created_at: '2026-10-13T15:00:00Z',
}

describe('describeActivation', () => {
  it('describe una activación con meses, monto y vencimiento', () => {
    const text = describeActivation(base)
    expect(text).toContain('Taller → Taller')
    expect(text).toContain('1 mes')
    expect(text).toContain('$999')
    expect(text).toContain('hasta el 13 de noviembre de 2026')
  })

  it('usa plural y marca Gratis sin vencimiento', () => {
    expect(describeActivation({ ...base, months: 3 })).toContain('3 meses')
    expect(describeActivation({ ...base, new_plan: 'free', months: null, amount: 0, period_end: null })).toBe('Taller → Gratis · sin vencimiento')
  })

  it('describe una suspensión con su motivo', () => {
    expect(describeActivation({ ...base, action: 'suspend', reason: 'Pago rechazado' })).toBe('Suspensión: Pago rechazado')
  })
})
