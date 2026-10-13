import { PLAN_ORDER } from '@/lib/plans/catalog'
import type { PlanId } from '@/lib/plans/types'
import { planPriceId } from '@/lib/stripe/index'

export function formatPrice(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount)
}

const STATUS_LABELS: Readonly<Record<string, string>> = {
  trialing: 'Periodo de prueba',
  active: 'Activa',
  past_due: 'Pago vencido',
  canceled: 'Cancelada',
  unpaid: 'Sin pagar',
}

export function getSubscriptionStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function isSubscriptionActive(status: string): boolean {
  return status === 'active' || status === 'trialing'
}

export function calculateTrialDaysRemaining(trialEndsAt: string): number {
  const daysRemaining = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return Math.max(0, daysRemaining)
}

/**
 * Una suscripción trae el precio base del plan y, si aplica, la línea de usuarios adicionales.
 * El plan es el primer precio base que se reconozca; sin coincidencia queda en Gratis.
 */
export function planFromPriceIds(priceIds: readonly (string | null | undefined)[]): PlanId {
  for (const planId of PLAN_ORDER) {
    const id = planPriceId(planId)
    if (id && priceIds.includes(id)) return planId
  }
  return 'free'
}
