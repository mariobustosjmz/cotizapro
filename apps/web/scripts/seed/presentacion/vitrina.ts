import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { SeededCatalog } from '../steps/catalog'
import { type Admin, check } from '../util'
import { COMPANY_SETTINGS } from './cuenta'
import type { SavedQuote } from './cotizaciones'
import { priceLines } from './cotizaciones'
import { addDays, instant, ymd } from './fechas'
import type { CaseQuote, CaseReminder, CaseRequest } from './tipos'

const FOTOS = path.resolve(__dirname, 'fotos')

function byKey(saved: readonly SavedQuote[], key: string): SavedQuote {
  const q = saved.find((s) => s.key === key)
  if (!q) throw new Error(`cotización desconocida: ${key}`)
  return q
}

export async function insertPhotos(admin: Admin, orgId: string, ownerId: string, quotes: readonly CaseQuote[], saved: readonly SavedQuote[]): Promise<number> {
  let order = 0
  for (const q of quotes) {
    const target = byKey(saved, q.key)
    for (const photo of q.photos ?? []) {
      const storagePath = `${orgId}/${target.id}/${photo.file}`
      const upload = await admin.storage.from('job-photos').upload(storagePath, readFileSync(path.join(FOTOS, photo.file)), { contentType: 'image/png', upsert: true })
      if (upload.error) throw new Error(`foto ${storagePath}: ${upload.error.message}`)
      check(await admin.from('job_photos').insert({
        organization_id: orgId, quote_id: target.id, storage_path: storagePath, kind: photo.kind, caption: photo.caption,
        is_public: photo.isPublic, sort_order: order++, created_by: ownerId,
      }), `foto ${photo.file}`)
    }
  }
  return order
}

export async function insertReviews(admin: Admin, orgId: string, quotes: readonly CaseQuote[], saved: readonly SavedQuote[]): Promise<number> {
  const rows = quotes.filter((q) => q.review).map((q) => {
    const target = byKey(saved, q.key)
    const submitted = instant(q.review!.day, 19)
    return {
      organization_id: orgId, quote_id: target.id, client_id: target.clientId, rating: q.review!.rating, comment: q.review!.comment,
      owner_reply: q.review!.reply ?? null, token_hash: createHash('sha256').update(randomBytes(24)).digest('hex'),
      token_expires_at: addDays(submitted, 30), submitted_at: submitted, is_visible: true,
    }
  })
  if (rows.length > 0) check(await admin.from('reviews').insert(rows), 'reseñas')
  return rows.length
}

export async function insertRequests(admin: Admin, orgId: string, requests: readonly CaseRequest[], saved: readonly SavedQuote[]): Promise<number> {
  const rows = requests.map((r) => {
    const converted = r.convertedTo ? byKey(saved, r.convertedTo) : null
    return {
      organization_id: orgId, name: r.name, phone: r.phone, email: r.email ?? null, message: r.message, details: r.details, status: r.status,
      client_id: converted?.clientId ?? null, quote_id: converted?.id ?? null, created_at: instant(r.when.day, r.when.hour),
    }
  })
  check(await admin.from('quote_requests').insert(rows), 'solicitudes')
  return rows.length
}

export async function insertReminders(admin: Admin, orgId: string, ownerId: string, reminders: readonly CaseReminder[], saved: readonly SavedQuote[]): Promise<number> {
  const rows = reminders.map((r) => {
    const target = byKey(saved, r.quote)
    return {
      organization_id: orgId, client_id: target.clientId, related_quote_id: target.id, created_by: ownerId, title: r.title, description: r.description,
      reminder_type: r.type, scheduled_date: ymd(r.day), priority: r.priority, status: 'pending', is_recurring: Boolean(r.recurringMonths),
      recurrence_interval_months: r.recurringMonths ?? null, notification_channels: ['whatsapp'],
    }
  })
  check(await admin.from('follow_up_reminders').insert(rows), 'recordatorios')
  return rows.length
}

/** Plantillas con partidas ya calculadas por el motor: el panel las recalcula al aplicarlas. */
export async function insertTemplates(admin: Admin, orgId: string, ownerId: string, catalog: SeededCatalog): Promise<number> {
  const bath = priceLines([
    { service: 'Cancel de baño templado', input: { ancho: 1200, alto: 1900, piezas: 1, espesor: '9', herraje: 'corredizo-aluminio', instalacion: true } },
    { service: 'Espejo a la medida', input: { ancho: 800, alto: 600, piezas: 1, espesor: '4', canto: 'pulido', instalacion: true } },
  ], catalog)
  const visit = priceLines([{ service: 'Visita de medición', quantity: 1 }], catalog)
  const strip = (items: typeof bath) => items.map((it) => ({ service_id: it.service_id, description: it.description, quantity: it.quantity, unit_price: it.unit_price, unit_type: it.unit_type, input: it.input }))
  const rows = [
    { name: 'Paquete Baño Completo', description: 'Cancel corredizo 9 mm + espejo pulido, el combo más pedido.', default_items: strip(bath), default_discount_rate: 5, promotional_label: 'Promo Otoño 5 %', promotional_valid_until: ymd(30) },
    { name: 'Visita de medición', description: 'Primera visita para tomar medidas; se descuenta al aprobar.', default_items: strip(visit), default_discount_rate: 0 },
  ].map((t) => ({ ...t, organization_id: orgId, created_by: ownerId, default_valid_days: COMPANY_SETTINGS.quote_valid_days, is_active: true, default_terms_and_conditions: COMPANY_SETTINGS.quote_terms }))
  check(await admin.from('quote_templates').insert(rows), 'plantillas')
  return rows.length
}

export async function applySettings(admin: Admin, orgId: string): Promise<void> {
  check(await admin.from('organizations').update({ settings: COMPANY_SETTINGS }).eq('id', orgId), 'configuración de empresa')
  check(await admin.from('public_profiles').update({ contact_email: COMPANY_SETTINGS.company_email }).eq('organization_id', orgId), 'correo de vitrina')
}
