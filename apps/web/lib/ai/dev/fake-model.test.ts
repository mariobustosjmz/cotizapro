import { describe, expect, it } from 'vitest'
import { FAKE_DRAFT, FAKE_SHOWCASE, FAKE_TEXTS, fakeReply, fakeSseBody } from './fake-model'
import { isFakeAiEnabled } from './guard'

const sys = (content: string) => ({ role: 'system', content })
const user = (content: string) => ({ role: 'user', content })
const json = { type: 'json_object' }
const FAKE_URL = 'http://localhost:3100/api/dev/fake-ai/v1'

describe('IA falsa', () => {
  it('solo existe fuera de producción y con la URL falsa configurada', () => {
    expect(isFakeAiEnabled({ NODE_ENV: 'development', AI_BASE_URL: FAKE_URL })).toBe(true)
    expect(isFakeAiEnabled({ NODE_ENV: 'test', AI_BASE_URL: FAKE_URL })).toBe(true)
  })

  it('nunca existe en producción, con cualquier configuración', () => {
    expect(isFakeAiEnabled({ NODE_ENV: 'production', AI_BASE_URL: FAKE_URL })).toBe(false)
    expect(isFakeAiEnabled({ NODE_ENV: 'production' })).toBe(false)
    expect(isFakeAiEnabled({ NODE_ENV: 'production', AI_BASE_URL: FAKE_URL, AI_FAKE_ENABLED: 'true' })).toBe(false)
  })

  it('no está activa si AI_BASE_URL falta o apunta a otro servidor', () => {
    expect(isFakeAiEnabled({ NODE_ENV: 'development' })).toBe(false)
    expect(isFakeAiEnabled({ NODE_ENV: 'development', AI_BASE_URL: 'http://ollama:11434/v1' })).toBe(false)
    expect(isFakeAiEnabled({ NODE_ENV: 'development', AI_BASE_URL: 'http://evil.test/?x=/api/dev/fake-ai/v1' })).toBe(false)
    expect(isFakeAiEnabled({ NODE_ENV: undefined, AI_BASE_URL: FAKE_URL })).toBe(false)
  })

  it('regresa el borrador o los textos de la vitrina según el JSON pedido', () => {
    expect(fakeReply({ messages: [sys('forma {"partidas":[]}'), user('x')], response_format: json })).toEqual({ kind: 'json', content: JSON.stringify(FAKE_DRAFT) })
    expect(fakeReply({ messages: [sys('forma {"headline":""}'), user('x')], response_format: json })).toEqual({ kind: 'json', content: JSON.stringify(FAKE_SHOWCASE) })
  })

  it('elige el texto por función y conserva el preámbulo para probar la limpieza', () => {
    expect(fakeReply({ messages: [sys('Mejora la descripción de una partida'), user('x')] })).toEqual({ kind: 'text', content: FAKE_TEXTS.describe })
    expect(FAKE_TEXTS.describe.startsWith('¡Claro!')).toBe(true)
    expect(fakeReply({ messages: [sys('Escribe un mensaje de seguimiento'), user('x')] })).toEqual({ kind: 'text', content: FAKE_TEXTS.followUp })
    expect(fakeReply({ messages: [sys('Reescribe el texto'), user('x')] })).toEqual({ kind: 'text', content: FAKE_TEXTS.rewrite })
  })

  it('falla a propósito con el disparador', () => {
    expect(fakeReply({ messages: [sys('Reescribe'), user('Anticipo [fallo-ia]')] })).toEqual({ kind: 'fail' })
  })

  it('arma un stream compatible con OpenAI con uso y fin', () => {
    const body = fakeSseBody('Hola Laura')
    expect(body).toContain('data: {"choices":[{"delta":{"content":"Hola Laura"}}]}')
    expect(body).toContain('"usage":{"prompt_tokens":120')
    expect(body.endsWith('data: [DONE]\n\n')).toBe(true)
  })
})
