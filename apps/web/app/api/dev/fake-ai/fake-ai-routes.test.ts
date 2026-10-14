import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from './v1/chat/completions/route'
import { GET } from './v1/models/route'

const FAKE_URL = 'http://localhost:3100/api/dev/fake-ai/v1'
const chat = (body: unknown) =>
  new NextRequest('http://localhost/api/dev/fake-ai/v1/chat/completions', { method: 'POST', body: JSON.stringify(body) })
const payload = { messages: [{ role: 'system', content: 'Reescribe' }, { role: 'user', content: 'hola' }] }

afterEach(() => vi.unstubAllEnvs())

function enable() {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('AI_BASE_URL', FAKE_URL)
}

describe('rutas de la IA falsa', () => {
  it('responden 404 en producción aunque la URL falsa esté configurada', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('AI_BASE_URL', FAKE_URL)
    expect((await POST(chat(payload))).status).toBe(404)
    expect((await GET()).status).toBe(404)
  })

  it('responden 404 si no se activó apuntando AI_BASE_URL a ellas', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('AI_BASE_URL', 'http://ollama:11434/v1')
    expect((await POST(chat(payload))).status).toBe(404)
    expect((await GET()).status).toBe(404)
  })

  it('listan el modelo configurado cuando están activas', async () => {
    enable()
    vi.stubEnv('AI_MODEL', 'gemma3:4b')
    const body = await (await GET()).json()
    expect(body.data[0].id).toBe('gemma3:4b')
  })

  it('contestan en JSON con uso, y en stream si se pide', async () => {
    enable()
    const json = await (await POST(chat(payload))).json()
    expect(json.choices[0].message.content).toContain('anticipo')
    const sse = await POST(chat({ ...payload, stream: true }))
    expect(sse.headers.get('Content-Type')).toBe('text/event-stream')
    expect(await sse.text()).toContain('[DONE]')
  })

  it('devuelven 400 si la petición es inválida y 500 con el disparador', async () => {
    enable()
    expect((await POST(chat({ nope: 1 }))).status).toBe(400)
    expect((await POST(chat({ messages: [{ role: 'user', content: '[fallo-ia]' }] }))).status).toBe(500)
  })
})
