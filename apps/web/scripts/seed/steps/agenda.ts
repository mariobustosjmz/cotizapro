import type { SeededCatalog } from './catalog'
import type { SeededClient } from './clients'
import type { SeededQuote } from './quotes'
import { type Admin, check, daysFromNow, isoDate, type Rand } from '../util'

const EVENT_FOR_STATUS: Readonly<Record<string, { type: string; title: string; dayRange: readonly [number, number]; status: string }>> = {
  sent: { type: 'medicion', title: 'Medición en sitio', dayRange: [0, 6], status: 'pendiente' },
  accepted: { type: 'instalacion', title: 'Instalación programada', dayRange: [1, 10], status: 'pendiente' },
  en_instalacion: { type: 'instalacion', title: 'Instalación en curso', dayRange: [0, 3], status: 'en_camino' },
  completado: { type: 'visita_tecnica', title: 'Revisión de entrega', dayRange: [-6, -1], status: 'completado' },
}

export async function seedEvents(
  admin: Admin, orgId: string, assignees: readonly string[], quotes: readonly SeededQuote[], clients: readonly SeededClient[], rand: Rand,
): Promise<number> {
  const rows = quotes.flatMap((q, i) => {
    const plan = EVENT_FOR_STATUS[q.status]
    if (!plan) return []
    const start = daysFromNow(rand.int(plan.dayRange[0], plan.dayRange[1]), rand.pick([9, 11, 13, 16]))
    const end = new Date(start.getTime() + rand.pick([1, 2, 3]) * 3_600_000)
    const client = clients.find((c) => c.id === q.clientId)
    return [{
      organization_id: orgId, client_id: q.clientId, quote_id: q.id, assigned_to: assignees[i % assignees.length],
      title: `${plan.title} · ${q.number}`, event_type: plan.type, scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(), address: client?.address ?? null, status: plan.status,
    }]
  })
  if (rows.length > 0) check(await admin.from('work_events').insert(rows), 'insert events')
  return rows.length
}

export async function seedReminders(admin: Admin, orgId: string, ownerId: string, quotes: readonly SeededQuote[], rand: Rand): Promise<number> {
  const maintenance = quotes.filter((q) => q.status === 'cobrado').map((q, i) => ({
    organization_id: orgId, client_id: q.clientId, related_quote_id: q.id, created_by: ownerId,
    title: `Mantenimiento preventivo · ${q.number}`, description: 'Revisión anual del trabajo entregado.',
    reminder_type: 'maintenance', scheduled_date: isoDate(daysFromNow(i % 3 === 0 ? -rand.int(1, 5) : rand.int(3, 60))),
    priority: 'normal', status: 'pending', is_recurring: true, recurrence_interval_months: 12, notification_channels: ['whatsapp'],
  }))
  const followUps = quotes.filter((q) => q.status === 'sent' || q.status === 'viewed').map((q) => ({
    organization_id: orgId, client_id: q.clientId, related_quote_id: q.id, created_by: ownerId,
    title: `Dar seguimiento a ${q.number}`, description: 'Llamar para resolver dudas de la cotización.',
    reminder_type: 'follow_up', scheduled_date: isoDate(daysFromNow(rand.int(-2, 4))),
    priority: rand.pick(['normal', 'high']), status: 'pending', is_recurring: false, notification_channels: ['whatsapp'],
  }))
  const rows = [...maintenance, ...followUps]
  if (rows.length > 0) check(await admin.from('follow_up_reminders').insert(rows), 'insert reminders')
  return rows.length
}

export async function seedTemplates(admin: Admin, orgId: string, ownerId: string, catalog: SeededCatalog): Promise<number> {
  const simple = catalog.services.filter((s) => !s.pricing_blocks).slice(0, 2)
  if (simple.length === 0) return 0
  const items = simple.map((s) => ({ service_id: s.id, description: s.name, quantity: 1, unit_price: s.unit_price, unit_type: s.unit_type }))
  const rows = [
    { name: 'Visita y diagnóstico', description: 'Plantilla rápida para la primera visita.', default_items: items.slice(0, 1) },
    { name: 'Paquete temporada', description: 'Servicios más pedidos con precio promocional.', default_items: items, promotional_label: 'Promoción de temporada', promotional_valid_until: isoDate(daysFromNow(30)) },
  ].map((t) => ({
    ...t, organization_id: orgId, created_by: ownerId, default_discount_rate: 0, default_valid_days: 30, is_active: true,
    default_terms_and_conditions: 'Anticipo del 50 % para iniciar. Garantía de 6 meses.',
  }))
  check(await admin.from('quote_templates').insert(rows), 'insert templates')
  return rows.length
}
