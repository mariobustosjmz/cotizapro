import { getSubscriptionStatusLabel } from '@/lib/stripe/helpers'
import type { BillingBadge, BillingState } from './types'

export function billingBadge(state: BillingState, subscriptionStatus: string | null): BillingBadge {
  if (state.kind === 'free') return { label: 'Gratis', tone: 'neutral' }
  if (state.kind === 'expired') return { label: 'Vencido', tone: 'danger' }
  if (state.kind === 'expiring') return { label: 'Por vencer', tone: 'info' }
  const status = subscriptionStatus ?? 'active'
  return { label: getSubscriptionStatusLabel(status), tone: status === 'active' ? 'success' : 'info' }
}
