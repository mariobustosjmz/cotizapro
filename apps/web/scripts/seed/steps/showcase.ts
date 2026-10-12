import { createHash, randomBytes } from 'crypto'
import type { SeedAccount } from '../data/accounts'
import { REQUEST_MESSAGES, REVIEW_COMMENTS } from '../data/people'
import type { SeededQuote } from './quotes'
import { type Admin, check, daysFromNow, placeholderPng, type Rand } from '../util'

type Profile = SeedAccount['profile']

export async function seedProfile(admin: Admin, orgId: string, profile: Profile): Promise<void> {
  check(
    await admin.from('public_profiles').upsert({
      organization_id: orgId, display_name: profile.displayName, headline: profile.headline, bio: profile.bio,
      service_area: profile.serviceArea, city: profile.city, whatsapp_phone: profile.whatsapp, is_published: true, show_prices: true,
    }, { onConflict: 'organization_id' }),
    'upsert profile',
  )
}

const BEFORE = [[120, 115, 105], [170, 160, 140]] as const
const AFTER = [[40, 110, 170], [170, 215, 240]] as const

export async function seedPhotos(admin: Admin, orgId: string, ownerId: string, quotes: readonly SeededQuote[]): Promise<number> {
  const done = quotes.filter((q) => q.status === 'cobrado' || q.status === 'completado').slice(0, 5)
  let count = 0
  for (const [i, q] of done.entries()) {
    for (const kind of ['before', 'after'] as const) {
      const [from, to] = kind === 'before' ? BEFORE : AFTER
      const path = `${orgId}/${q.id}/${kind}-${i}.png`
      const upload = await admin.storage.from('job-photos').upload(path, placeholderPng(480, 360, from, to), { contentType: 'image/png', upsert: true })
      if (upload.error) throw new Error(`upload ${path}: ${upload.error.message}`)
      check(await admin.from('job_photos').insert({
        organization_id: orgId, quote_id: q.id, storage_path: path, kind, is_public: i < 4, created_by: ownerId,
        caption: kind === 'before' ? `Antes · ${q.number}` : `Terminado · ${q.number}`, sort_order: count,
      }), `photo ${path}`)
      count++
    }
  }
  return count
}

function tokenHash(): string {
  return createHash('sha256').update(randomBytes(24).toString('hex')).digest('hex')
}

export async function seedReviews(admin: Admin, orgId: string, quotes: readonly SeededQuote[], rand: Rand): Promise<number> {
  const paid = quotes.filter((q) => q.status === 'cobrado')
  const rows = paid.map((q, i) => {
    const pending = i === paid.length - 1
    const rating = pending ? null : rand.pick([5, 5, 5, 4, 5, 4, 3] as const)
    const comment = rating ? rand.pick(REVIEW_COMMENTS[rating]) : null
    return {
      organization_id: orgId, quote_id: q.id, client_id: q.clientId, rating, comment, token_hash: tokenHash(),
      token_expires_at: daysFromNow(30).toISOString(), submitted_at: pending ? null : new Date(q.createdAt.getTime() + 20 * 86_400_000).toISOString(),
      owner_reply: i === 0 ? '¡Gracias por su confianza! Fue un gusto trabajar con usted.' : null,
    }
  })
  if (rows.length > 0) check(await admin.from('reviews').insert(rows), 'insert reviews')
  return rows.filter((r) => r.submitted_at).length
}

export async function seedRequests(admin: Admin, orgId: string, rand: Rand): Promise<number> {
  const names = ['Ana Martínez', 'Carlos Leal', 'Sofía Garza', 'Diego Villarreal', 'Lucía Treviño']
  const statuses = ['new', 'new', 'new', 'discarded', 'new'] as const
  const rows = names.map((name, i) => ({
    organization_id: orgId, name, phone: `81${rand.int(10_000_000, 99_999_999)}`, email: i % 2 === 0 ? `solicitud${i}@correo.demo.cotizapro.mx` : null,
    message: REQUEST_MESSAGES[i % REQUEST_MESSAGES.length]!, details: i === 0 ? { medidas: '1.20 x 1.80 m', piezas: '2' } : {},
    status: statuses[i], created_at: daysFromNow(-rand.int(0, 6), rand.int(8, 20)).toISOString(),
  }))
  check(await admin.from('quote_requests').insert(rows), 'insert requests')
  return rows.length
}
