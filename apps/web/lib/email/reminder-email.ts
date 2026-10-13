import { encode as escapeHtml } from 'html-entities'
import { brandedEmailHtml, contactHtml, contactLines, type BrandedEmailBrand, type BusinessContact } from './layout'
import type { EmailContent } from './quote-email'

export type ClientReminderType = 'maintenance' | 'renewal'

export interface ReminderEmailInput extends BrandedEmailBrand {
  readonly clientName: string
  readonly reminderType: ClientReminderType
  /** Fecha `YYYY-MM-DD` (columna date). */
  readonly scheduledDate: string
  readonly contact: BusinessContact
}

const COPY: Readonly<Record<ClientReminderType, { readonly label: string; readonly sentence: string }>> = {
  maintenance: { label: 'mantenimiento', sentence: 'se acerca la fecha del mantenimiento de tu instalación' },
  renewal: { label: 'renovación', sentence: 'se acerca la fecha de renovación de tu servicio' },
}

function formatDateOnly(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** Aviso para el cliente: nunca incluye el título ni la descripción del recordatorio (son notas internas). */
export function buildReminderEmail(input: ReminderEmailInput): EmailContent {
  const copy = COPY[input.reminderType]
  const date = formatDateOnly(input.scheduledDate)
  const subject = `Recordatorio de ${copy.label} · ${input.businessName}`
  const body = `<p style="margin:0 0 12px;font-size:16px">Hola ${escapeHtml(input.clientName)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Te escribimos de ${escapeHtml(input.businessName)} porque ${copy.sentence}: <strong>${escapeHtml(date)}</strong>.</p>
<p style="margin:0;font-size:15px;line-height:1.5">Si quieres agendar una visita o tienes dudas, responde a este correo y con gusto te atendemos.</p>
${contactHtml(input.contact)}`

  const lines = contactLines(input.contact)
  const text = [
    `Hola ${input.clientName},`,
    '',
    `Te escribimos de ${input.businessName} porque ${copy.sentence}: ${date}.`,
    'Si quieres agendar una visita o tienes dudas, responde a este correo y con gusto te atendemos.',
    ...(lines.length ? ['', ...lines] : []),
  ].join('\n')

  return { subject, html: brandedEmailHtml(input, body), text }
}
