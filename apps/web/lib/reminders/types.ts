export interface DueNotificationSummary {
  readonly processed: number
  readonly sent: number
  readonly failed: number
}

export interface DueReminderClient {
  readonly name: string
  readonly email: string | null
  readonly phone: string | null
  readonly whatsapp_phone: string | null
}

export interface DueReminderRow {
  readonly id: string
  readonly reminder_type: string
  readonly scheduled_date: string
  readonly notification_channels: readonly string[] | null
  readonly client: DueReminderClient
  readonly organization: { readonly name: string; readonly settings: unknown }
}
