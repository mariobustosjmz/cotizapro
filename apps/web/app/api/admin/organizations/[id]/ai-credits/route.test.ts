import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ limiter: vi.fn(), requireAdmin: vi.fn(), rpc: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), security: vi.fn() }))

vi.mock('@/lib/rate-limit', () => ({ defaultApiLimiter: mocks.limiter, applyRateLimit: () => new Response(null, { status: 429 }) }))
vi.mock('@/lib/admin/require-platform-admin', () => ({
  requirePlatformAdmin: mocks.requireAdmin,
  notFoundResponse: () => NextResponse.json({ error: 'No encontrado' }, { status: 404 }),
}))
vi.mock('@/lib/logger', () => ({ logger: { info: mocks.info, warn: mocks.warn, error: mocks.error, security: mocks.security } }))

import { GET, POST } from './route'

const ORG = '00000000-0000-0000-00c0-000000000003'
const ctx = (id: string = ORG) => ({ params: Promise.resolve({ id }) })
const post = (body: unknown) => new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
const get = () => new NextRequest('http://localhost/x')
const SUMMARY = { used: 0, allowance: 400, pack_credits: 0, remaining: 400, percent: 0, resets_on: '2026-11-01', enforced: true, by_feature: [], packs: [] }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.limiter.mockReturnValue({ limited: false, remaining: 9, resetTime: 0 })
  mocks.requireAdmin.mockResolvedValue({ ok: true, supabase: { rpc: mocks.rpc }, userId: 'admin-1' })
})

describe('/api/admin/organizations/[id]/ai-credits', () => {
  it('limita por tasa antes de autenticar', async () => {
    mocks.limiter.mockReturnValue({ limited: true, remaining: 0, resetTime: 0 })
    expect((await GET(get(), ctx())).status).toBe(429)
    expect(mocks.requireAdmin).not.toHaveBeenCalled()
  })

  it('niega a quien no es superadmin (GET y POST)', async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: false, response: NextResponse.json({ error: 'No encontrado' }, { status: 404 }) })
    expect((await GET(get(), ctx())).status).toBe(404)
    expect((await POST(post({ credits: 200, source: 'pack', reference: 'MP-1' }), ctx())).status).toBe(404)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('rechaza un id que no es guid', async () => {
    expect((await GET(get(), ctx('nope'))).status).toBe(404)
    expect((await POST(post({ credits: 200, source: 'pack' }), ctx('nope'))).status).toBe(404)
  })

  it('GET devuelve el uso', async () => {
    mocks.rpc.mockResolvedValue({ data: SUMMARY, error: null })
    const res = await GET(get(), ctx())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: SUMMARY })
  })

  it('POST valida el cuerpo con fieldErrors en español', async () => {
    const res = await POST(post({ credits: 0, source: 'regalo' }), ctx())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.fieldErrors.credits).toBe('Los créditos deben ser entre 1 y 100,000')
    expect(body.fieldErrors.source).toBeTruthy()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('POST agrega créditos y registra solo códigos', async () => {
    mocks.rpc.mockResolvedValue({ data: 'grant-1', error: null })
    const res = await POST(post({ credits: 200, source: 'pack', reference: 'MP-1' }), ctx())
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ data: { grantId: 'grant-1' } })
    expect(mocks.rpc).toHaveBeenCalledWith('admin_grant_ai_credits', { p_org: ORG, p_credits: 200, p_source: 'pack', p_reference: 'MP-1' })
    expect(JSON.stringify(mocks.security.mock.calls)).not.toContain('MP-1')
  })

  it('POST mapea organization_not_found a 404', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'organization_not_found' } })
    const res = await POST(post({ credits: 200, source: 'courtesy' }), ctx())
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Empresa no encontrada')
  })

  it('POST mapea la referencia duplicada a 409', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'ai_duplicate_reference' } })
    const res = await POST(post({ credits: 200, source: 'pack', reference: 'MP-1' }), ctx())
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('Ese pago ya se acreditó')
  })

  it('POST exige referencia en paquetes', async () => {
    const res = await POST(post({ credits: 200, source: 'pack' }), ctx())
    expect(res.status).toBe(400)
    expect((await res.json()).fieldErrors.reference).toBe('Escribe la referencia del pago')
  })

  it('GET de una empresa inexistente responde 404', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'organization_not_found' } })
    expect((await GET(get(), ctx())).status).toBe(404)
  })

  it('POST responde 500 genérico y no filtra el detalle', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'relation ai_credit_grants broken', code: 'XX000' } })
    const res = await POST(post({ credits: 200, source: 'pack', reference: 'MP-1' }), ctx())
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('relation')
    expect(JSON.stringify(mocks.error.mock.calls)).not.toContain('relation')
    expect(mocks.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ organizationId: ORG, adminId: 'admin-1', code: 'XX000' }))
  })
})
