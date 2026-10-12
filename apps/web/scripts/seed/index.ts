/**
 * Seed demo multi-cuenta (empresa, grupo, personas) para pruebas, demos y simulaciones.
 * Idempotente: borra y recrea las orgs demo con UUID fijo. Usa service role; ejecutar solo
 * en local o en el shell del servidor, nunca desde una ruta.
 *
 * Uso: SEED_DEMO_PASSWORD=... pnpm --filter web seed [--only=<slug>]
 */
import { CLIMASOL_ORG_ID, SEED_ACCOUNTS, type SeedAccount } from './data/accounts'
import { seedEvents, seedReminders, seedTemplates } from './steps/agenda'
import { seedCatalog } from './steps/catalog'
import { seedClients } from './steps/clients'
import { resetOrg } from './steps/org'
import { seedPayments, seedQuotes } from './steps/quotes'
import { seedPhotos, seedProfile, seedRequests, seedReviews } from './steps/showcase'
import { type Admin, adminClient, check, loadEnv, makeRand } from './util'

async function seedAccount(admin: Admin, account: SeedAccount, password: string): Promise<Record<string, number>> {
  const rand = makeRand(account.seed)
  const users = await resetOrg(admin, account, password)
  const catalog = await seedCatalog(admin, account.id, account.trade)
  const clients = await seedClients(admin, account.id, users.ownerId, rand, Math.max(6, Math.round(account.quoteCount / 2)))
  const quotes = await seedQuotes(admin, account.id, users.ownerId, catalog, clients, rand, account.quoteCount)
  await seedProfile(admin, account.id, account.profile)
  return {
    usuarios: users.userIds.length,
    listas: catalog.priceLists.length,
    servicios: catalog.services.length,
    clientes: clients.length,
    cotizaciones: quotes.length,
    pagos: await seedPayments(admin, account.id, users.ownerId, quotes, rand),
    eventos: await seedEvents(admin, account.id, users.userIds, quotes, clients, rand),
    recordatorios: await seedReminders(admin, account.id, users.ownerId, quotes, rand),
    plantillas: await seedTemplates(admin, account.id, users.ownerId, catalog),
    fotos: await seedPhotos(admin, account.id, users.ownerId, quotes),
    reseñas: await seedReviews(admin, account.id, quotes, rand),
    solicitudes: await seedRequests(admin, account.id, rand),
  }
}

async function enrichClimaSol(admin: Admin): Promise<boolean> {
  const { data } = await admin.from('organizations').select('id').eq('id', CLIMASOL_ORG_ID).maybeSingle()
  if (!data) return false
  check(await admin.from('organizations').update({ account_type: 'company', trade: 'hvac' }).eq('id', CLIMASOL_ORG_ID), 'climasol trade')
  await seedProfile(admin, CLIMASOL_ORG_ID, {
    displayName: 'ClimaSol HVAC', headline: 'Instalación y mantenimiento de minisplits',
    bio: 'Técnicos certificados en aire acondicionado residencial y comercial.', serviceArea: 'Área metropolitana de Monterrey',
    city: 'Monterrey, N.L.', whatsapp: '528156789012',
  })
  return true
}

async function main(): Promise<void> {
  const { url, serviceKey, demoPassword } = loadEnv()
  const admin = adminClient(url, serviceKey)
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length)
  const accounts = SEED_ACCOUNTS.filter((a) => !only || a.slug === only)
  process.stdout.write(`Seed contra ${new URL(url).host} · ${accounts.length} cuentas\n`)
  for (const account of accounts) {
    const started = Date.now()
    const counts = await seedAccount(admin, account, demoPassword)
    const summary = Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ')
    process.stdout.write(`  [ok] ${account.slug} (${account.accountType}/${account.trade}) ${summary} · ${Date.now() - started} ms\n`)
  }
  if (!only) {
    const enriched = await enrichClimaSol(admin)
    process.stdout.write(enriched ? '  [ok] climasol vitrina publicada\n' : '  [skip] climasol no existe en esta base\n')
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Seed falló: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
