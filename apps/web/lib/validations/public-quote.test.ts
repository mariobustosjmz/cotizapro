import { describe, expect, it } from 'vitest'
import { respondPublicQuoteSchema } from './public-quote'

describe('respondPublicQuoteSchema', () => {
  it('acepta aceptar sin nombre', () => {
    expect(respondPublicQuoteSchema.parse({ action: 'accept' })).toEqual({ action: 'accept' })
  })

  it('recorta nombre y motivo', () => {
    expect(respondPublicQuoteSchema.parse({ action: 'reject', reason: '  Muy caro  ', name: ' Laura ' })).toEqual({
      action: 'reject', reason: 'Muy caro', name: 'Laura',
    })
  })

  it('rechaza acciones desconocidas', () => {
    expect(respondPublicQuoteSchema.safeParse({ action: 'delete' }).success).toBe(false)
  })

  it('limita el nombre a 120 y el motivo a 500 caracteres', () => {
    expect(respondPublicQuoteSchema.safeParse({ action: 'accept', name: 'x'.repeat(121) }).success).toBe(false)
    expect(respondPublicQuoteSchema.safeParse({ action: 'reject', reason: 'x'.repeat(501) }).success).toBe(false)
  })
})
