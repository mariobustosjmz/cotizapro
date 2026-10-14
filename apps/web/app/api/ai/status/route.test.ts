import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ warn: vi.fn(), requireMember: vi.fn(), requireWritableMember: vi.fn(), limiter: vi.fn(), runtime: vi.fn(), summary: vi.fn() }))

vi.mock('@/lib/auth/require-member', () => ({ requireMember: mocks.requireMember }))
vi.mock('@/lib/billing/require-writable-member', () => ({ requireWritableMember: mocks.requireWritableMember }))
vi.mock('@/lib/rate-limit', () => ({ defaultApiLimiter: mocks.limiter, applyRateLimit: () => new Response(null, { status: 429 }) }))
vi.mock('@/lib/ai/runtime', () => ({ aiRuntime: mocks.runtime }))
vi.mock('@/lib/ai/usage', () => ({ getUsageSummary: mocks.summary }))

vi.mock("@/lib/logger", () => ({ logger: { warn: mocks.warn, error: vi.fn(), info: vi.fn() } }))

import { GET } from './route'

const request = () => new NextRequest('http://localhost/api/ai/status')
const summary = { used: 0, allowance: 400, remaining: 400, enforced: true }

beforeEach(() => {
  vi.resetAllMocks()
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("cotizapro.aiLimitsMismatchLogged")]
  mocks.limiter.mockReturnValue({ limited: false, remaining: 9, resetTime: 0 })
  mocks.requireMember.mockResolvedValue({ ok: true, ctx: { supabase: {}, organizationId: 'o1' } })
  mocks.runtime.mockReturnValue({ config: { limitsEnforced: true }, health: { isAvailable: async () => true } })
  mocks.summary.mockResolvedValue(summary)
})

describe('GET /api/ai/status', () => {
  it('responde disponibilidad y resumen', async () => {
    const res = await GET(request())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { available: true, summary } })
  })

  it('responde available:false si el host no responde', async () => {
    mocks.runtime.mockReturnValue({ config: { limitsEnforced: true }, health: { isAvailable: async () => false } })
    const res = await GET(request())
    expect((await res.json()).data.available).toBe(false)
  })

  it('usa requireMember, no la versión de escritura: una empresa de solo lectura puede consultar', async () => {
    await GET(request())
    expect(mocks.requireMember).toHaveBeenCalled()
    expect(mocks.requireWritableMember).not.toHaveBeenCalled()
  })

  it('devuelve 401 sin sesión', async () => {
    mocks.requireMember.mockResolvedValue({ ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) })
    expect((await GET(request())).status).toBe(401)
  })

  it("devuelve exactamente 503 sin detalles internos si falla el resumen", async () => {
    mocks.summary.mockRejectedValue(new Error("rpc down"))
    const res = await GET(request())
    expect(res.status).toBe(503)
    expect(JSON.stringify(await res.json())).not.toContain("rpc down")
  })

  it("con configuración inválida responde 200 available:false y conserva el resumen", async () => {
    mocks.runtime.mockImplementation(() => {
      throw new Error("Configuración de IA inválida: AI_TIMEOUT_MS")
    })
    const res = await GET(request())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { available: false, summary } })
  })

  it("avisa una sola vez por proceso si AI_LIMITS_ENFORCED no coincide con la base", async () => {
    mocks.summary.mockResolvedValue({ ...summary, enforced: false })
    await GET(request())
    await GET(request())
    await GET(request())
    expect(mocks.warn).toHaveBeenCalledTimes(1)
  })
})
