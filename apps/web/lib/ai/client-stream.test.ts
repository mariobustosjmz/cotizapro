import { describe, expect, it } from 'vitest'
import { AiClientError, aiErrorFromResponse, parseAiSse, readAiTextStream } from './client-stream'

function streamResponse(text: string): Response {
  return new Response(text, { headers: { 'Content-Type': 'text/event-stream' } })
}

function chunkedResponse(bytes: Uint8Array, size: number): Response {
  let offset = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) return controller.close()
      controller.enqueue(bytes.slice(offset, offset + size))
      offset += size
    },
  })
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
}

describe('parseAiSse', () => {
  it('lee fragmentos, fin y errores y deja el bloque incompleto', () => {
    const parsed = parseAiSse('data: {"delta":"Ho"}\n\ndata: {"done":true,"text":"Hola"}\n\nevent: error\ndata: {"code":"busy","error":"x"}\n\ndata: {"del')
    expect(parsed.events).toEqual([
      { type: 'delta', delta: 'Ho' },
      { type: 'done', text: 'Hola' },
      { type: 'error', code: 'busy', message: 'x' },
    ])
    expect(parsed.rest).toBe('data: {"del')
  })
})

describe('parseAiSse CRLF', () => {
  it('normaliza \\r\\n y \\r antes de separar', () => {
    const parsed = parseAiSse('data: {"delta":"A"}\r\n\r\ndata: {"delta":"B"}\r\rdata: {"do')
    expect(parsed.events).toEqual([
      { type: 'delta', delta: 'A' },
      { type: 'delta', delta: 'B' },
    ])
    expect(parsed.rest).toBe('data: {"do')
  })
})

describe('readAiTextStream', () => {
  it('va mostrando el texto acumulado y termina con el texto limpio', async () => {
    const seen: string[] = []
    const body = 'data: {"delta":"Cancel "}\n\ndata: {"delta":"templado"}\n\ndata: {"done":true,"text":"Cancel templado."}\n\n'
    const text = await readAiTextStream(streamResponse(body), (t) => seen.push(t))
    expect(seen).toEqual(['Cancel ', 'Cancel templado', 'Cancel templado.'])
    expect(text).toBe('Cancel templado.')
  })

  it('un evento de error después de texto lanza el mensaje del servidor', async () => {
    const response = streamResponse('data: {"delta":"Hola"}\n\nevent: error\ndata: {"code":"timeout","error":"La IA está ocupada, intenta en un momento"}\n\n')
    await expect(readAiTextStream(response, () => undefined)).rejects.toMatchObject({ code: 'timeout', message: 'La IA está ocupada, intenta en un momento' })
  })

  it('un stream que se corta sin fin es un error', async () => {
    await expect(readAiTextStream(streamResponse('data: {"delta":"Hola"}\n\n'), () => undefined)).rejects.toBeInstanceOf(AiClientError)
  })

  it('soporta fronteras de fragmento y UTF-8 partido byte por byte', async () => {
    const payload = 'data: {"delta":"Instalación "}\n\ndata: {"delta":"niño ñ 🙂"}\n\ndata: {"done":true,"text":"Instalación niño ñ 🙂"}\n\n'
    const bytes = new TextEncoder().encode(payload)
    for (const size of [1, 2, 3, 7]) {
      const text = await readAiTextStream(chunkedResponse(bytes, size), () => undefined)
      expect(text).toBe('Instalación niño ñ 🙂')
    }
  })

  it('un abort se propaga y cancela la lectura', async () => {
    const controller = new AbortController()
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode('data: {"delta":"Ho"}\n\n'))
      },
    })
    const promise = readAiTextStream(new Response(body), () => controller.abort(), controller.signal)
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('aiErrorFromResponse', () => {
  it('usa el mensaje en español del servidor o uno genérico', async () => {
    const ok = await aiErrorFromResponse(Response.json({ error: 'Usaste tus créditos', code: 'quota_exceeded' }, { status: 402 }))
    expect(ok).toMatchObject({ code: 'quota_exceeded', message: 'Usaste tus créditos' })
    const bad = await aiErrorFromResponse(new Response('<html>', { status: 502 }))
    expect(bad.message).toBe('La IA no está disponible por ahora')
  })

  it('acepta {error} sin code y mapea por estado', async () => {
    const withMsg = await aiErrorFromResponse(Response.json({ error: 'Mensaje' }, { status: 400 }))
    expect(withMsg.message).toBe('Mensaje')
    const s400 = await aiErrorFromResponse(new Response('', { status: 400 }))
    expect(s400).toMatchObject({ code: 'invalid_request', message: 'Revisa los datos e intenta de nuevo' })
    const s429 = await aiErrorFromResponse(new Response('', { status: 429 }))
    expect(s429).toMatchObject({ code: 'daily_cap', message: 'Llegaste al límite diario de IA para tu usuario' })
    const s402 = await aiErrorFromResponse(new Response('', { status: 402 }))
    expect(s402).toMatchObject({ code: 'quota_exceeded', message: 'Usaste tus créditos de IA de este mes' })
  })
})
