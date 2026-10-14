import { isPlanId } from '@/lib/plans/catalog'
import type { BillingNoticeKind, BillingSnapshot, BillingState, OrganizationBillingRow } from './types'

const DAY_MS = 86_400_000
export const EXPIRY_WARNING_DAYS = 7
export const BILLING_TIME_ZONE = 'America/Monterrey'

export function snapshotFromRow(row: OrganizationBillingRow | null | undefined): BillingSnapshot {
  const plan = row?.plan
  return { planId: plan && isPlanId(plan) ? plan : 'free', currentPeriodEnd: row?.current_period_end ?? null }
}

/** Días que faltan, redondeados hacia arriba: 2 días y 1 hora cuentan como 3. Null si la fecha no es válida. */
export function daysUntilExpiry(periodEnd: string, now: Date): number | null {
  const end = new Date(periodEnd).getTime()
  if (Number.isNaN(end)) return null
  return Math.ceil((end - now.getTime()) / DAY_MS)
}

/** Debe coincidir con org_is_writable() de la migración 042. */
export function billingState(snapshot: BillingSnapshot, now: Date): BillingState {
  const { planId, currentPeriodEnd } = snapshot
  if (planId === 'free') return { kind: 'free' }
  const daysLeft = currentPeriodEnd ? daysUntilExpiry(currentPeriodEnd, now) : null
  if (!currentPeriodEnd || daysLeft === null) return { kind: 'open_ended', planId }
  if (new Date(currentPeriodEnd).getTime() <= now.getTime()) return { kind: 'expired', planId, periodEnd: currentPeriodEnd }
  if (daysLeft <= EXPIRY_WARNING_DAYS) return { kind: 'expiring', planId, periodEnd: currentPeriodEnd, daysLeft }
  return { kind: 'active', planId, periodEnd: currentPeriodEnd, daysLeft }
}

export function noticeKindFor(daysLeft: number): BillingNoticeKind | null {
  if (daysLeft <= 0) return 'd0'
  if (daysLeft === 1) return 'd1'
  if (daysLeft <= 3) return 'd3'
  if (daysLeft <= EXPIRY_WARNING_DAYS) return 'd7'
  return null
}

export function formatExpiryDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'fecha no disponible'
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: BILLING_TIME_ZONE,
  })
}
