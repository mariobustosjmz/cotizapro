import { BILLING_TIME_ZONE } from '@/lib/billing/expiry'
import { PLANS } from './catalog'
import type { LimitCheck, PlanFeature, PlanId, PlanLimits } from './types'

export const FREE_MONTHLY_QUOTES = 5
/** México eliminó el horario de verano en 2022: Monterrey queda fijo en UTC−6. */
const LIMITS_UTC_OFFSET = '-06:00'

const SOLO_FEATURES: readonly PlanFeature[] = ['templates', 'analytics', 'reminders']
const TEAM_FEATURES: readonly PlanFeature[] = [...SOLO_FEATURES, 'team_roles', 'job_photos', 'kanban_board']

const FEATURES_BY_PLAN: Readonly<Record<PlanId, readonly PlanFeature[]>> = {
  free: [],
  starter: SOLO_FEATURES,
  pro: TEAM_FEATURES,
  enterprise: TEAM_FEATURES,
}

export function planLimits(planId: PlanId): PlanLimits {
  const plan = PLANS[planId]
  return {
    planId,
    includedUsers: plan.includedUsers,
    allowsExtraUsers: plan.allowsExtraUsers,
    monthlyQuotes: planId === 'free' ? FREE_MONTHLY_QUOTES : null,
    features: FEATURES_BY_PLAN[planId],
  }
}

/** Decisión 5 del spec: durante el piloto los límites están programados pero apagados. */
export function planLimitsEnforced(value: string | undefined = process.env.PLAN_LIMITS_ENFORCED): boolean {
  return value === 'true'
}

export function checkSeatLimit(planId: PlanId, members: number, pendingInvitations: number): LimitCheck {
  const limits = planLimits(planId)
  if (limits.allowsExtraUsers || members + pendingInvitations < limits.includedUsers) return { allowed: true }
  return {
    allowed: false,
    code: 'SEAT_LIMIT',
    message: 'Tu plan es para una sola persona. Invitar equipo: Disponible en Taller.',
    upgradeTo: 'pro',
  }
}

export function checkMonthlyQuotes(planId: PlanId, createdThisMonth: number): LimitCheck {
  const { monthlyQuotes } = planLimits(planId)
  if (monthlyQuotes === null || createdThisMonth < monthlyQuotes) return { allowed: true }
  return {
    allowed: false,
    code: 'MONTHLY_QUOTES',
    message: `Llegaste a ${monthlyQuotes} este mes. Cambia de plan en Facturación para cotizar sin límite.`,
    upgradeTo: 'starter',
  }
}

export function monthStartIso(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BILLING_TIME_ZONE, year: 'numeric', month: '2-digit' }).formatToParts(now)
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  if (!year || !month) throw new Error('No se pudo calcular el mes en la zona horaria de Monterrey')
  return new Date(`${year}-${month}-01T00:00:00${LIMITS_UTC_OFFSET}`).toISOString()
}
