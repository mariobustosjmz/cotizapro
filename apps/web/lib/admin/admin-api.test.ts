import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchActivations, postAdminAction } from './admin-api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('postAdminAction', () => {
  it('manda JSON por POST y reporta éxito', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await postAdminAction('/api/admin/organizations/x/activate', { plan: 'pro' })).toEqual({ ok: true, error: null, fieldErrors: {} })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/organizations/x/activate',
      expect.objectContaining({ method: 'POST', body: '{"plan":"pro"}' }),
    )
  })

  it('regresa el mensaje y los errores por campo del servidor', async () => {
    const body = { error: 'Por favor verifica los datos ingresados.', fieldErrors: { reference: 'Escribe la referencia' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 400 })))
    expect(await postAdminAction('/x', {})).toEqual({ ok: false, ...body })
  })

  it('tolera respuestas sin JSON y errores de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 502 })))
    expect((await postAdminAction('/x', {})).error).toBe('No se pudo completar la acción')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))
    expect((await postAdminAction('/x', {})).error).toBe('Error de conexión. Intenta de nuevo.')
  })
})

describe('fetchActivations', () => {
  it('regresa las filas o null si falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'a' }] }), { status: 200 })))
    expect(await fetchActivations('org-1')).toEqual([{ id: 'a' }])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })))
    expect(await fetchActivations('org-1')).toBeNull()
  })
})
