/**
 * Seed de la cuenta de presentación de MEGAGLASS: catálogo de vidrio, equipo de 3 roles y un caso de
 * ~6 semanas (solicitudes, cotizaciones por medidas, pagos, agenda, fotos, reseñas y recordatorios).
 * Idempotente: borra y recrea solo la org 00000000-0000-0000-00d0-000000000001. No entra en el reinicio diario.
 *
 *   SEED_PRESENTACION_PASSWORD=... pnpm --filter web seed:presentacion [--resumen=<archivo.json>]
 */
import { writeFileSync } from 'node:fs'
import * as path from 'node:path'
import * as dotenv from 'dotenv'
import { seedCatalog } from '../steps/catalog'
import { resetOrg } from '../steps/org'
import { seedProfile } from '../steps/showcase'
import { adminClient } from '../util'
import { CLIENTS, QUOTES, REMINDERS, REQUESTS } from './caso'
import { insertClients, insertQuotes } from './cotizaciones'
import { PRESENTACION } from './cuenta'
import { applySettings, insertPhotos, insertRequests, insertReminders, insertReviews, insertTemplates } from './vitrina'

function loadEnv(): { url: string; serviceKey: string; password: string } {
  dotenv.config({ path: process.env.SEED_ENV_FILE ?? path.resolve(__dirname, '../../../.env.local') })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const password = process.env.SEED_PRESENTACION_PASSWORD
  if (!url || !serviceKey) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  if (!password || password.length < 12) throw new Error('Define SEED_PRESENTACION_PASSWORD (mínimo 12 caracteres)')
  return { url, serviceKey, password }
}

async function main(): Promise<void> {
  const { url, serviceKey, password } = loadEnv()
  const admin = adminClient(url, serviceKey)
  const started = Date.now()
  const users = await resetOrg(admin, PRESENTACION, password)
  const orgId = PRESENTACION.id
  const catalog = await seedCatalog(admin, orgId, PRESENTACION.trade)
  await seedProfile(admin, orgId, PRESENTACION.profile)
  await applySettings(admin, orgId)
  const clients = await insertClients(admin, orgId, users.ownerId, CLIENTS)
  const quotes = await insertQuotes(admin, orgId, users.userIds, catalog, clients, QUOTES)
  const counts = {
    usuarios: users.userIds.length, servicios: catalog.services.length, listas: catalog.priceLists.length, clientes: clients.size, cotizaciones: quotes.length,
    fotos: await insertPhotos(admin, orgId, users.ownerId, QUOTES, quotes), reseñas: await insertReviews(admin, orgId, QUOTES, quotes),
    solicitudes: await insertRequests(admin, orgId, REQUESTS, quotes), recordatorios: await insertReminders(admin, orgId, users.ownerId, REMINDERS, quotes),
    plantillas: await insertTemplates(admin, orgId, users.ownerId, catalog),
  }
  process.stdout.write(`Presentación MEGAGLASS en ${new URL(url).host} · ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ')} · ${Date.now() - started} ms\n`)
  for (const q of quotes) process.stdout.write(`  ${q.number} ${q.status.padEnd(14)} total=${q.total.toFixed(2)} cobrado=${q.paid.toFixed(2)} (${q.key})\n`)
  const out = process.argv.find((a) => a.startsWith('--resumen='))?.slice('--resumen='.length)
  if (out) {
    writeFileSync(out, JSON.stringify({ generado: new Date().toISOString(), host: new URL(url).host, slug: PRESENTACION.slug, usuarios: PRESENTACION.users, counts, quotes }, null, 2))
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Seed de presentación falló: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
