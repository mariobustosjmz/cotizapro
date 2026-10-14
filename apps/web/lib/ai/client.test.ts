import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { AiConfig } from './config'
import { chatJson, chatText } from './client'

const config: AiConfig = { baseUrl: 'http://fake/v1', model: 'gemma3:4b', timeoutMs: 1000, keepAlive: '30m', limitsEnforced: true }
const opts = { temperature: 0.5, maxTokens: 100 }
const encoder = new TextEncoder()

function sseResponse(chunks: readonly string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

function jsonResponse(content: string): Response {
  return Response.json({ choices: [{ message: { content } }], usage: { prompt_tokens: 50, completion_tokens: 20 } })
}

const delta = (content: string): string => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`

describe('chatText', () => {
  it('emite los fragmentos aunque una línea llegue partida y regresa el uso', async () => {
    const first = delta('Cancel de ')
    const usage = `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 12, completion_tokens: 7 } })}\n\n`
    const fetchImpl = vi.fn<typeof fetch>(async () => sseResponse([first.slice(0, 15), first.slice(15), delta('baño'), usage, 'data: [DONE]\n\n']))
    const seen: string[] = []
    const result = await chatText({ config, fetchImpl }, [{ role: 'user', content: 'x' }], opts, (d) => seen.push(d))
    expect(seen.join('')).toBe('Cancel de baño')
    expect(result.value).toBe('Cancel de baño')
    expect(result.usage).toEqual({ promptTokens: 12, completionTokens: 7 })
  })

  it('manda el modelo, keep_alive y pide el uso dentro del stream', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => sseResponse([delta('x'), 'data: [DONE]\n\n']))
    await chatText({ config, fetchImpl }, [{ role: 'user', content: 'x' }], opts, () => undefined)
    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe('http://fake/v1/chat/completions')
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'gemma3:4b',
      keep_alive: '30m',
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.5,
      max_tokens: 100,
    })
  })

  it('una respuesta 500 se reporta como IA no disponible', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response('x', { status: 500 }))
    await expect(chatText({ config, fetchImpl }, [], opts, () => undefined)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('una red caída se reporta como IA no disponible', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed')
    })
    await expect(chatText({ config, fetchImpl }, [], opts, () => undefined)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('corta la llamada al pasar el tiempo límite', async () => {
    const fetchImpl: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })
    await expect(chatText({ config: { ...config, timeoutMs: 50 }, fetchImpl }, [], opts, () => undefined)).rejects.toMatchObject({ code: 'timeout' })
  })
})

describe('chatJson', () => {
  const schema = z.object({ headline: z.string() })

  it('pide JSON y valida con el esquema', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse('{"headline":"Vidrio templado"}'))
    const result = await chatJson({ config, fetchImpl }, [{ role: 'user', content: 'x' }], schema, opts)
    expect(result.value).toEqual({ headline: 'Vidrio templado' })
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).toMatchObject({ stream: false, response_format: { type: 'json_object' } })
  })

  it('reintenta una vez pidiendo corregir el formato y suma el uso', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse('¡Claro! no es json'))
      .mockResolvedValueOnce(jsonResponse('```json\n{"headline":"Listo"}\n```'))
    const result = await chatJson({ config, fetchImpl }, [{ role: 'user', content: 'x' }], schema, opts)
    expect(result.value).toEqual({ headline: 'Listo' })
    expect(result.usage).toEqual({ promptTokens: 100, completionTokens: 40 })
    const retry = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body)) as { messages: { content: string }[] }
    expect(retry.messages.at(-1)?.content).toContain('no cumple el formato')
  })

  it('si vuelve a fallar reporta salida inválida', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse('{"otra":1}'))
    await expect(chatJson({ config, fetchImpl }, [{ role: 'user', content: 'x' }], schema, opts)).rejects.toMatchObject({ code: 'invalid_output' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})

describe('chatText robustez', () => {
  const user = [{ role: 'user' as const, content: 'x' }]
  const stop = `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`

  it('un evento de error en el stream es IA no disponible', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => sseResponse([delta('hola'), 'data: {"error":{"message":"x"}}\n\n', 'data: [DONE]\n\n']))
    await expect(chatText({ config, fetchImpl }, user, opts, () => undefined)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('texto vacío es salida inválida', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => sseResponse([delta('  \n'), 'data: [DONE]\n\n']))
    await expect(chatText({ config, fetchImpl }, user, opts, () => undefined)).rejects.toMatchObject({ code: 'invalid_output' })
  })

  it('un stream cortado sin [DONE] ni finish_reason no es éxito', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => sseResponse([delta('hola')]))
    await expect(chatText({ config, fetchImpl }, user, opts, () => undefined)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('acepta finish_reason sin [DONE], sin usage y con última línea sin salto', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => sseResponse([delta('hola'), stop.trimEnd()]))
    const result = await chatText({ config, fetchImpl }, user, opts, () => undefined)
    expect(result.value).toBe('hola')
    expect(result.usage).toEqual({ promptTokens: null, completionTokens: null })
  })

  it('rechaza un stream que excede maxTokens * 8 caracteres', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => sseResponse([delta('a'.repeat(801)), 'data: [DONE]\n\n']))
    await expect(chatText({ config, fetchImpl }, user, opts, () => undefined)).rejects.toMatchObject({ code: 'invalid_output' })
  })

  it('rechaza un buffer SSE sin saltos de línea que crece sin límite', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => sseResponse(['data: ' + 'a'.repeat(900)]))
    await expect(chatText({ config, fetchImpl }, user, opts, () => undefined)).rejects.toMatchObject({ code: 'invalid_output' })
  })

  it('propaga el aborto de la señal del llamador', async () => {
    const controller = new AbortController()
    const fetchImpl: typeof fetch = async (_input, init) =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(c) {
            init?.signal?.addEventListener('abort', () => c.error(init.signal?.reason))
          },
        }),
        { status: 200 },
      )
    const pending = chatText({ config, fetchImpl }, user, { ...opts, signal: controller.signal }, () => undefined)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ code: 'timeout' })
  })

  it('cancela el cuerpo en una respuesta no 2xx', async () => {
    const cancel = vi.fn()
    const body = new ReadableStream<Uint8Array>({ cancel })
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(body, { status: 500 }))
    await expect(chatText({ config, fetchImpl }, user, opts, () => undefined)).rejects.toMatchObject({ code: 'unavailable' })
    expect(cancel).toHaveBeenCalled()
  })
})

describe('chatJson robustez', () => {
  const schema = z.object({ headline: z.string() })
  const user = [{ role: 'user' as const, content: 'x' }]
  const good = (): Response => jsonResponse('{"headline":"ok"}')

  it('una respuesta 500 es IA no disponible', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response('x', { status: 500 }))
    await expect(chatJson({ config, fetchImpl }, user, schema, opts)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('JSON malformado en un 200 usa el reintento', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('<html>', { status: 200 })).mockResolvedValueOnce(good())
    expect((await chatJson({ config, fetchImpl }, user, schema, opts)).value).toEqual({ headline: 'ok' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('choices vacío usa el reintento y luego es salida inválida', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ choices: [] }))
    await expect(chatJson({ config, fetchImpl }, user, schema, opts)).rejects.toMatchObject({ code: 'invalid_output' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('usage ausente o parcial no tira el contenido', async () => {
    const none = vi.fn<typeof fetch>(async () => Response.json({ choices: [{ message: { content: '{"headline":"a"}' } }] }))
    expect((await chatJson({ config, fetchImpl: none }, user, schema, opts)).usage).toEqual({ promptTokens: null, completionTokens: null })
    const partial = vi.fn<typeof fetch>(async () => Response.json({ choices: [{ message: { content: '{"headline":"a"}' } }], usage: { prompt_tokens: 4 } }))
    const result = await chatJson({ config, fetchImpl: partial }, user, schema, opts)
    expect(result.value).toEqual({ headline: 'a' })
    expect(result.usage).toEqual({ promptTokens: 4, completionTokens: null })
  })

  it('contenido más largo que maxTokens * 8 es salida inválida', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(`{"headline":"${'a'.repeat(900)}"}`))
    await expect(chatJson({ config, fetchImpl }, user, schema, opts)).rejects.toMatchObject({ code: 'invalid_output' })
  })

  it('propaga el aborto de la señal', async () => {
    const controller = new AbortController()
    const fetchImpl: typeof fetch = (_input, init) =>
      new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)))
    const pending = chatJson({ config, fetchImpl }, user, schema, { ...opts, signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ code: 'timeout' })
  })
})

describe('uso tolerante en chatJson', () => {
  it('prompt_tokens como texto no impide devolver el JSON válido en una sola llamada', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ choices: [{ message: { content: '{"headline":"a"}' } }], usage: { prompt_tokens: '5', completion_tokens: -3 } }),
    )
    const result = await chatJson({ config, fetchImpl }, [{ role: 'user', content: 'x' }], z.object({ headline: z.string() }), opts)
    expect(result.value).toEqual({ headline: 'a' })
    expect(result.usage).toEqual({ promptTokens: null, completionTokens: null })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
