import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MemberResult } from '@/lib/auth/require-member'

const requireMember = vi.fn<(allowed?: readonly string[]) => Promise<MemberResult>>()
const assertWritable = vi.fn()

vi.mock('@/lib/auth/require-member', () => ({ requireMember: (allowed?: readonly string[]) => requireMember(allowed) }))
vi.mock('./writable', () => ({ assertWritable: (client: unknown) => assertWritable(client) }))

const { requireWritableMember } = await import('./require-writable-member')

describe('requireWritableMember', () => {
  beforeEach(() => {
    requireMember.mockReset()
    assertWritable.mockReset()
  })

  it('no consulta el plan si la autenticación falla', async () => {
    const denied: MemberResult = { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
    requireMember.mockResolvedValue(denied)
    const result = await requireWritableMember()
    expect(result).toBe(denied)
    expect(assertWritable).not.toHaveBeenCalled()
  })

  it('convierte un miembro válido con plan vencido en la respuesta 402', async () => {
    const ok = { ok: true, ctx: { supabase: {} } } as unknown as MemberResult
    const blocked = NextResponse.json({ code: 'PLAN_EXPIRED' }, { status: 402 })
    requireMember.mockResolvedValue(ok)
    assertWritable.mockResolvedValue(blocked)
    const result = await requireWritableMember(['owner'])
    expect(requireMember).toHaveBeenCalledWith(['owner'])
    expect(result).toEqual({ ok: false, response: blocked })
  })

  it('regresa el mismo contexto cuando puede escribir', async () => {
    const ok = { ok: true, ctx: { supabase: {} } } as unknown as MemberResult
    requireMember.mockResolvedValue(ok)
    assertWritable.mockResolvedValue(null)
    expect(await requireWritableMember()).toBe(ok)
  })
})
