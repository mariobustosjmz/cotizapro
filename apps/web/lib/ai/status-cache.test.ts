import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAiStatus, invalidateAiStatus, toStatusView, UNAVAILABLE_STATUS } from './status-cache'

const BODY = { data: { available: true, summary: { remaining: 398, enforced: true, resets_on: '2026-11-01', percent: 0, used: 2 } } }

beforeEach(() => invalidateAiStatus())

describe('estado de IA en el navegador', () => {
  it('convierte la respuesta de /api/ai/status', () => {
    expect(toStatusView(BODY)).toEqual({ available: true, remaining: 398, enforced: true, resetsOn: '2026-11-01', percent: 0 })
    expect(toStatusView({ error: 'La IA no está disponible por ahora', code: 'unavailable' })).toEqual(UNAVAILABLE_STATUS)
  })

  it('comparte una sola petición entre todos los botones', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json(BODY))
    const [a, b] = await Promise.all([fetchAiStatus(fetchImpl), fetchAiStatus(fetchImpl)])
    expect(a).toEqual(b)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    invalidateAiStatus()
    await fetchAiStatus(fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('si la red falla reporta no disponible y vuelve a intentar la próxima vez', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError('offline')
    })
    expect(await fetchAiStatus(fetchImpl)).toEqual(UNAVAILABLE_STATUS)
    await fetchAiStatus(fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('una respuesta de error del servidor no se queda en caché', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ error: 'x', code: 'unavailable' }, { status: 503 }))
    expect(await fetchAiStatus(fetchImpl)).toEqual(UNAVAILABLE_STATUS)
    await fetchAiStatus(fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it("expira a los 30 s y vuelve a pedir", async () => {
    let clock = 1000
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json(BODY))
    await fetchAiStatus(fetchImpl, () => clock)
    clock += 29_000
    await fetchAiStatus(fetchImpl, () => clock)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    clock += 2_000
    await fetchAiStatus(fetchImpl, () => clock)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it("nunca cachea available:false", async () => {
    const down = { data: { available: false, summary: BODY.data.summary } }
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json(down))
    const first = await fetchAiStatus(fetchImpl)
    expect(first.available).toBe(false)
    await fetchAiStatus(fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
