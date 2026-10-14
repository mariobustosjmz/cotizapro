import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireWritableMember: vi.fn(),
  limiter: vi.fn(),
  runtime: vi.fn(),
}))

vi.mock('@/lib/billing/require-writable-member', () => ({ requireWritableMember: mocks.requireWritableMember }))
vi.mock('@/lib/auth/require-member', () => ({ requireMember: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ defaultApiLimiter: mocks.limiter, applyRateLimit: () => new Response(null, { status: 429 }) }))
vi.mock('./runtime', () => ({ aiRuntime: mocks.runtime }))

import { aiRouteContext, aiRunContext } from './route-context'

const request = () => new NextRequest('http://localhost/api/ai/x', { method: 'POST' })
const single = vi.fn()
const supabase = { from: () => ({ select: () => ({ eq: () => ({ single }) }) }) }
const member = { supabase, userId: 'u1', organizationId: 'o1', role: 'owner' as const }

function runtimeWith(available: boolean) {
  return { config: {}, health: { isAvailable: vi.fn(async () => available) }, deps: {} }
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.limiter.mockReturnValue({ limited: false, remaining: 9, resetTime: 0 })
  mocks.requireWritableMember.mockResolvedValue({ ok: true, ctx: member })
  mocks.runtime.mockReturnValue(runtimeWith(true))
  single.mockResolvedValue({ data: { name: 'Vidriería', trade: 'vidrio' } })
})

describe('aiRouteContext', () => {
  it('usa requireWritableMember con los roles pedidos', async () => {
    const result = await aiRouteContext(request(), ['owner', 'admin'])
    expect(mocks.requireWritableMember).toHaveBeenCalledWith(['owner', 'admin'])
    expect(result).toMatchObject({ ok: true, org: { name: 'Vidriería', trade: 'vidrio' } })
  })

  it('devuelve 402 de solo lectura antes de consultar disponibilidad o la organización', async () => {
    const blocked = NextResponse.json({ code: 'PLAN_EXPIRED' }, { status: 402 })
    mocks.requireWritableMember.mockResolvedValue({ ok: false, response: blocked })
    const result = await aiRouteContext(request())
    expect(result).toEqual({ ok: false, response: blocked })
    expect(mocks.runtime).not.toHaveBeenCalled()
    expect(single).not.toHaveBeenCalled()
  })

  it('devuelve 401/403 de la autenticación sin tocar nada más', async () => {
    const denied = NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    mocks.requireWritableMember.mockResolvedValue({ ok: false, response: denied })
    const result = await aiRouteContext(request())
    expect(result.ok === false && result.response.status).toBe(401)
    expect(mocks.runtime).not.toHaveBeenCalled()
  })

  it('responde 429 si el limitador lo pide, antes de autenticar', async () => {
    mocks.limiter.mockReturnValue({ limited: true, remaining: 0, resetTime: 1 })
    const result = await aiRouteContext(request())
    expect(result.ok === false && result.response.status).toBe(429)
    expect(mocks.requireWritableMember).not.toHaveBeenCalled()
  })

  it('responde 503 si la IA no está disponible', async () => {
    mocks.runtime.mockReturnValue(runtimeWith(false))
    const result = await aiRouteContext(request())
    expect(result.ok === false && result.response.status).toBe(503)
    expect(single).not.toHaveBeenCalled()
  })

  it('responde 503 si la configuración es inválida', async () => {
    mocks.runtime.mockImplementation(() => {
      throw new Error('Configuración de IA inválida: AI_TIMEOUT_MS')
    })
    const result = await aiRouteContext(request())
    expect(result.ok === false && result.response.status).toBe(503)
  })

  it('usa un nombre genérico si no hay datos de la organización', async () => {
    single.mockResolvedValue({ data: null })
    const result = await aiRouteContext(request())
    expect(result).toMatchObject({ ok: true, org: { name: 'tu negocio', trade: null } })
  })
})

describe('aiRunContext', () => {
  it('combina la señal de la petición con la del controlador', () => {
    const abort = new AbortController()
    const ctx = aiRunContext(member as never, request(), abort)
    expect(ctx.signal?.aborted).toBe(false)
    abort.abort()
    expect(ctx.signal?.aborted).toBe(true)
    expect(ctx.organizationId).toBe('o1')
  })

  it("propaga el aborto de la petición, con y sin el controlador explícito", () => {
    for (const withAbort of [false, true]) {
      const own = new AbortController()
      const req = new NextRequest("http://localhost/api/ai/x", { method: "POST", signal: own.signal })
      const ctx = aiRunContext(member as never, req, withAbort ? new AbortController() : undefined)
      expect(ctx.signal?.aborted).toBe(false)
      own.abort()
      expect(ctx.signal?.aborted).toBe(true)
    }
  })
})
