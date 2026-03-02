'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { stripe, PlanId, PLANS } from '@/lib/stripe/index'

export async function getCheckoutUrl(planId: PlanId): Promise<{
  success: boolean
  sessionId?: string
  error?: string
}> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, email, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('id', profile.organization_id)
    .single()

  if (!organization) {
    return { success: false, error: 'Organization not found' }
  }

  if (planId === 'free') {
    return { success: false, error: 'Free plan requires no payment' }
  }

  const plan = PLANS[planId]
  if (!plan.priceId) {
    return { success: false, error: 'Invalid plan' }
  }

  let customerId = organization.stripe_customer_id

  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || organization.name,
        metadata: {
          organization_id: organization.id,
        },
      })
      customerId = customer.id

      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organization.id)
    } catch (error) {
      return { success: false, error: 'Failed to create customer' }
    }
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
      subscription_data: {
        metadata: {
          organization_id: organization.id,
        },
      },
      metadata: {
        organization_id: organization.id,
      },
    })

    return { success: true, sessionId: session.id }
  } catch (error) {
    console.error('Stripe error:', error)
    return { success: false, error: 'Failed to create checkout session' }
  }
}

export async function getPortalUrl(returnUrl?: string): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', profile.organization_id)
    .single()

  if (!organization?.stripe_customer_id) {
    return { success: false, error: 'No billing information' }
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.billingPortal.sessions.create({
      customer: organization.stripe_customer_id,
      return_url: returnUrl || `${appUrl}/dashboard/billing`,
    })

    return { success: true, url: session.url }
  } catch (error) {
    console.error('Stripe error:', error)
    return { success: false, error: 'Failed to create portal session' }
  }
}
