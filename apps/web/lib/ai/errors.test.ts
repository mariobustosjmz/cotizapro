import { describe, expect, it } from 'vitest'
import { AiError, aiErrorMessage, aiErrorStatus, fromDbError, toAiError } from './errors'

describe('errores de IA', () => {
  it('usa los códigos HTTP del diseño', () => {
    expect(aiErrorStatus('quota_exceeded')).toBe(402)
    expect(aiErrorStatus('daily_cap')).toBe(429)
    expect(aiErrorStatus('busy')).toBe(503)
    expect(aiErrorStatus('timeout')).toBe(503)
    expect(aiErrorStatus('invalid_output')).toBe(502)
  })

  it('dice cuándo se reinician los créditos', () => {
    expect(aiErrorMessage('quota_exceeded', '2026-11-01')).toBe('Usaste tus créditos de IA de este mes. Se reinician el 1 de noviembre.')
    expect(aiErrorMessage('daily_cap', '2026-11-01')).toBe('Llegaste al límite diario de IA para tu usuario')
    expect(aiErrorMessage('busy', '2026-11-01')).toBe('La IA está ocupada, intenta en un momento')
    expect(aiErrorMessage('unavailable', '2026-11-01')).toBe('La IA no está disponible por ahora')
  })

  it('traduce los errores de la base', () => {
    expect(fromDbError('ai_quota_exceeded').code).toBe('quota_exceeded')
    expect(fromDbError('ai_daily_cap').code).toBe('daily_cap')
    expect(fromDbError('ai_invalid_feature').code).toBe('invalid_input')
    expect(fromDbError('connection refused').code).toBe('unavailable')
  })

  it('convierte abortos y tiempos agotados en timeout', () => {
    expect(toAiError(new DOMException('x', 'TimeoutError')).code).toBe('timeout')
    expect(toAiError(new DOMException('x', 'AbortError')).code).toBe('timeout')
    expect(toAiError(new TypeError('fetch failed')).code).toBe('unavailable')
    const known = new AiError('busy')
    expect(toAiError(known)).toBe(known)
  })

  it('no confunde propiedades del prototipo con errores de la base', () => {
    for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(fromDbError(name).code).toBe('unavailable')
    }
  })

  it('mapea permisos y entradas inválidas de la base', () => {
    expect(fromDbError('forbidden').code).toBe('forbidden')
    expect(fromDbError('not_authenticated').code).toBe('forbidden')
  })

  it('define estado y texto de los demás códigos', () => {
    expect(aiErrorStatus('forbidden')).toBe(403)
    expect(aiErrorStatus('invalid_input')).toBe(400)
    expect(aiErrorStatus('not_eligible')).toBe(409)
    expect(aiErrorStatus('unavailable')).toBe(503)
    expect(aiErrorMessage('forbidden', '2026-11-01')).toBe('No tienes permiso para esta acción')
    expect(aiErrorMessage('invalid_input', '2026-11-01')).toBe('Revisa el texto que enviaste')
    expect(aiErrorMessage('not_eligible', '2026-11-01')).toBe('Esta cotización todavía no necesita seguimiento')
    expect(aiErrorMessage('invalid_output', '2026-11-01')).toBe('La IA no dio una respuesta válida. No se descontaron créditos.')
  })
})
