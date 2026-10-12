/**
 * Simulación de una semana completa de un taller nuevo, operada 100 % desde la interfaz (sin sembrar datos
 * ni llamar a la API directamente). Cada paso deja captura, bitácora y hallazgos en docs/handoff/semana-<env>.
 *
 *   pnpm exec tsx scripts/walkthrough/semana/run.ts [baseURL]
 *
 * La contraseña de la cuenta se genera al azar y solo se escribe en credenciales.txt (permiso 600, no se versiona).
 */
import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { dia1, dia2, dia3 } from './dias-1-3'
import { dia4, dia5, dia6 } from './dias-4-6'
import { OWNER_NAME } from './escenario'
import type { Week } from './flujo'
import { Pacer, Recorder, todayIso, weekDates, type Session } from './kit'

const BASE = (process.argv[2] ?? 'https://cotizapro.mariobustos.io').replace(/\/$/, '')
const ENV_NAME = /localhost|127\.0\.0\.1/.test(BASE) ? 'local' : 'prod'
const OUT = path.resolve(__dirname, `../../../../../docs/handoff/semana-${ENV_NAME}`)
const STAMP = Date.now().toString().slice(-5)
const OWNER = {
  fullName: OWNER_NAME,
  email: `sofia.delvalle.${STAMP}@e2e.cotizapro.mx`,
  password: process.env.WALKTHROUGH_PASSWORD ?? `Cv-${randomBytes(9).toString('base64url')}`,
  business: `Cristalería Del Valle ${STAMP}`,
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  writeFileSync(path.join(OUT, 'credenciales.txt'), `Panel: ${BASE}/login\nCorreo: ${OWNER.email}\nContraseña: ${OWNER.password}\n`, { mode: 0o600 })
  const useUtc = ENV_NAME === 'prod'
  const dates = weekDates(useUtc)
  const rec = new Recorder(OUT, dates)
  const pacer = new Pacer(BASE, ENV_NAME === 'prod', (t) => rec.log(t))
  const started = Date.now()
  process.stdout.write(`Semana simulada contra ${BASE} · ${OWNER.business} · salida ${OUT}\n`)

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'es-MX', timezoneId: 'America/Monterrey', acceptDownloads: true })
  pacer.attach(ctx)
  const page = await ctx.newPage()
  const s: Session = { page, base: BASE, rec, pacer }
  const w: Week = { s, browser, dates, today: todayIso(useUtc), out: OUT, reviews: new Map(), slug: '' }
  const meta = () => ({ base: BASE, env: ENV_NAME, business: OWNER.business, owner: OWNER.fullName, email: OWNER.email, slug: w.slug, dates, startedAt: new Date(started).toISOString(), finishedAt: new Date().toISOString(), minutes: Math.round((Date.now() - started) / 60_000), apiRequests: pacer.total, throttled: pacer.throttled, pausedSeconds: Math.round(pacer.pausedMs / 1000) })
  try {
    await dia1(w, OWNER)
    await dia2(w)
    await dia3(w)
    await dia4(w)
    await dia5(w)
    await dia6(w)
    if (pacer.pausedMs > 0 || pacer.throttled > 0) rec.finding('media', 'Límite de 100 peticiones cada 15 min por IP', `Una sola persona operando una semana normal generó ${pacer.total} peticiones; el recorrido tuvo que pausar ${Math.round(pacer.pausedMs / 60_000)} min${pacer.throttled ? ` y recibió ${pacer.throttled} respuestas 429` : ''}. Un equipo detrás de la misma IP de oficina chocaría con el límite.`, 'apps/web/lib/rate-limit.ts')
    rec.save(meta())
    process.stdout.write(`\nListo: ${rec.steps.length} capturas, ${pacer.total} peticiones /api, ${rec.findings.length} hallazgos.\n`)
  } catch (error) {
    await page.screenshot({ path: path.join(OUT, 'zz-error.png'), fullPage: true }).catch(() => undefined)
    rec.save({ ...meta(), error: String(error), failedAt: page.url() })
    throw error
  } finally {
    await browser.close()
  }
}

void main()
