import { describe, expect, it } from 'vitest'
import { memberRpcError } from './member-errors'

describe('memberRpcError', () => {
  it('mapea las excepciones conocidas al estado HTTP', () => {
    expect(memberRpcError('forbidden').status).toBe(403)
    expect(memberRpcError('not_found').status).toBe(404)
    expect(memberRpcError('owner_protected').status).toBe(400)
    expect(memberRpcError('owner_only').status).toBe(403)
  })

  it('no filtra mensajes desconocidos de la base', () => {
    expect(memberRpcError('duplicate key value violates unique constraint')).toEqual({ status: 500, error: 'Error interno del servidor' })
    expect(memberRpcError(undefined).status).toBe(500)
  })
})
