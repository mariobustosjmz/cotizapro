import { describe, expect, it } from 'vitest'
import { parseJsonContent, parseOpenAiSse } from './openai-format'

describe('parseOpenAiSse', () => {
  it('deja la línea incompleta para la siguiente lectura', () => {
    const parsed = parseOpenAiSse('data: {"choices":[{"delta":{"content":"Hola"}}]}\n\ndata: {"choi')
    expect(parsed.pieces.map((p) => p.delta)).toEqual(['Hola'])
    expect(parsed.rest).toBe('data: {"choi')
    expect(parsed.done).toBe(false)
  })

  it('lee el uso y el fin del stream', () => {
    const parsed = parseOpenAiSse('data: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":7}}\n\ndata: [DONE]\n\n')
    expect(parsed.pieces).toEqual([{ delta: '', promptTokens: 12, completionTokens: 7 }])
    expect(parsed.done).toBe(true)
  })

  it('ignora líneas que no son JSON', () => {
    expect(parseOpenAiSse(': ping\n\ndata: no-json\n\n').pieces).toEqual([])
  })
})

describe('parseJsonContent', () => {
  it('acepta JSON con cercas de markdown o texto alrededor', () => {
    expect(parseJsonContent('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(parseJsonContent('Aquí está: {"a":2} listo')).toEqual({ a: 2 })
  })

  it('regresa undefined si no hay JSON válido', () => {
    expect(parseJsonContent('sin llaves')).toBeUndefined()
    expect(parseJsonContent('{roto')).toBeUndefined()
  })
})

describe('parseOpenAiSse señales de fin y error', () => {
  it('marca error, finish_reason y usage parcial sin perder contenido', () => {
    expect(parseOpenAiSse('data: {"error":{"message":"boom"}}\n\n').failed).toBe(true)
    expect(parseOpenAiSse('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n').finished).toBe(true)
    const partial = parseOpenAiSse('data: {"choices":[{"delta":{"content":"a"}}],"usage":{"prompt_tokens":3}}\n\n')
    expect(partial.pieces).toEqual([{ delta: 'a', promptTokens: 3, completionTokens: null }])
  })
})

describe('uso tolerante', () => {
  it('un token no entero conserva el contenido del fragmento', () => {
    const parsed = parseOpenAiSse('data: {"choices":[{"delta":{"content":"hola"}}],"usage":{"prompt_tokens":5.5,"completion_tokens":"2"}}\n\n')
    expect(parsed.pieces).toEqual([{ delta: 'hola', promptTokens: null, completionTokens: null }])
  })
})
