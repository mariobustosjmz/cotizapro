import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/index'
import { buildCheckoutItems } from '@/lib/billing/checkout-items'
import { countOrganizationMembers } from '@/lib/billing/member-count'
import type { PlanId } from '@/lib/plans/types'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkoutSchema } from '@/lib/validations/billing'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    // Parse and validate request body
    const body = await request.json()
    const validated = checkoutSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    // Authenticate user via Supabase
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, email, full_name, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo dirección o administración pueden cambiar el plan' },
        { status: 403 }
      )
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', profile.organization_id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const activeUsers = await countOrganizationMembers(supabase)
    if (activeUsers === null) {
      return NextResponse.json(
        { error: 'No se pudo contar los usuarios de la cuenta' },
        { status: 500 }
      )
    }

    const checkoutItems = buildCheckoutItems(validated.data.planId as PlanId, activeUsers)
    if (!checkoutItems.ok) {
      return NextResponse.json({ error: checkoutItems.error }, { status: 400 })
    }

    // Create or retrieve Stripe customer
    let customerId = organization.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || organization.name,
        metadata: {
          organization_id: organization.id,
        },
      })
      customerId = customer.id

      // Update organization with Stripe customer ID
      // stripe_customer_id solo se escribe con service role (trigger guard_org_billing_columns).
      await createAdminClient()
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organization.id)
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: checkoutItems.items.map((item) => ({ ...item })),
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

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
