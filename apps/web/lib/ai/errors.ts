import { formatResetDate } from './period'

export type AiErrorCode =
  | 'quota_exceeded'
  | 'daily_cap'
  | 'busy'
  | 'timeout'
  | 'invalid_output'
  | 'unavailable'
  | 'invalid_input'
  | 'forbidden'
  | 'not_eligible'

export class AiError extends Error {
  readonly code: AiErrorCode

  constructor(code: AiErrorCode, detail?: string) {
    super(detail ?? code)
    this.name = 'AiError'
    this.code = code
  }
}

const STATUS: Readonly<Record<AiErrorCode, number>> = {
  quota_exceeded: 402,
  daily_cap: 429,
  busy: 503,
  timeout: 503,
  invalid_output: 502,
  unavailable: 503,
  invalid_input: 400,
  forbidden: 403,
  not_eligible: 409,
}

export function aiErrorStatus(code: AiErrorCode): number {
  return STATUS[code]
}

export function aiErrorMessage(code: AiErrorCode, resetsOn: string): string {
  switch (code) {
    case 'quota_exceeded':
      return `Usaste tus créditos de IA de este mes. Se reinician el ${formatResetDate(resetsOn)}.`
    case 'daily_cap':
      return 'Llegaste al límite diario de IA para tu usuario'
    case 'busy':
    case 'timeout':
      return 'La IA está ocupada, intenta en un momento'
    case 'invalid_output':
      return 'La IA no dio una respuesta válida. No se descontaron créditos.'
    case 'unavailable':
      return 'La IA no está disponible por ahora'
    case 'invalid_input':
      return 'Revisa el texto que enviaste'
    case 'forbidden':
      return 'No tienes permiso para esta acción'
    case 'not_eligible':
      return 'Esta cotización todavía no necesita seguimiento'
  }
}

const DB_ERRORS: ReadonlyMap<string, AiErrorCode> = new Map<string, AiErrorCode>(Object.entries({
  ai_quota_exceeded: 'quota_exceeded',
  ai_daily_cap: 'daily_cap',
  ai_invalid_feature: 'invalid_input',
  forbidden: 'forbidden',
  not_authenticated: 'forbidden',
} satisfies Record<string, AiErrorCode>))

export function fromDbError(message: string): AiError {
  const code = DB_ERRORS.get(message)
  return new AiError(code ?? 'unavailable', code ? message : 'db_error')
}

export function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return new AiError('timeout', error.name)
  }
  return new AiError('unavailable', error instanceof Error ? error.name : 'unknown')
}
