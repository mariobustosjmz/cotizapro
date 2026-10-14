import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  routeContext: vi.fn(),
  runContext: vi.fn(),
  openAiRun: vi.fn(),
  loadFacts: vi.fn(),
  call: vi.fn(),
  execute: vi.fn(),
}))

vi.mock('@/lib/ai/route-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/route-context')>('@/lib/ai/route-context')
  return { ...actual, aiRouteContext: mocks.routeContext, aiRunContext: mocks.runContext }
})
vi.mock('@/lib/ai/run', () => ({ openAiRun: mocks.openAiRun }))
vi.mock('@/lib/ai/showcase-texts', () => ({ loadShowcaseFacts: mocks.loadFacts, showcaseTextsCall: mocks.call }))

import { AiError } from '@/lib/ai/errors'
import { POST } from './route'

const deps = { marker: 'deps' }
const member = { supabase: { marker: 'db' }, organizationId: 'o1', userId: 'u1', role: 'owner' }
const context = { ok: true, member, org: { name: 'MEGAGLASS', trade: 'glass' }, runtime: { deps } }
const post = () => POST(new NextRequest('http://localhost/api/ai/showcase-texts', { method: 'POST' }))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.routeContext.mockResolvedValue(context)
  mocks.runContext.mockReturnValue({ ctx: true })
  mocks.loadFacts.mockResolvedValue({ facts: true })
  mocks.call.mockReturnValue('call')
  mocks.execute.mockResolvedValue({ headline: 'Frase', bio: 'Descripción' })
  mocks.openAiRun.mockResolvedValue({ execute: mocks.execute })
})

describe('POST /api/ai/showcase-texts', () => {
  it.each([401, 402, 403, 429])('devuelve %s de la ruta sin reservar', async (status) => {
    mocks.routeContext.mockResolvedValue({ ok: false, response: NextResponse.json({}, { status }) })
    const res = await post()
    expect(res.status).toBe(status)
    expect(mocks.loadFacts).not.toHaveBeenCalled()
    expect(mocks.openAiRun).not.toHaveBeenCalled()
  })

  it('pide solo propietario y administrador', async () => {
    await post()
    expect(mocks.routeContext.mock.calls[0]?.[1]).toEqual(['owner', 'admin'])
  })

  it('arma la llamada antes de reservar y ejecuta apenas se reserva', async () => {
    const order: string[] = []
    mocks.call.mockImplementation(() => (order.push('call'), 'call'))
    mocks.openAiRun.mockImplementation(async () => (order.push('open'), { execute: mocks.execute }))
    mocks.execute.mockImplementation(async () => (order.push('execute'), { headline: 'Frase', bio: 'Descripción' }))
    const res = await post()
    expect(order).toEqual(['call', 'open', 'execute'])
    expect(mocks.openAiRun).toHaveBeenCalledWith('showcase_texts', { ctx: true }, deps)
    expect(mocks.loadFacts).toHaveBeenCalledWith(member.supabase, 'o1', 'MEGAGLASS')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { headline: 'Frase', bio: 'Descripción' } })
  })

  it('un error de la reserva (402) llega con su estado y no ejecuta', async () => {
    mocks.openAiRun.mockRejectedValue(new AiError('quota_exceeded'))
    const res = await post()
    expect(res.status).toBe(402)
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  it('una salida inválida es 502', async () => {
    mocks.execute.mockRejectedValue(new AiError('invalid_output'))
    expect((await post()).status).toBe(502)
  })

  it('si falla la carga de datos no se reserva nada', async () => {
    mocks.loadFacts.mockRejectedValue(new Error('db'))
    const res = await post()
    expect(res.status).toBeGreaterThanOrEqual(500)
    expect(mocks.openAiRun).not.toHaveBeenCalled()
  })
})
