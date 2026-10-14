import { PLANS } from '@/lib/plans/catalog'
import { formatMxn, monthlyCost } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'
import { whatsappLink } from '@/lib/whatsapp/link'
import type { BillingState, CheckoutEnv, PaidPlanId, PlanCheckoutOption } from './types'

const LINK_ENV: Readonly<Record<PaidPlanId, 'MP_LINK_STARTER' | 'MP_LINK_PRO' | 'MP_LINK_ENTERPRISE'>> = {
  starter: 'MP_LINK_STARTER',
  pro: 'MP_LINK_PRO',
  enterprise: 'MP_LINK_ENTERPRISE',
}

export interface CheckoutContext {
  readonly currentPlan: PlanId
  readonly state: BillingState
  readonly activeUsers: number
  readonly stripeEnabled: boolean
  readonly businessName: string
  readonly env: CheckoutEnv
}

export function checkoutEnvFrom(env: Readonly<Record<string, string | undefined>>): CheckoutEnv {
  return {
    MP_LINK_STARTER: env.MP_LINK_STARTER,
    MP_LINK_PRO: env.MP_LINK_PRO,
    MP_LINK_ENTERPRISE: env.MP_LINK_ENTERPRISE,
    SUPPORT_WHATSAPP_PHONE: env.SUPPORT_WHATSAPP_PHONE,
  }
}

/** Solo ligas https; cualquier otro valor cuenta como no configurado. */
export function mercadoPagoLink(planId: PlanId, env: CheckoutEnv): string | null {
  if (planId === 'free') return null
  const raw = env[LINK_ENV[planId]]?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function hasMercadoPagoLinks(env: CheckoutEnv): boolean {
  return (['starter', 'pro', 'enterprise'] as const).some((planId) => mercadoPagoLink(planId, env) !== null)
}

function businessLabel(ctx: CheckoutContext): string {
  return ctx.businessName.trim() || 'mi negocio'
}

function supportMessage(planId: PaidPlanId, ctx: CheckoutContext, total: number): string {
  return `Hola, quiero contratar el plan ${PLANS[planId].name} para ${businessLabel(ctx)} con ${ctx.activeUsers} usuarios (${formatMxn(total)} al mes). ¿Me mandan la liga de pago?`
}

export function checkoutOptionFor(planId: PlanId, ctx: CheckoutContext): PlanCheckoutOption {
  const renewing = ctx.state.kind === 'expired' || ctx.state.kind === 'expiring'
  if (planId === ctx.currentPlan && (planId === 'free' || !renewing)) return { kind: 'current' }
  if (planId === 'free') return { kind: 'included' }
  const cost = monthlyCost(planId, ctx.activeUsers)
  if (cost.overLimit > 0) return { kind: 'too_small' }
  const link = mercadoPagoLink(planId, ctx.env)
  if (!link) {
    if (ctx.stripeEnabled) return { kind: 'stripe' }
    // Sin liga ni Stripe, quien debe renovar necesita una salida: soporte por WhatsApp con el monto.
    if (renewing && planId === ctx.currentPlan) {
      return { kind: 'whatsapp', total: cost.total, url: whatsappLink(ctx.env.SUPPORT_WHATSAPP_PHONE, supportMessage(planId, ctx, cost.total)) }
    }
    return { kind: 'unavailable' }
  }
  if (cost.extraUsers > 0) {
    return { kind: 'whatsapp', total: cost.total, url: whatsappLink(ctx.env.SUPPORT_WHATSAPP_PHONE, supportMessage(planId, ctx, cost.total)) }
  }
  return { kind: 'mercadopago', url: link, renewing: planId === ctx.currentPlan }
}

export function checkoutOptionsFor(ctx: CheckoutContext): Readonly<Record<PlanId, PlanCheckoutOption>> {
  return {
    free: checkoutOptionFor('free', ctx),
    starter: checkoutOptionFor('starter', ctx),
    pro: checkoutOptionFor('pro', ctx),
    enterprise: checkoutOptionFor('enterprise', ctx),
  }
}

export function plansIntro(mercadoPagoEnabled: boolean, options: Readonly<Record<PlanId, PlanCheckoutOption>>): string {
  if (mercadoPagoEnabled) return 'Contrata con Mercado Pago. Activamos tu plan en cuanto confirmamos el pago.'
  if (Object.values(options).some((option) => option.kind === 'stripe')) return 'El costo se calcula con los usuarios activos de tu cuenta.'
  return 'La contratación en línea estará disponible próximamente. Mientras tanto tu cuenta conserva su plan actual.'
}
