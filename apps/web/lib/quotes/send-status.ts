const REOPENED_ON_SEND: ReadonlySet<string> = new Set(['draft', 'rejected', 'expired'])

/** Al (re)enviar: borrador, rechazada o vencida vuelven a "Enviada"; las demás conservan su avance. */
export function statusAfterSend(current: string): string {
  return REOPENED_ON_SEND.has(current) ? 'sent' : current
}

const ADVANCED_STATUSES: ReadonlySet<string> = new Set(['accepted', 'en_instalacion', 'completado', 'cobrado'])

/** Las cotizaciones aceptadas o más avanzadas no se tocan al reenviar: se conserva su sent_at y sent_via. */
export function shouldUpdateStatus(current: string): boolean {
  return !ADVANCED_STATUSES.has(current)
}

export interface SendOutcomeInput {
  readonly emailRequested: boolean
  readonly emailOk: boolean
  readonly whatsappRequested: boolean
  readonly whatsappOk: boolean
}

export interface SendOutcome {
  readonly httpStatus: 200 | 502
  readonly markSent: boolean
}

/** Se considera enviada si al menos un canal solicitado quedó listo; si ninguno, 502 y no se marca. */
export function sendOutcome(input: SendOutcomeInput): SendOutcome {
  const delivered = (input.emailRequested && input.emailOk) || (input.whatsappRequested && input.whatsappOk)
  return delivered ? { httpStatus: 200, markSent: true } : { httpStatus: 502, markSent: false }
}
