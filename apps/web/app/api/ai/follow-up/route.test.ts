import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  routeContext: vi.fn(),
  runContext: vi.fn(),
  openAiRun: vi.fn(),
  textCall: vi.fn(),
  execute: vi.fn(),
  loadFacts: vi.fn(),
}))

vi.mock('@/lib/ai/route-context', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/route-context')>('@/lib/ai/route-context')
  return { ...actual, aiRouteContext: mocks.routeContext, aiRunContext: mocks.runContext }
})
vi.mock('@/lib/ai/run', () => ({ openAiRun: mocks.openAiRun, textCall: mocks.textCall }))
vi.mock('@/lib/ai/follow-up/load-facts', () => ({ loadFollowUpFacts: mocks.loadFacts }))

import { POST } from './route'

const QUOTE_ID = '00000000-0000-0000-00c0-000000000101'
const deps = { marker: 'deps' }
const member = { supabase: { rls: true }, organizationId: 'o1', userId: 'u1', role: 'owner' }
const context = { ok: true, member, org: { name: 'MEGAGLASS', trade: 'glass' }, runtime: { deps } }
const facts = {
  quoteId: QUOTE_ID,
  quoteNumber: 'MG-0007',
  status: 'sent',
  sentAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  validUntil: null,
  clientName: 'Laura Treviño',
  itemSummaries: ['Cancel de baño'],
}
const post = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/ai/follow-up', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.routeContext.mockResolvedValue(context)
  mocks.runContext.mockReturnValue({ ctx: true })
  mocks.loadFacts.mockResolvedValue(facts)
  mocks.execute.mockResolvedValue('Hola Laura')
  mocks.openAiRun.mockResolvedValue({ execute: mocks.execute })
  mocks.textCall.mockReturnValue('call')
})

describe('POST /api/ai/follow-up', () => {
  it.each([401, 402, 403, 429])('devuelve %s de la ruta sin cargar ni reservar', async (status) => {
    mocks.routeContext.mockResolvedValue({ ok: false, response: NextResponse.json({}, { status }) })
    const res = await post({ quoteId: QUOTE_ID })
    expect(res.status).toBe(status)
    expect(mocks.loadFacts).not.toHaveBeenCalled()
    expect(mocks.openAiRun).not.toHaveBeenCalled()
  })

  it('pide los roles de edición', async () => {
    await post({ quoteId: QUOTE_ID })
    expect(mocks.routeContext.mock.calls[0]?.[1]).toEqual(['owner', 'admin', 'member'])
  })

  it.each([{ quoteId: 'no-es-guid' }, {}, { quoteId: 123 }])('400 con quoteId inválido %j sin consultar ni reservar', async (body) => {
    const res = await post(body)
    expect(res.status).toBe(400)
    expect(mocks.loadFacts).not.toHaveBeenCalled()
    expect(mocks.openAiRun).not.toHaveBeenCalled()
  })

  it('un cuerpo que no es JSON es 400', async () => {
    expect((await post('no-json{')).status).toBe(400)
    expect(mocks.openAiRun).not.toHaveBeenCalled()
  })

  it('carga la cotización con el cliente RLS del usuario y su empresa', async () => {
    await post({ quoteId: QUOTE_ID })
    expect(mocks.loadFacts).toHaveBeenCalledWith(member.supabase, 'o1', QUOTE_ID)
  })

  it('una cotización de otra empresa es 404 y no gasta créditos', async () => {
    mocks.loadFacts.mockResolvedValue(null)
    const res = await post({ quoteId: QUOTE_ID })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: 'not_found' })
    expect(mocks.openAiRun).not.toHaveBeenCalled()
  })

  it('un error de base de datos al cargar es 503 unavailable, no 404, y no reserva', async () => {
    const { AiError } = await import('@/lib/ai/errors')
    mocks.loadFacts.mockRejectedValue(new AiError('unavailable', 'db_error'))
    const res = await post({ quoteId: QUOTE_ID })
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ code: 'unavailable' })
    expect(mocks.openAiRun).not.toHaveBeenCalled()
  })

  it.each([
    ['borrador', { status: 'draft' }],
    ['aceptada', { status: 'accepted' }],
    ['sin fecha de envío', { sentAt: null }],
    ['enviada hace menos de 48 h', { sentAt: new Date(Date.now() - 3_600_000).toISOString() }],
  ])('%s responde 409 not_eligible antes de reservar', async (_name, patch) => {
    mocks.loadFacts.mockResolvedValue({ ...facts, ...patch })
    const res = await post({ quoteId: QUOTE_ID })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'not_eligible' })
    expect(mocks.openAiRun).not.toHaveBeenCalled()
  })

  it('ejecuta la llamada apenas se reserva, con los datos como dato', async () => {
    const res = await post({ quoteId: QUOTE_ID })
    expect(mocks.openAiRun).toHaveBeenCalledWith('follow_up', { ctx: true }, deps)
    expect(await res.text()).toContain('"done":true')
    expect(mocks.execute).toHaveBeenCalledWith('call')
    const messages = mocks.textCall.mock.calls[0]?.[2] as readonly { role: string; content: string }[]
    expect(messages[1]?.content).toContain('<dato>\nCliente: Laura Treviño')
    expect(messages[1]?.content).not.toMatch(/@/)
  })

  it('arma los mensajes antes de reservar: si fallan no queda nada retenido', async () => {
    mocks.textCall.mockImplementation(() => {
      throw new Error('boom')
    })
    const res = await post({ quoteId: QUOTE_ID })
    expect(res.status).toBeGreaterThanOrEqual(500)
    expect(mocks.openAiRun).not.toHaveBeenCalled()
  })

  it('un 402 de cuota al reservar llega como JSON con su estado', async () => {
    const { AiError } = await import('@/lib/ai/errors')
    mocks.openAiRun.mockRejectedValue(new AiError('quota_exceeded'))
    expect((await post({ quoteId: QUOTE_ID })).status).toBe(402)
  })
})
