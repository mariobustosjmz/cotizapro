import { redirect } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { EXTRA_USER_MONTHLY_PRICE, PLANS, isPlanId } from '@/lib/plans/catalog'
import { formatMxn, monthlyCost } from '@/lib/plans/pricing'
import { isCheckoutConfigured } from '@/lib/stripe/index'
import { countOrganizationMembers } from '@/lib/billing/member-count'
import { calculateTrialDaysRemaining, getSubscriptionStatusLabel } from '@/lib/stripe/helpers'
import { BillingClient } from './BillingClient'

export const metadata = {
  title: 'Facturación - CotizaPro',
  description: 'Tu plan, usuarios y pagos',
}

const STATUS_STYLE: Readonly<Record<string, string>> = {
  active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  trialing: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
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
      .select('id, plan, subscription_status, stripe_customer_id, trial_ends_at')
      .eq('id', profile.organization_id)
      .single(),
    countOrganizationMembers(supabase),
  ])
  if (orgError || !organization) redirect('/dashboard')

  const currentPlan = organization.plan && isPlanId(organization.plan) ? organization.plan : 'free'
  const plan = PLANS[currentPlan]
  const cost = monthlyCost(currentPlan, activeUsers ?? 1)
  const status = organization.subscription_status || 'trialing'
  const trialDays = organization.trial_ends_at ? calculateTrialDaysRemaining(organization.trial_ends_at) : null
  const canManage = profile.role === 'owner' || profile.role === 'admin'

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Plan actual</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[status] ?? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
              {getSubscriptionStatusLabel(status)}
            </span>
            {trialDays !== null && status === 'trialing' && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{trialDays} días restantes</span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Usuarios</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {cost.activeUsers} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">de {plan.includedUsers} incluidos</span>
          </p>
          {cost.extraUsers > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cost.extraUsers} adicionales × {formatMxn(EXTRA_USER_MONTHLY_PRICE)}</p>
          )}
          {cost.overLimit > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">El plan {plan.name} es para 1 persona: cambia a Taller para sumar equipo</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Total mensual estimado</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatMxn(cost.total)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Plan {formatMxn(cost.basePrice)}{cost.extraUsers > 0 ? ` + usuarios ${formatMxn(cost.extraUsersCost)}` : ''}
          </p>
        </div>
      </div>

      <BillingClient
        currentPlan={currentPlan}
        activeUsers={cost.activeUsers}
        checkoutEnabled={isCheckoutConfigured()}
        canManage={canManage}
        hasBillingAccount={Boolean(organization.stripe_customer_id)}
      />
    </div>
  )
}
