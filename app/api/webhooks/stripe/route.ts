import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/index'
import { createServerClient } from '@/lib/supabase/server'
import { getPlanNameByPriceId } from '@/lib/stripe/helpers'

// Map Stripe price IDs to plan names
function getPlanFromPrice(priceId: string | null): string {
  if (!priceId) return 'free'
  return getPlanNameByPriceId(priceId)
}

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  // Validate signature header exists
  if (!signature) {
    console.error('Webhook missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Validate STRIPE_WEBHOOK_SECRET is configured
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServerClient()

  try {
    // Check for duplicate webhook processing using idempotency
    const idempotencyKey = `${event.id}-${event.type}`
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', idempotencyKey)
      .single()

    if (existingEvent) {
      console.log(`Duplicate webhook event detected: ${idempotencyKey}`)
      return NextResponse.json({ received: true })
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get price ID to determine plan
        const priceId = subscription.items.data[0]?.price.id || null
        const plan = getPlanFromPrice(priceId)

        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            subscription_status: subscription.status,
            plan,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        if (updateError) {
          throw new Error(`Failed to update organization: ${updateError.message}`)
        }

        console.log(
          `Subscription ${subscription.status} for customer ${customerId}, plan: ${plan}`
        )
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            subscription_status: 'canceled',
            plan: 'free',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        if (updateError) {
          throw new Error(`Failed to update organization: ${updateError.message}`)
        }

        console.log(`Subscription canceled for customer ${customerId}`)
        break
      }

      case 'invoice.paid': {
        const invoiceObj = event.data.object as Record<string, any>
        const customerId = invoiceObj.customer as string

        // Get organization for metadata
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (orgError || !org) {
          console.error(`Organization not found for customer ${customerId}`)
          break
        }

        // Insert billing history record
        const { error: historyError } = await supabase
          .from('billing_history')
          .upsert(
            {
              organization_id: org.id,
              stripe_invoice_id: invoiceObj.id,
              stripe_payment_intent_id: invoiceObj.payment_intent as string | null,
              amount: invoiceObj.amount_paid || 0,
              currency: (invoiceObj.currency || 'usd').toUpperCase(),
              status: 'paid',
              billing_reason: invoiceObj.billing_reason || null,
              description: invoiceObj.description || null,
              invoice_url: invoiceObj.hosted_invoice_url || null,
              pdf_url: invoiceObj.invoice_pdf || null,
              period_start: invoiceObj.period_start ? new Date(invoiceObj.period_start * 1000).toISOString() : null,
              period_end: invoiceObj.period_end ? new Date(invoiceObj.period_end * 1000).toISOString() : null,
              due_date: invoiceObj.due_date ? new Date(invoiceObj.due_date * 1000).toISOString() : null,
              paid_at: invoiceObj.status_transitions?.paid_at ? new Date(invoiceObj.status_transitions.paid_at * 1000).toISOString() : null,
            },
            { onConflict: 'stripe_invoice_id' }
          )

        if (historyError) {
          console.error(`Failed to insert billing history: ${historyError.message}`)
        }

        console.log(`Invoice paid: ${invoiceObj.id} for customer ${customerId}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoiceObj = event.data.object as Record<string, any>
        const customerId = invoiceObj.customer as string

        // Update organization subscription status
        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        if (updateError) {
          console.error(`Failed to update organization: ${updateError.message}`)
        }

        // Get organization for billing history
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (org) {
          // Update billing history with failed status
          await supabase
            .from('billing_history')
            .upsert(
              {
                organization_id: org.id,
                stripe_invoice_id: invoiceObj.id,
                stripe_payment_intent_id: invoiceObj.payment_intent as string | null,
                amount: invoiceObj.amount_due || 0,
                currency: (invoiceObj.currency || 'usd').toUpperCase(),
                status: 'failed',
                billing_reason: invoiceObj.billing_reason || null,
                description: invoiceObj.description || null,
                invoice_url: invoiceObj.hosted_invoice_url || null,
              },
              { onConflict: 'stripe_invoice_id' }
            )
        }

        console.log(`Payment failed for customer ${customerId}`)
        break
      }

      case 'charge.refunded': {
        const chargeObj = event.data.object as Record<string, any>
        const customerId = chargeObj.customer as string

        // Get organization
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (org && chargeObj.invoice) {
          // Update billing history to mark as refunded/void
          await supabase
            .from('billing_history')
            .update({
              status: 'void',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_invoice_id', chargeObj.invoice as string)
        }

        console.log(`Charge refunded: ${chargeObj.id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Store processed event to prevent duplicates (if webhook_events table exists)
    try {
      const idempotencyKey = `${event.id}-${event.type}`
      await supabase
        .from('webhook_events')
        .insert({
          stripe_event_id: idempotencyKey,
          event_type: event.type,
          data: event.data,
        })
        .select()
    } catch (err) {
      // webhook_events table might not exist yet, log but continue
      console.log('Could not store webhook event (table may not exist yet)')
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Error processing webhook:', err)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
