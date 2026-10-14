import { monthlyCost } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'

/** Monto que se registra en plan_activations: costo mensual con usuarios adicionales por meses. Gratis es 0. */
export function activationAmount(planId: PlanId, users: number, months: number): number {
  if (planId === 'free') return 0
  const wholeMonths = Math.max(0, Math.floor(months))
  return monthlyCost(planId, users).total * wholeMonths
}
