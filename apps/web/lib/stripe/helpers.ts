import { PLANS, PlanId } from '@/lib/stripe/index'

export function getPlanLimits(planId: PlanId) {
  const plan = PLANS[planId]
  return plan.limits
}

export function getPlanFeatures(planId: PlanId) {
  const plan = PLANS[planId]
  return plan.features
}

export function getPlanPrice(planId: PlanId) {
  const plan = PLANS[planId]
  return plan.price
}

export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function isUnlimited(limit: number): boolean {
  return limit === -1
}

export function formatUsageLimit(limit: number): string {
  if (isUnlimited(limit)) {
    return 'Unlimited'
  }
  return limit.toLocaleString()
}

export function isUpgradeable(
  currentPlan: PlanId | null,
  newPlan: PlanId
): boolean {
  if (!currentPlan || currentPlan === 'free') {
    return true
  }

  const planOrder = ['free', 'starter', 'pro', 'enterprise'] as const
  const currentIndex = planOrder.indexOf(currentPlan as any)
  const newIndex = planOrder.indexOf(newPlan as any)

  return newIndex > currentIndex
}

export function isDowngradeable(
  currentPlan: PlanId | null,
  newPlan: PlanId
): boolean {
  if (!currentPlan || currentPlan === 'free') {
    return false
  }

  const planOrder = ['free', 'starter', 'pro', 'enterprise'] as const
  const currentIndex = planOrder.indexOf(currentPlan as any)
  const newIndex = planOrder.indexOf(newPlan as any)

  return newIndex < currentIndex
}

export function getSubscriptionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    trialing: 'Trial Period',
    active: 'Active',
    past_due: 'Past Due',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
  }
  return labels[status] || status
}

export function isSubscriptionActive(status: string): boolean {
  return status === 'active' || status === 'trialing'
}

export function calculateTrialDaysRemaining(trialEndsAt: string): number {
  const now = new Date()
  const trialEnd = new Date(trialEndsAt)
  const daysRemaining = Math.ceil(
    (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  return Math.max(0, daysRemaining)
}

export function getPlanNameByPriceId(
  priceId: string | null
): PlanId {
  for (const [planId, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) {
      return planId as PlanId
    }
  }
  return 'free'
}

export function getNextPlan(currentPlan: PlanId): PlanId | null {
  const planOrder = ['free', 'starter', 'pro', 'enterprise'] as const
  const currentIndex = planOrder.indexOf(currentPlan as any)

  if (currentIndex === -1 || currentIndex === planOrder.length - 1) {
    return null
  }

  return planOrder[currentIndex + 1] as PlanId
}
