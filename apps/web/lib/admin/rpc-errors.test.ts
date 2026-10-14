import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adminRpcError } from './rpc-errors'

describe('adminRpcError', () => {
  it('oculta la ruta a quien no es superadmin', () => {
    expect(adminRpcError('forbidden')).toEqual({ status: 404, error: 'No encontrado' })
  })

  it('traduce validaciones y conflictos', () => {
    expect(adminRpcError('invalid_months').status).toBe(400)
    expect(adminRpcError('org_not_found').status).toBe(404)
    expect(adminRpcError('free_plan_not_suspendable')).toEqual({ status: 409, error: 'El plan Gratis no vence; no se puede suspender' })
  })

  it('indica el campo del formulario de cada validación', () => {
    expect(adminRpcError('invalid_users').field).toBe('users')
    expect(adminRpcError('invalid_months').field).toBe('months')
    expect(adminRpcError('invalid_reference').field).toBe('reference')
    expect(adminRpcError('invalid_plan').field).toBe('plan')
    expect(adminRpcError('invalid_reason').field).toBe('reason')
    expect(adminRpcError('org_not_found').field).toBeUndefined()
  })

  it('responde 500 genérico con errores desconocidos', () => {
    expect(adminRpcError('connection reset')).toEqual({ status: 500, error: 'No se pudo completar la acción' })
    expect(adminRpcError(undefined).status).toBe(500)
    expect(adminRpcError('constructor')).toEqual({ status: 500, error: 'No se pudo completar la acción' })
  })

  it('traduce cada excepción de las RPC admin de la migración 042', () => {
    const sql = readFileSync(join(__dirname, '../../supabase/migrations/042_billing_superadmin.sql'), 'utf8')
    const adminBlocks = sql.split('CREATE OR REPLACE FUNCTION').filter((block) => /^\s*public\.admin_/.test(block))
    const codes = new Set(adminBlocks.flatMap((block) => [...block.matchAll(/RAISE EXCEPTION '([a-z_]+)'/g)].map((m) => m[1])))
    expect(codes.size).toBeGreaterThanOrEqual(9)
    for (const code of codes) expect(adminRpcError(code).status, code).not.toBe(500)
  })
})
