import { PLANS, isPlanId } from '@/lib/plans/catalog'
import { formatMxn } from '@/lib/plans/pricing'
import { formatExpiryDate } from '@/lib/billing/expiry'
import type { PlanActivationRow } from './types'

function planName(plan: string): string {
  return isPlanId(plan) ? PLANS[plan].name : plan
}

function monthsPart(months: number | null): string {
  if (months === null) return ''
  return months === 1 ? ' · 1 mes' : ` · ${months} meses`
}

export function describeActivation(row: PlanActivationRow): string {
  if (row.action === 'suspend') return `Suspensión: ${row.reason ?? ''}`
  const amount = Number(row.amount)
  const amountPart = amount > 0 ? ` · ${formatMxn(amount)}` : ''
  const periodPart = row.period_end ? ` · hasta el ${formatExpiryDate(row.period_end)}` : ' · sin vencimiento'
  return `${planName(row.previous_plan)} → ${planName(row.new_plan)}${monthsPart(row.months)}${amountPart}${periodPart}`
}
