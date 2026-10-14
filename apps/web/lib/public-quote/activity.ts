import { formatDateTime } from './format'

export interface ClientActivity {
  readonly viewed_at: string | null
  readonly accepted_at: string | null
  readonly rejected_at: string | null
  readonly rejection_reason: string | null
  readonly accepted_by_name: string | null
}

/**
 * accepted_at y rejected_at solo los escribe respond_public_quote (migración 041); el cambio manual de
 * estado no los toca. Por eso su presencia indica que el cliente respondió desde la liga.
 */
export function clientActivityLines(activity: ClientActivity): readonly string[] {
  const acceptedBy = activity.accepted_by_name ? ` por ${activity.accepted_by_name}` : ''
  const reason = activity.rejection_reason ? `. Motivo: ${activity.rejection_reason}` : ''
  return [
    activity.viewed_at ? `Vista por el cliente el ${formatDateTime(activity.viewed_at)}` : null,
    activity.accepted_at ? `Aceptada desde la liga el ${formatDateTime(activity.accepted_at)}${acceptedBy}` : null,
    activity.rejected_at ? `Rechazada desde la liga el ${formatDateTime(activity.rejected_at)}${reason}` : null,
  ].filter((line): line is string => line !== null)
}
