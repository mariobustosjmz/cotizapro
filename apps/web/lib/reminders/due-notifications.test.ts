import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { dueDateLimit, parseDueReminders, sendDueClientReminders } from './due-notifications'
import { CLIENT_NOTIFIABLE_TYPES, clientNoticeFields, isClientNotifiable } from './client-notice'
import { sendEmail } from '@/lib/integrations/email'
import { logger } from '@/lib/logger'

vi.mock('@/lib/integrations/email', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/integrations/twilio', () => ({ sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: false }) }))

describe('isClientNotifiable', () => {
  it('solo mantenimiento y renovación se avisan al cliente', () => {
    expect(isClientNotifiable('maintenance')).toBe(true)
    expect(isClientNotifiable('renewal')).toBe(true)
    expect(isClientNotifiable('follow_up')).toBe(false)
    expect(isClientNotifiable('custom')).toBe(false)
  })
})

describe('dueDateLimit', () => {
  it('regresa mañana en fecha local de Monterrey (YYYY-MM-DD)', () => {
    expect(dueDateLimit(new Date('2026-10-13T05:30:00Z'))).toBe('2026-10-13')
    expect(dueDateLimit(new Date('2026-10-13T18:00:00Z'))).toBe('2026-10-14')
  })
})

describe('clientNoticeFields', () => {
  it('activa el correo solo en tipos que se avisan al cliente', () => {
    expect(clientNoticeFields('maintenance', true)).toEqual({ auto_send_notification: true, notification_channels: ['email'] })
    expect(clientNoticeFields('follow_up', true)).toEqual({ auto_send_notification: false, notification_channels: null })
    expect(clientNoticeFields('renewal', false)).toEqual({ auto_send_notification: false, notification_channels: null })
  })
})

const row = {
  id: 'r1', reminder_type: 'maintenance', scheduled_date: '2026-10-14', notification_channels: ['email'],
  client_name: 'Ana', client_email: 'ana@example.com', client_phone: null, client_whatsapp_phone: null,
  organization_name: 'Vidrios Ana', organization_settings: { company_email: 'hola@vidrios.mx' },
}

describe('parseDueReminders', () => {
  it('convierte la fila plana de la RPC al formato interno', () => {
    expect(parseDueReminders([row])).toEqual([{
      id: 'r1', reminder_type: 'maintenance', scheduled_date: '2026-10-14', notification_channels: ['email'],
      client: { name: 'Ana', email: 'ana@example.com', phone: null, whatsapp_phone: null },
      organization: { name: 'Vidrios Ana', settings: { company_email: 'hola@vidrios.mx' } },
    }])
  })

  it('descarta filas sin id o sin nombre de cliente y respuestas que no son arreglo', () => {
    expect(parseDueReminders([{ ...row, id: null }, { ...row, client_name: null }, null, 'x'])).toEqual([])
    expect(parseDueReminders(null)).toEqual([])
  })

  it('los tipos de la RPC coinciden con los avisables', () => {
    expect([...CLIENT_NOTIFIABLE_TYPES].sort()).toEqual(['maintenance', 'renewal'])
  })
})

type RpcResult = { data: unknown; error: { message: string } | null }

function fakeSupabase(due: RpcResult) {
  const rpc = vi.fn(async (fn: string): Promise<RpcResult> => (fn === 'client_reminders_due' ? due : { data: true, error: null }))
  return { client: { rpc } as unknown as SupabaseClient, rpc }
}

describe('sendDueClientReminders', () => {
  const now = new Date('2026-10-13T18:00:00Z')
  const key = 'k'.repeat(40)

  beforeEach(() => {
    vi.mocked(sendEmail).mockReset()
    vi.mocked(sendEmail).mockImplementation(async ({ to }) => ({ success: to === 'ana@example.com' }))
  })

  it('lee con la llave del cron y marca solo los avisos que sí se enviaron', async () => {
    const { client, rpc } = fakeSupabase({ data: [row, { ...row, id: 'r2', client_email: 'falla@example.com' }], error: null })
    expect(await sendDueClientReminders(client, key, now)).toEqual({ processed: 2, sent: 1, failed: 1 })
    expect(rpc).toHaveBeenCalledWith('client_reminders_due', { p_cron_key: key, p_until: '2026-10-14' })
    expect(rpc).toHaveBeenCalledWith('mark_client_reminder_sent', { p_cron_key: key, p_id: 'r1', p_sent_at: now.toISOString() })
    expect(rpc).not.toHaveBeenCalledWith('mark_client_reminder_sent', expect.objectContaining({ p_id: 'r2' }))
  })

  it('falla si la RPC rechaza la llave', async () => {
    const { client } = fakeSupabase({ data: null, error: { message: 'forbidden' } })
    await expect(sendDueClientReminders(client, key, now)).rejects.toThrow('due reminders query failed: forbidden')
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe('sendDueClientReminders: límite de la RPC', () => {
  it('avisa en el log cuando la RPC llega al LIMIT de 500', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    vi.mocked(sendEmail).mockResolvedValue({ success: false })
    const { client } = fakeSupabase({ data: Array.from({ length: 500 }, (_, i) => ({ ...row, id: `r${i}` })), error: null })
    await sendDueClientReminders(client, 'k'.repeat(40), new Date('2026-10-13T18:00:00Z'))
    expect(warn).toHaveBeenCalledWith('Reminders cron hit the SQL limit; remaining reminders wait for the next run', { limit: 500 })
    warn.mockClear()
    await sendDueClientReminders(fakeSupabase({ data: [row], error: null }).client, 'k'.repeat(40), new Date('2026-10-13T18:00:00Z'))
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
