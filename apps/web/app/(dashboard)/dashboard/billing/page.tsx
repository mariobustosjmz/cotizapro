import { redirect } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/plans/catalog'
import { monthlyCost } from '@/lib/plans/pricing'
import { planLimitsEnforced } from '@/lib/plans/limits'
import { isCheckoutConfigured } from '@/lib/stripe/index'
import { countOrganizationMembers } from '@/lib/billing/member-count'
import { autoRenewsFromRow, billingState, snapshotFromRow } from '@/lib/billing/expiry'
import { planStatusLine } from '@/lib/billing/expiry-copy'
import { billingBadge } from '@/lib/billing/badge'
import { checkoutEnvFrom, checkoutOptionsFor, hasMercadoPagoLinks } from '@/lib/billing/checkout-option'
import { BillingSummaryCards } from '@/components/billing/billing-summary-cards'
import { PlanLimitsTable } from '@/components/billing/plan-limits-table'
import { BillingClient } from './BillingClient'

export const metadata = {
  title: 'Facturación - CotizaPro',
  description: 'Tu plan, usuarios y pagos',
}

export default async function BillingPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (profileError || !profile) redirect('/login')

  const [{ data: organization, error: orgError }, activeUsers] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, plan, subscription_status, stripe_customer_id, current_period_end, billing_provider')
      .eq('id', profile.organization_id)
      .single(),
    countOrganizationMembers(supabase),
  ])
  if (orgError || !organization) redirect('/dashboard')

  const snapshot = snapshotFromRow(organization)
  const state = billingState(snapshot, new Date())
  const cost = monthlyCost(snapshot.planId, activeUsers ?? 1)
  const env = checkoutEnvFrom(process.env)
  const options = checkoutOptionsFor({
    currentPlan: snapshot.planId,
    state,
    activeUsers: cost.activeUsers,
    stripeEnabled: isCheckoutConfigured(),
    autoRenews: autoRenewsFromRow(organization),
    businessName: String(organization.name ?? ''),
    env,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
          <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Facturación</h2>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Tu plan, usuarios y pagos</p>
        </div>
      </div>

      <BillingSummaryCards
        planName={PLANS[snapshot.planId].name}
        statusLine={planStatusLine(state)}
        badge={billingBadge(state, organization.subscription_status)}
        cost={cost}
      />

      <BillingClient
        currentPlan={snapshot.planId}
        activeUsers={cost.activeUsers}
        options={options}
        mercadoPagoEnabled={hasMercadoPagoLinks(env)}
        canManage={profile.role === 'owner' || profile.role === 'admin'}
        hasBillingAccount={Boolean(organization.stripe_customer_id)}
      />

      <PlanLimitsTable enforced={planLimitsEnforced()} />
    </div>
  )
}
