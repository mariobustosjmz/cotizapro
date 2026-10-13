import { extraUsersFor } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'
import { extraUserPriceId, planPriceId } from '@/lib/stripe/index'

export interface CheckoutLineItem {
  readonly price: string
  readonly quantity: number
}

export type CheckoutItemsResult =
  | { readonly ok: true; readonly items: readonly CheckoutLineItem[] }
  | { readonly ok: false; readonly error: string }

/** Precio base del plan + una línea por cantidad para los usuarios activos arriba de los incluidos. */
export function buildCheckoutItems(planId: PlanId, activeUsers: number): CheckoutItemsResult {
  if (planId === 'free') return { ok: false, error: 'El plan Gratis no requiere pago' }
  const base = planPriceId(planId)
  if (!base) return { ok: false, error: 'El cobro en línea aún no está disponible' }
  const extra = extraUsersFor(planId, activeUsers)
  if (extra === 0) return { ok: true, items: [{ price: base, quantity: 1 }] }
  const extraPrice = extraUserPriceId()
  if (!extraPrice) return { ok: false, error: 'El cobro de usuarios adicionales aún no está disponible' }
  return { ok: true, items: [{ price: base, quantity: 1 }, { price: extraPrice, quantity: extra }] }
}
