import { describe, expect, it } from 'vitest'
import { loadAiConfig } from './config'

describe('loadAiConfig', () => {
  it('usa los valores por omisión del servidor', () => {
    expect(loadAiConfig({})).toEqual({
      baseUrl: 'http://ollama:11434/v1',
      model: 'gemma3:4b',
      timeoutMs: 45000,
      keepAlive: '30m',
      limitsEnforced: true,
    })
  })

  it('trata las variables vacías como no definidas y quita la diagonal final', () => {
    const config = loadAiConfig({ AI_BASE_URL: 'http://localhost:3100/api/dev/fake-ai/v1/', AI_MODEL: '', AI_LIMITS_ENFORCED: 'false' })
    expect(config.baseUrl).toBe('http://localhost:3100/api/dev/fake-ai/v1')
    expect(config.model).toBe('gemma3:4b')
    expect(config.limitsEnforced).toBe(false)
  })

  it('rechaza valores inválidos', () => {
    expect(() => loadAiConfig({ AI_BASE_URL: 'no es url' })).toThrow('Configuración de IA inválida')
    expect(() => loadAiConfig({ AI_TIMEOUT_MS: '10' })).toThrow('AI_TIMEOUT_MS')
    expect(() => loadAiConfig({ AI_KEEP_ALIVE: 'siempre' })).toThrow('AI_KEEP_ALIVE')
  })

  it('acepta solo URLs http o https sin credenciales', () => {
    for (const bad of ['javascript:alert(1)', 'file:///etc/passwd', 'ftp://x', 'http://user:pass@h/v1']) {
      expect(() => loadAiConfig({ AI_BASE_URL: bad })).toThrow('AI_BASE_URL')
    }
    expect(loadAiConfig({ AI_BASE_URL: 'http://ollama:11434/v1' }).baseUrl).toBe('http://ollama:11434/v1')
    expect(loadAiConfig({ AI_BASE_URL: 'https://x/v1' }).baseUrl).toBe('https://x/v1')
  })

  it('no revela el valor inválido en el error', () => {
    expect(() => loadAiConfig({ AI_BASE_URL: 'http://user:secret@h/v1' })).not.toThrow(/secret/)
  })

  it('recorta el modelo y trata espacios como vacío', () => {
    expect(loadAiConfig({ AI_MODEL: '  ' }).model).toBe('gemma3:4b')
    expect(loadAiConfig({ AI_MODEL: ' llama3 ' }).model).toBe('llama3')
  })
})
