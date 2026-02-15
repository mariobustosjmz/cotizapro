import { NextRequest, NextResponse } from 'next/server'
import { stripe, PLANS } from '@/lib/stripe/index'
import { createServerClient } from '@/lib/supabase/server'
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
      .select('organization_id, email, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
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

    // Plan is free, no checkout needed
    if (validated.data.planId === 'free') {
      return NextResponse.json(
        { error: 'Free plan does not require payment' },
        { status: 400 }
      )
    }

    const planId = validated.data.planId as keyof typeof PLANS
    const plan = PLANS[planId]
    if (!plan.priceId) {
      return NextResponse.json(
        { error: 'Invalid plan selection' },
        { status: 400 }
      )
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
      await supabase
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

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
