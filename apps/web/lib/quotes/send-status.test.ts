import { describe, expect, it } from 'vitest'
import { sendOutcome, shouldUpdateStatus, statusAfterSend } from './send-status'

describe('statusAfterSend', () => {
  it.each([
    ['draft', 'sent'],
    ['rejected', 'sent'],
    ['expired', 'sent'],
    ['sent', 'sent'],
    ['viewed', 'viewed'],
    ['accepted', 'accepted'],
    ['en_instalacion', 'en_instalacion'],
    ['completado', 'completado'],
    ['cobrado', 'cobrado'],
  ])('al reenviar %s queda %s', (current, expected) => {
    expect(statusAfterSend(current)).toBe(expected)
  })
})

describe('shouldUpdateStatus', () => {
  it.each(['accepted', 'en_instalacion', 'completado', 'cobrado'])('%s no se actualiza', (s) => {
    expect(shouldUpdateStatus(s)).toBe(false)
  })
  it.each(['draft', 'sent', 'viewed', 'rejected', 'expired'])('%s se actualiza', (s) => {
    expect(shouldUpdateStatus(s)).toBe(true)
  })
})

describe('sendOutcome', () => {
  it('solo correo y falla: 502 sin marcar', () => {
    expect(sendOutcome({ emailRequested: true, emailOk: false, whatsappRequested: false, whatsappOk: false })).toEqual({ httpStatus: 502, markSent: false })
  })
  it('correo falla y whatsapp listo: 200 y marca', () => {
    expect(sendOutcome({ emailRequested: true, emailOk: false, whatsappRequested: true, whatsappOk: true })).toEqual({ httpStatus: 200, markSent: true })
  })
  it('solo whatsapp: 200 y marca', () => {
    expect(sendOutcome({ emailRequested: false, emailOk: false, whatsappRequested: true, whatsappOk: true })).toEqual({ httpStatus: 200, markSent: true })
  })
  it('solo correo exitoso: 200 y marca', () => {
    expect(sendOutcome({ emailRequested: true, emailOk: true, whatsappRequested: false, whatsappOk: false })).toEqual({ httpStatus: 200, markSent: true })
  })
})
