import { describe, expect, it } from 'vitest'
import { IDLE_SUGGESTION, suggestionFor, suggestionReducer } from './describe-suggestion'

describe('suggestionReducer', () => {
  it('acumula la sugerencia sin tocar el texto original', () => {
    let state = suggestionReducer(IDLE_SUGGESTION, { type: 'start', requestId: 1, source: 'cancel' })
    state = suggestionReducer(state, { type: 'text', requestId: 1, text: 'Cancel de baño' })
    expect(state).toEqual({ requestId: 1, source: 'cancel', phase: 'streaming', text: 'Cancel de baño' })
  })

  it('al terminar espera la decisión de la persona', () => {
    let state = suggestionReducer(IDLE_SUGGESTION, { type: 'start', requestId: 1, source: 'cancel' })
    state = suggestionReducer(state, { type: 'finish', requestId: 1, text: 'Final' })
    expect(state).toEqual({ requestId: 1, source: 'cancel', phase: 'ready', text: 'Final' })
  })

  it('una falla o un resultado vacío no deja sugerencia', () => {
    let state = suggestionReducer(IDLE_SUGGESTION, { type: 'start', requestId: 1, source: 'cancel' })
    state = suggestionReducer(state, { type: 'text', requestId: 1, text: 'parcial' })
    expect(suggestionReducer(state, { type: 'finish', requestId: 1, text: null })).toEqual(IDLE_SUGGESTION)
  })

  it('descartar limpia y las respuestas tardías de una petición vieja se ignoran', () => {
    let state = suggestionReducer(IDLE_SUGGESTION, { type: 'start', requestId: 1, source: 'cancel' })
    state = suggestionReducer(state, { type: 'discard' })
    expect(state).toEqual(IDLE_SUGGESTION)
    expect(suggestionReducer(state, { type: 'text', requestId: 1, text: 'tarde' })).toEqual(IDLE_SUGGESTION)
    expect(suggestionReducer(state, { type: 'finish', requestId: 1, text: 'tarde' })).toEqual(IDLE_SUGGESTION)
  })

  it('la sugerencia solo se ve mientras la descripción sigue igual a la solicitada', () => {
    let state = suggestionReducer(IDLE_SUGGESTION, { type: 'start', requestId: 1, source: 'cancel' })
    state = suggestionReducer(state, { type: 'finish', requestId: 1, text: 'Final' })
    expect(suggestionFor(state, 'cancel')).toBe(state)
    expect(suggestionFor(state, 'cancel 9mm')).toEqual(IDLE_SUGGESTION)
    expect(suggestionFor(state, 'otra partida')).toEqual(IDLE_SUGGESTION)
  })

  it('al cambiar de partida o aplicar una plantilla no queda nada que aceptar', () => {
    const state = suggestionReducer(IDLE_SUGGESTION, { type: 'start', requestId: 2, source: 'Cancel' })
    expect(suggestionFor(state, '').phase).toBe('idle')
  })
})
