import { describe, expect, it, vi } from 'vitest'
import type { AiConfig } from './config'
import { createAiHealth } from './health'

const config: AiConfig = { baseUrl: 'http://fake/v1', model: 'gemma3:4b', timeoutMs: 1000, keepAlive: '30m', limitsEnforced: true }

describe('createAiHealth', () => {
  it('está disponible si el modelo aparece en /models', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ data: [{ id: 'gemma3:4b' }] }))
    expect(await createAiHealth({ config, fetchImpl }).isAvailable()).toBe(true)
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('http://fake/v1/models')
  })

  it('manda una señal de tiempo límite de 3 segundos', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ data: [{ id: 'gemma3:4b' }] }))
    await createAiHealth({ config, fetchImpl }).isAvailable()
    expect(timeout).toHaveBeenCalledWith(3000)
    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
    timeout.mockRestore()
  })

  it('no está disponible si falta el modelo, hay error o no responde', async () => {
    const missing = vi.fn<typeof fetch>(async () => Response.json({ data: [{ id: 'llama3' }] }))
    const failing = vi.fn<typeof fetch>(async () => new Response('x', { status: 502 }))
    const garbage = vi.fn<typeof fetch>(async () => new Response('no es json', { status: 200 }))
    const offline = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed')
    })
    expect(await createAiHealth({ config, fetchImpl: missing }).isAvailable()).toBe(false)
    expect(await createAiHealth({ config, fetchImpl: failing }).isAvailable()).toBe(false)
    expect(await createAiHealth({ config, fetchImpl: garbage }).isAvailable()).toBe(false)
    expect(await createAiHealth({ config, fetchImpl: offline }).isAvailable()).toBe(false)
  })

  it('guarda el resultado 60 segundos', async () => {
    let now = 0
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ data: [{ id: 'gemma3:4b' }] }))
    const health = createAiHealth({ config, fetchImpl, now: () => now })
    await health.isAvailable()
    now = 59_000
    await health.isAvailable()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    now = 61_000
    await health.isAvailable()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('también guarda las fallas para no insistirle a un servidor caído', async () => {
    let now = 0
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed')
    })
    const health = createAiHealth({ config, fetchImpl, now: () => now })
    expect(await health.isAvailable()).toBe(false)
    now = 30_000
    expect(await health.isAvailable()).toBe(false)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    now = 61_000
    await health.isAvailable()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('consultas simultáneas comparten una sola llamada', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ data: [{ id: 'gemma3:4b' }] }))
    const health = createAiHealth({ config, fetchImpl })
    const results = await Promise.all([health.isAvailable(), health.isAvailable(), health.isAvailable()])
    expect(results).toEqual([true, true, true])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it("cancela el cuerpo de una respuesta con error y tolera que cancelar falle", async () => {
    const cancel = vi.fn(async () => {
      throw new Error("locked")
    })
    const body = { cancel } as unknown as ReadableStream
    const res = { ok: false, status: 502, body } as unknown as Response
    const fetchImpl = vi.fn<typeof fetch>(async () => res)
    expect(await createAiHealth({ config, fetchImpl }).isAvailable()).toBe(false)
    expect(cancel).toHaveBeenCalledTimes(1)
  })
})
