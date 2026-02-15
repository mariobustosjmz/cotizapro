import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { PLANS, PlanId } from '@/lib/stripe/index'
import {
  getSubscriptionStatusLabel,
  calculateTrialDaysRemaining,
  formatUsageLimit,
} from '@/lib/stripe/helpers'
import { BillingClient } from './BillingClient'

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
    .select('*')
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-gray-600 mt-2">
          Manage your subscription, payment methods, and billing history
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            Current Plan
          </h3>
          <div className="text-2xl font-bold mb-4">{planDetails.name}</div>
          {planDetails.price !== null && (
            <div className="text-sm text-gray-600">
              {planDetails.price === 0 ? 'Free' : `$${planDetails.price}/month`}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            Status
          </h3>
          <div className="text-2xl font-bold mb-4">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                subscriptionStatus === 'active'
                  ? 'bg-green-50 text-green-700'
                  : subscriptionStatus === 'trialing'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-red-50 text-red-700'
              }`}
            >
              {getSubscriptionStatusLabel(subscriptionStatus)}
            </span>
          </div>
          {trialDaysRemaining !== null && subscriptionStatus === 'trialing' && (
            <div className="text-sm text-gray-600">
              {trialDaysRemaining} days remaining
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            Usage Limits
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Projects:</span>
              <span className="font-medium">
                {formatUsageLimit(planDetails.limits.projects)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">API Calls/day:</span>
              <span className="font-medium">
                {formatUsageLimit(planDetails.limits.apiCalls)}
              </span>
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
