import { describe, expect, it } from 'vitest'
import { quoteNotificationItem, type QuoteNotificationRow } from './quote-notification-item'

const row: QuoteNotificationRow = {
  id: 'n1',
  quote_id: 'q1',
  notification_type: 'client_accepted',
  recipient: 'Laura Pérez',
  status: 'sent',
  sent_at: '2026-10-14T16:00:00Z',
  quotes: { quote_number: 'COT-2026-0007' },
}

describe('quoteNotificationItem', () => {
  it('respuesta de aceptación sin leer y prioritaria', () => {
    expect(quoteNotificationItem(row)).toEqual({
      id: 'n1', type: 'send', kind: 'client_response', title: 'Tu cliente aceptó la cotización', subtitle: 'COT-2026-0007 · Laura Pérez',
      date: '2026-10-14T16:00:00Z', priority: 'high', read: false, href: '/dashboard/quotes/q1',
    })
  })

  it('rechazo leído', () => {
    const item = quoteNotificationItem({ ...row, notification_type: 'client_rejected', status: 'read' })
    expect(item.title).toBe('Tu cliente rechazó la cotización')
    expect(item.read).toBe(true)
    expect(item.priority).toBe('normal')
  })

  it('envíos de correo y WhatsApp conservan su texto y cuentan como leídos', () => {
    expect(quoteNotificationItem({ ...row, notification_type: 'email', status: 'failed' })).toMatchObject({ title: 'Email fallido', subtitle: 'COT-2026-0007', priority: 'high', read: true })
    expect(quoteNotificationItem({ ...row, notification_type: 'whatsapp' }).title).toBe('WhatsApp enviado')
  })
  it('asigna el tipo de icono por canal', () => {
    expect(quoteNotificationItem({ ...row, notification_type: 'email' }).kind).toBe('email')
    expect(quoteNotificationItem({ ...row, notification_type: 'whatsapp' }).kind).toBe('whatsapp')
  })

  it('tipo desconocido se trata como envío por WhatsApp', () => {
    expect(quoteNotificationItem({ ...row, notification_type: 'otro' })).toMatchObject({ kind: 'whatsapp', read: true })
  })

  it('sin folio ni cotización no falla y el enlace es #', () => {
    const item = quoteNotificationItem({ ...row, quote_id: null, quotes: null })
    expect(item.href).toBe('#')
    expect(item.subtitle).toBe('Laura Pérez')
  })
})
