/**
 * Excepción documentada: vista previa de solo lectura del correo de vencimiento. Se renderiza el HTML que
 * devuelve buildPlanExpiryEmail (lo mismo que manda el cron de avisos) en una página y se captura.
 * No envía nada ni cambia datos.
 */
import type { Browser } from '@playwright/test'
import { buildPlanExpiryEmail, type PlanExpiryEmailInput } from '@/lib/email/plan-expiry-email'
import { BASE, log, type Recorder } from './kit'

const DAY_MS = 86_400_000

export interface EmailSource {
  readonly businessName: string
  readonly ownerName: string | null
  readonly expiredAt: string
}

export async function sceneEmails(browser: Browser, rec: Recorder, src: EmailSource): Promise<void> {
  log('Escena 12 · Vista previa de los correos de vencimiento (solo lectura)')
  const base = { businessName: src.businessName, ownerName: src.ownerName, planName: 'Taller', renewUrl: `${BASE}/dashboard/billing` } as const
  const inputs: readonly (readonly [string, string, PlanExpiryEmailInput])[] = [
    ['correo-d3', 'Correo «vence en 3 días» (d3)', { ...base, kind: 'd3', daysLeft: 3, periodEnd: new Date(Date.now() + 3 * DAY_MS).toISOString() }],
    ['correo-d0', 'Correo «venció» (d0)', { ...base, kind: 'd0', daysLeft: 0, periodEnd: src.expiredAt }],
  ]
  const ctx = await browser.newContext({ viewport: { width: 640, height: 720 }, deviceScaleFactor: 1.5, locale: 'es-MX', timezoneId: 'America/Monterrey' })
  const page = await ctx.newPage()
  for (const [id, title, input] of inputs) {
    const email = buildPlanExpiryEmail(input)
    await page.setContent(email.html, { waitUntil: 'load' })
    await rec.shot(page, 12, id, title, {
      'Asunto': email.subject,
      'Texto plano': email.text.replace(/\n+/g, ' / '),
      'Datos de entrada': `${input.businessName} · ${input.ownerName ?? 'sin nombre'} · plan ${input.planName} · aviso ${input.kind} · vence ${input.periodEnd.slice(0, 10)}`,
      'Origen': 'buildPlanExpiryEmail() renderizado localmente; no se envió ningún correo',
    }, { full: true })
  }
  await ctx.close()
}
