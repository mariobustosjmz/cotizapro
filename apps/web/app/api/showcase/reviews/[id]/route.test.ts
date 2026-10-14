import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireWritable: vi.fn(), revalidate: vi.fn(), maybeSingle: vi.fn(), update: vi.fn(), eqs: [] as Array<[string, unknown]> }))

vi.mock('@/lib/billing/require-writable-member', () => ({ requireWritableMember: mocks.requireWritable }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

import { PATCH } from './route'

const ID = '00000000-0000-0000-00c0-000000000501'
const chain: Record<string, unknown> = {}
chain.update = vi.fn((values: unknown) => (mocks.update(values), chain))
chain.eq = vi.fn((col: string, val: unknown) => (mocks.eqs.push([col, val]), chain))
chain.select = vi.fn(() => chain)
chain.maybeSingle = mocks.maybeSingle
const member = { supabase: { from: vi.fn(() => chain) }, organizationId: 'org-1', userId: 'u1', role: 'owner' }

const patch = (body: unknown, id = ID) =>
  PATCH(new NextRequest(`http://localhost/api/showcase/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), {
    params: Promise.resolve({ id }),
  })

beforeEach(() => {
  mocks.requireWritable.mockReset()
  mocks.update.mockReset()
  mocks.maybeSingle.mockReset()
  mocks.revalidate.mockReset()
  mocks.eqs.length = 0
  mocks.requireWritable.mockResolvedValue({ ok: true, ctx: member })
  mocks.maybeSingle.mockResolvedValue({ data: { id: ID, owner_reply: 'Gracias' }, error: null })
})

describe('PATCH /api/showcase/reviews/[id]', () => {
  it.each([401, 402, 403])('devuelve %s de la autenticación sin tocar la base', async (status) => {
    mocks.requireWritable.mockResolvedValue({ ok: false, response: NextResponse.json({}, { status }) })
    expect((await patch({ owner_reply: 'x' })).status).toBe(status)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('pide solo propietario y administrador', async () => {
    await patch({ owner_reply: 'Gracias' })
    expect(mocks.requireWritable).toHaveBeenCalledWith(['owner', 'admin'])
  })

  it('un id que no es guid regresa 400 sin consultar', async () => {
    const res = await patch({ owner_reply: 'x' }, 'no-es-guid')
    expect(res.status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rechaza más de 1000 caracteres con fieldErrors en español', async () => {
    const res = await patch({ owner_reply: 'a'.repeat(1001) })
    expect(res.status).toBe(400)
    expect((await res.json()).fieldErrors.owner_reply).toBe('Máximo 1,000 caracteres')
  })

  it('rechaza un cuerpo sin owner_reply', async () => {
    expect((await patch({})).status).toBe(400)
  })

  it('actualiza filtrando por empresa e id y recorta espacios', async () => {
    const res = await patch({ owner_reply: '  Gracias  ' })
    expect(res.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({ owner_reply: 'Gracias' })
    expect(mocks.eqs).toEqual(expect.arrayContaining([['id', ID], ['organization_id', 'org-1']]))
    expect(await res.json()).toEqual({ data: { id: ID, owner_reply: 'Gracias' } })
    expect(mocks.revalidate).toHaveBeenCalled()
  })

  it('una cadena vacía borra la respuesta (null)', async () => {
    await patch({ owner_reply: '   ' })
    expect(mocks.update).toHaveBeenCalledWith({ owner_reply: null })
  })

  it('0 filas (otra empresa o inexistente) regresa 404', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    const res = await patch({ owner_reply: 'Gracias' })
    expect(res.status).toBe(404)
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })

  it('un error de la base regresa 500 sin filtrar detalles', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom secret' } })
    const res = await patch({ owner_reply: 'Gracias' })
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
  })
})
