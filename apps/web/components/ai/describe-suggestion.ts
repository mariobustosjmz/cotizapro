export type SuggestionPhase = 'idle' | 'streaming' | 'ready'

export interface SuggestionState {
  readonly requestId: number
  /** Descripción para la que se pidió; si la partida cambia, la sugerencia ya no le corresponde. */
  readonly source: string
  readonly phase: SuggestionPhase
  readonly text: string
}

export type SuggestionAction =
  | { readonly type: 'start'; readonly requestId: number; readonly source: string }
  | { readonly type: 'text'; readonly requestId: number; readonly text: string }
  | { readonly type: 'finish'; readonly requestId: number; readonly text: string | null }
  | { readonly type: 'discard' }

export const IDLE_SUGGESTION: SuggestionState = { requestId: 0, source: '', phase: 'idle', text: '' }

/** La sugerencia vive aparte del texto de la persona; solo "Usar" la copia al campo. Las respuestas de una petición vieja se ignoran. */
export function suggestionReducer(state: SuggestionState, action: SuggestionAction): SuggestionState {
  if (action.type === 'start') return { requestId: action.requestId, source: action.source, phase: 'streaming', text: '' }
  if (action.type === 'discard') return IDLE_SUGGESTION
  if (action.requestId !== state.requestId || state.phase === 'idle') return state
  if (action.type === 'text') return { ...state, text: action.text }
  return action.text ? { ...state, phase: 'ready', text: action.text } : IDLE_SUGGESTION
}

/** Las filas se identifican por índice: si la descripción de la fila ya no es la solicitada (otra partida, plantilla, edición), no hay nada que mostrar ni aceptar. */
export function suggestionFor(state: SuggestionState, currentDescription: string): SuggestionState {
  return state.phase === 'idle' || state.source === currentDescription ? state : IDLE_SUGGESTION
}
