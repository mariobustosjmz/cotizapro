import { describe, expect, it, vi } from 'vitest'
import { AiError } from './errors'
import { aiErrorResponse, aiTextStreamResponse } from './http'

describe('aiErrorResponse', () => {
  it('usa el estado HTTP y el mensaje en español', async () => {
    const res = aiErrorResponse(new AiError('quota_exceeded'), new Date('2026-10-13T12:00:00Z'))
    expect(res.status).toBe(402)
    expect(await res.json()).toEqual({ error: 'Usaste tus créditos de IA de este mes. Se reinician el 1 de noviembre.', code: 'quota_exceeded' })
  })

  it('un error desconocido se reporta como IA no disponible', async () => {
    const res = aiErrorResponse(new Error('boom'))
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ code: 'unavailable' })
  })
})

describe('aiTextStreamResponse', () => {
  it('manda los fragmentos y el texto final', async () => {
    const res = aiTextStreamResponse(async (send) => {
      send('Hola ')
      send('Laura')
      return 'Hola Laura'
    }, () => undefined)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
    expect(await res.text()).toBe('data: {"delta":"Hola "}\n\ndata: {"delta":"Laura"}\n\ndata: {"done":true,"text":"Hola Laura"}\n\n')
  })

  it('un error a mitad del stream manda un evento de error', async () => {
    const res = aiTextStreamResponse(async (send) => {
      send('Hola')
      throw new AiError('timeout')
    }, () => undefined)
    expect(await res.text()).toContain('event: error\ndata: {"code":"timeout","error":"La IA está ocupada, intenta en un momento"}\n\n')
  })
})

describe('hallazgos de revisión (http)', () => {
  it('el tope diario llega como JSON 429 antes de abrir el stream', async () => {
    const res = aiErrorResponse(new AiError('daily_cap', 'ai_daily_cap'))
    expect(res.status).toBe(429)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    expect(await res.json()).toEqual({ error: 'Llegaste al límite diario de IA para tu usuario', code: 'daily_cap' })
  })

  it('el JSON de error nunca incluye el detalle interno', async () => {
    const res = aiErrorResponse(new AiError('unavailable', 'http_500 detalle-interno'))
    expect(JSON.stringify(await res.json())).not.toContain('detalle-interno')
  })

  it('el evento de error solo trae el código y el mensaje en español, nunca el detalle interno', async () => {
    const leaky = aiTextStreamResponse(async () => {
      throw new AiError('unavailable', 'http_500 detalle-interno')
    }, () => undefined)
    const raw = await leaky.text()
    expect(raw).not.toContain('detalle-interno')
    const payload: unknown = JSON.parse(raw.split('data: ')[1] ?? '')
    expect(payload).toEqual({ code: 'unavailable', error: 'La IA no está disponible por ahora' })

    const plain = aiTextStreamResponse(async () => {
      throw new Error('password=secreto en la base')
    }, () => undefined)
    expect(await plain.text()).toBe('event: error\ndata: {"code":"unavailable","error":"La IA no está disponible por ahora"}\n\n')
  })

  it('si el cliente cancela, avisa con onCancel y los envíos tardíos no truenan', async () => {
    const onCancel = vi.fn()
    let finish: (text: string) => void = () => undefined
    let sendLater: (delta: string) => void = () => undefined
    const res = aiTextStreamResponse(
      (send) =>
        new Promise<string>((resolve) => {
          sendLater = send
          finish = resolve
        }),
      onCancel,
    )
    const reader = res.body?.getReader()
    await reader?.cancel()
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(() => sendLater('tarde')).not.toThrow()
    finish('fin')
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
})
