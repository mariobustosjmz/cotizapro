import type { ClientReminderType } from '@/lib/email/reminder-email'

export const CLIENT_NOTIFIABLE_TYPES: readonly ClientReminderType[] = ['maintenance', 'renewal']

/** Solo mantenimiento y renovación se avisan al cliente; seguimiento y personalizado son tareas internas. */
export function isClientNotifiable(type: string): type is ClientReminderType {
  return (CLIENT_NOTIFIABLE_TYPES as readonly string[]).includes(type)
}

export interface ClientNoticeFields {
  readonly auto_send_notification: boolean
  readonly notification_channels: readonly ('email' | 'whatsapp')[] | null
}

/** Campos que se guardan según el tipo: un tipo interno nunca queda con aviso al cliente. */
export function clientNoticeFields(type: string, notify: boolean): ClientNoticeFields {
  const enabled = notify && isClientNotifiable(type)
  return { auto_send_notification: enabled, notification_channels: enabled ? ['email'] : null }
}
