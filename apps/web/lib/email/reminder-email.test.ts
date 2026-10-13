import { describe, expect, it } from 'vitest'
import { buildReminderEmail, reminderNoticePreview, type ReminderEmailInput } from './reminder-email'
import { brandPalette } from '@/lib/branding/color'

const base: ReminderEmailInput = {
  businessName: 'MEGAGLASS',
  logoUrl: null,
  palette: brandPalette('#0E7490'),
  clientName: 'Andrea <i>Garza</i>',
  reminderType: 'maintenance',
  scheduledDate: '2026-10-20',
  contact: { phone: '81 5550 0000', email: 'ventas@megaglass.mx', address: null },
}

describe('buildReminderEmail', () => {
  it('usa una plantilla para el cliente según el tipo', () => {
    const maintenance = buildReminderEmail(base)
    expect(maintenance.subject).toBe('Recordatorio de mantenimiento · MEGAGLASS')
    expect(maintenance.text).toContain('mantenimiento')
    const renewal = buildReminderEmail({ ...base, reminderType: 'renewal' })
    expect(renewal.subject).toBe('Recordatorio de renovación · MEGAGLASS')
  })

  it('muestra la fecha sin desfase de zona horaria', () => {
    expect(buildReminderEmail(base).text).toContain('20 de octubre de 2026')
  })

  it('escapa el nombre del cliente', () => {
    const { html } = buildReminderEmail(base)
    expect(html).toContain('Andrea &lt;i&gt;Garza&lt;/i&gt;')
  })

  it('invita a responder y muestra el contacto del negocio', () => {
    const { text } = buildReminderEmail(base)
    expect(text).toContain('responde a este correo')
    expect(text).toContain('Tel. 81 5550 0000')
  })
})

describe('reminderNoticePreview', () => {
  it('muestra la frase que recibirá el cliente, sin notas internas', () => {
    expect(reminderNoticePreview('maintenance')).toBe('Hola [cliente], te escribimos de [tu negocio] porque se acerca la fecha del mantenimiento de tu instalación: [fecha].')
  })
})
