/**
 * Recorrido de evidencia D1 + D2 contra el servidor local ya encendido, solo por la interfaz.
 * Excepciones documentadas: dar y quitar superadmin y restaurar a Don Beto (helpers de e2e, sin UI por
 * diseño) y la vista previa del correo de vencimiento. Los "antes/después" se leen con SELECT de solo lectura.
 *   DOTENV_CONFIG_QUIET=true pnpm exec tsx scripts/walkthrough/d1-d2/capturas.ts
 */
import { chromium } from '@playwright/test'
import { grantPlatformAdmin, restoreDonBeto, revokePlatformAdmin } from '../../../e2e/helpers/billing-admin'
import { DON_BETO, MEGAGLASS, Recorder, donBetoState, loadRun, login, log, newContext, newRun, platformAdminCount, readOnlyQuery } from './kit'
import { clearDepositViaUi, sceneOwnerSees, scenePublic, sceneSettings, sceneShare } from './escenas-d1'
import { sceneActivate, sceneAdmin, sceneBilling, sceneReadOnly, sceneRenewed, sceneSuspend } from './escenas-d2'
import { sceneEmails } from './correo'

async function cleanup(rec: Recorder): Promise<void> {
  log('Limpieza · restoreDonBeto() y revokePlatformAdmin(megaglass)')
  const errors: string[] = []
  await restoreDonBeto().catch((e: Error) => errors.push(`restoreDonBeto: ${e.message}`))
  await revokePlatformAdmin(MEGAGLASS).catch((e: Error) => errors.push(`revokePlatformAdmin: ${e.message}`))
  const after = donBetoState()
  const admins = platformAdminCount()
  const ok = after?.plan === 'pro' && after.subscription_status === 'active' && after.current_period_end === null
    && after.billing_provider === null && after.billing_reference === null && admins === 0
  const activations = readOnlyQuery<{ action: string; reference: string | null; reason: string | null; created_at: string }>(
    "select action, reference, reason, created_at from plan_activations where organization_id = '00000000-0000-0000-00c0-000000000003' and (reference like 'MP-EVIDENCIA%' or reason like 'MP-EVIDENCIA%') order by created_at",
  )
  rec.record('limpieza', { donBetoDespues: after, platformAdmins: admins, verificado: ok, errores: errors, activacionesQueQuedan: activations })
  log(`Limpieza ${ok ? 'verificada' : 'CON DIFERENCIAS'} · platform_admins=${admins} · ${errors.join('; ') || 'sin errores'}`)
}

/** Repite la escena 1 (capturas 01 y 02) sin tocar el resto del recorrido ya guardado en steps.json. */
async function retakeSettings(): Promise<void> {
  const run = loadRun()
  const kept = run.steps.filter((s) => s.scene !== 1)
  run.steps.splice(0, run.steps.length)
  const rec = new Recorder(run)
  const browser = await chromium.launch()
  try {
    const ctx = await newContext(browser, 'escritorio')
    const page = await ctx.newPage()
    await login(page, MEGAGLASS)
    log('Retoma escena 1 · se vacían liga e instrucciones por la UI para volver a mostrar el antes y el después')
    await clearDepositViaUi(page)
    await sceneSettings(page, rec)
    rec.note('Retoma de la escena 1: la primera captura recortaba el formulario completo y la sección Anticipo no salía en la imagen. Se vaciaron la liga y las instrucciones desde la misma pantalla, se guardó, y se repitió la escena (antes vacío → llenar → Guardar → releer).')
  } finally {
    run.steps.push(...kept)
    run.steps.sort((a, b) => a.n - b.n)
    rec.save()
    await browser.close()
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--solo-limpieza')) {
    const rec = new Recorder(loadRun())
    await cleanup(rec)
    rec.finish()
    return
  }
  if (process.argv.includes('--retomar-empresa')) {
    await retakeSettings()
    return
  }
  const run = newRun()
  const rec = new Recorder(run)
  rec.record('donBetoAntes', donBetoState())
  rec.record('platformAdminsAntes', platformAdminCount())
  const browser = await chromium.launch()
  try {
    const owner = await newContext(browser, 'escritorio')
    const mg = await owner.newPage()
    log('Login Megaglass por /login')
    await login(mg, MEGAGLASS)
    await sceneSettings(mg, rec)
    const d1 = await sceneShare(mg, rec)
    await scenePublic(browser, rec, d1)
    await sceneOwnerSees(mg, rec, d1)
    await sceneBilling(mg, rec)

    log('Excepción documentada · grantPlatformAdmin(megaglass)')
    await grantPlatformAdmin(MEGAGLASS)
    rec.record('platformAdminsTrasDar', platformAdminCount())
    await sceneAdmin(mg, rec)
    await sceneSuspend(mg, rec)

    const betoCtx = await newContext(browser, 'escritorio')
    const beto = await betoCtx.newPage()
    log('Login Don Beto por /login')
    await login(beto, DON_BETO)
    await sceneReadOnly(beto, rec)
    await sceneActivate(mg, rec)
    await sceneRenewed(beto, rec)

    const profile = readOnlyQuery<{ full_name: string | null }>(`select full_name from profiles where email = '${DON_BETO}'`)[0]
    const suspended = run.records.donBetoTrasSuspender as { base?: { current_period_end?: string } } | undefined
    await sceneEmails(browser, rec, {
      businessName: 'Plomería Don Beto',
      ownerName: profile?.full_name ?? null,
      expiredAt: suspended?.base?.current_period_end ?? new Date().toISOString(),
    })
    await betoCtx.close()
    await owner.close()
  } catch (e) {
    const message = (e as Error).message.split('\n')[0] ?? 'error'
    rec.note(`El recorrido se detuvo: ${message}`)
    process.exitCode = 1
  } finally {
    await cleanup(rec)
    rec.finish()
    await browser.close()
  }
}

void main()
