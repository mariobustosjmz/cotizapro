import { describe, expect, it } from 'vitest'
import { resolveRecipients } from './send-recipients'

const client = (over: Partial<{ email: string | null; phone: string | null; whatsapp_phone: string | null }> = {}) => ({
  client: { email: 'a@b.mx', phone: '8112345678', whatsapp_phone: null, ...over },
})

describe('resolveRecipients', () => {
  it('usa los datos del cliente', () => {
    expect(resolveRecipients(['email', 'whatsapp'], client(), {})).toEqual({ ok: true, value: { email: 'a@b.mx', whatsapp: '8112345678' } })
  })
  it('prefiere los overrides', () => {
    const r = resolveRecipients(['email', 'whatsapp'], client(), { email: 'x@y.mx', whatsapp: '8199999999' })
    expect(r).toEqual({ ok: true, value: { email: 'x@y.mx', whatsapp: '8199999999' } })
  })
  it('sin email y sin override falla', () => {
    const r = resolveRecipients(['email'], client({ email: null }), {})
    expect(r.ok).toBe(false)
  })
  it('telefono invalido falla', () => {
    const r = resolveRecipients(['whatsapp'], client({ phone: '123' }), {})
    expect(r.ok).toBe(false)
  })
  it('sin telefono falla', () => {
    expect(resolveRecipients(['whatsapp'], client({ phone: null }), {}).ok).toBe(false)
  })
  it('solo valida los canales solicitados', () => {
    expect(resolveRecipients(['whatsapp'], client({ email: null }), {}).ok).toBe(true)
  })
})
