import { EXTRA_USER_MONTHLY_PRICE, PLANS } from './catalog'
import type { MonthlyCost, PlanId } from './types'

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatMxn(amount: number): string {
  return mxn.format(amount)
}

/** Usuarios que se cobran aparte: los que exceden los incluidos, solo si el plan los admite. */
export function extraUsersFor(planId: PlanId, activeUsers: number): number {
  const plan = PLANS[planId]
  if (!plan.allowsExtraUsers) return 0
  return Math.max(0, Math.floor(activeUsers) - plan.includedUsers)
}

export function monthlyCost(planId: PlanId, activeUsers: number): MonthlyCost {
  const plan = PLANS[planId]
  const users = Math.max(0, Math.floor(activeUsers))
  const extraUsers = extraUsersFor(planId, users)
  const extraUsersCost = extraUsers * EXTRA_USER_MONTHLY_PRICE
  return {
    planId,
    basePrice: plan.monthlyPrice,
    includedUsers: plan.includedUsers,
    activeUsers: users,
    extraUsers,
    extraUsersCost,
    total: plan.monthlyPrice + extraUsersCost,
    overLimit: plan.allowsExtraUsers ? 0 : Math.max(0, users - plan.includedUsers),
  }
}

export function usersLabel(planId: PlanId): string {
  const plan = PLANS[planId]
  const base = plan.includedUsers === 1 ? '1 usuario incluido' : `${plan.includedUsers} usuarios incluidos`
  return plan.allowsExtraUsers ? `${base}, adicional ${formatMxn(EXTRA_USER_MONTHLY_PRICE)}/mes c/u` : base
}
