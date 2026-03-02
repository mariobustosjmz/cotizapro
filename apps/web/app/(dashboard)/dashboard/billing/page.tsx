import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { PLANS, PlanId } from '@/lib/stripe/index'
import {
  getSubscriptionStatusLabel,
  calculateTrialDaysRemaining,
  formatUsageLimit,
} from '@/lib/stripe/helpers'
import { BillingClient } from './BillingClient'
import { CreditCard } from 'lucide-react'

export const metadata = {
  title: 'Billing',
  description: 'Manage your subscription and billing settings',
}

export default async function BillingPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, plan, subscription_status, stripe_customer_id, trial_ends_at')
    .eq('id', profile.organization_id)
    .single()

  if (orgError || !organization) {
    redirect('/dashboard')
  }

  const currentPlan = (organization.plan || 'free') as PlanId
  const planDetails = PLANS[currentPlan]
  const subscriptionStatus = organization.subscription_status || 'trialing'
  const trialDaysRemaining = organization.trial_ends_at
    ? calculateTrialDaysRemaining(organization.trial_ends_at)
    : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
          <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Facturacion</h2>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Gestiona tu suscripcion y pagos</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Plan Actual</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{planDetails.name}</p>
          {planDetails.price !== null && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {planDetails.price === 0 ? 'Gratis' : `$${planDetails.price}/mes`}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Estado</p>
          <div className="mt-1">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                subscriptionStatus === 'active'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : subscriptionStatus === 'trialing'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}
            >
              {getSubscriptionStatusLabel(subscriptionStatus)}
            </span>
          </div>
          {trialDaysRemaining !== null && subscriptionStatus === 'trialing' && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{trialDaysRemaining} dias restantes</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Limites</p>
          <div className="space-y-1 text-sm mt-1">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Proyectos:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatUsageLimit(planDetails.limits.projects)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">API/dia:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatUsageLimit(planDetails.limits.apiCalls)}</span>
            </div>
          </div>
        </div>
      </div>

      <BillingClient
        currentPlan={currentPlan}
        organizationId={organization.id}
        subscriptionStatus={subscriptionStatus}
      />
    </div>
  )
}
