import { describe, expect, it } from 'vitest'
import { INVITE_TOKEN_PATTERN, invitationRpcError } from './invitation-errors'

describe('invitationRpcError', () => {
  it('explica cada rechazo de accept_invitation', () => {
    expect(invitationRpcError('email_mismatch')).toMatchObject({ status: 403 })
    expect(invitationRpcError('email_mismatch').error).toContain('otro correo')
    expect(invitationRpcError('already_member').status).toBe(400)
    expect(invitationRpcError('invalid_invitation').status).toBe(400)
    expect(invitationRpcError('not_authenticated').status).toBe(401)
  })

  it('no filtra errores desconocidos', () => {
    expect(invitationRpcError('relation "x" does not exist')).toEqual({ status: 500, error: 'No se pudo aceptar la invitación' })
  })
})

describe('INVITE_TOKEN_PATTERN', () => {
  it('acepta solo 64 caracteres hexadecimales', () => {
    expect(INVITE_TOKEN_PATTERN.test('a'.repeat(64))).toBe(true)
    expect(INVITE_TOKEN_PATTERN.test('a'.repeat(63))).toBe(false)
    expect(INVITE_TOKEN_PATTERN.test('../../etc')).toBe(false)
  })
})
