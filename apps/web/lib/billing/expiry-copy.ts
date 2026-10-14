import { PLANS } from '@/lib/plans/catalog'
import { formatExpiryDate } from './expiry'
import type { BillingState, ExpiryBanner } from './types'

const RENEW_HREF = '/dashboard/billing'

export function daysLabel(days: number): string {
  return days === 1 ? '1 día' : `${days} días`
}

export interface ExpiryBannerOptions {
  readonly autoRenews?: boolean
}

export function expiryBanner(state: BillingState, options: ExpiryBannerOptions = {}): ExpiryBanner | null {
  if (state.kind === 'expiring' && options.autoRenews) {
    return {
      tone: 'warning',
      message: `Tu plan ${PLANS[state.planId].name} vence en ${daysLabel(state.daysLeft)}. Si tu suscripción de Mercado Pago sigue activa, el cobro es automático y activamos el nuevo periodo al confirmarlo; no necesitas hacer nada.`,
      ctaLabel: 'Ver Facturación',
      ctaHref: RENEW_HREF,
    }
  }
  if (state.kind === 'expiring') {
    return {
      tone: 'warning',
      message: `Tu plan ${PLANS[state.planId].name} vence en ${daysLabel(state.daysLeft)}. Al vencer, la cuenta queda en solo lectura hasta renovar.`,
      ctaLabel: 'Renovar',
      ctaHref: RENEW_HREF,
    }
  }
  if (state.kind === 'expired') {
    return {
      tone: 'danger',
      message: `Tu plan ${PLANS[state.planId].name} venció el ${formatExpiryDate(state.periodEnd)}. La cuenta está en solo lectura: puedes ver y descargar todo, pero no crear, editar ni enviar.${options.autoRenews ? ' Si ya se hizo el pago, la reactivamos en cuanto confirmemos el cargo de Mercado Pago.' : ''}`,
      ctaLabel: 'Renovar',
      ctaHref: RENEW_HREF,
    }
  }
  return null
}

export function planStatusLine(state: BillingState): string {
  switch (state.kind) {
    case 'free':
      return 'Plan Gratis · sin vencimiento'
    case 'open_ended':
      return `Plan ${PLANS[state.planId].name} · sin fecha de vencimiento`
    case 'expired':
      return `Plan ${PLANS[state.planId].name} · venció el ${formatExpiryDate(state.periodEnd)} · solo lectura`
    default:
      return `Plan ${PLANS[state.planId].name} · vence el ${formatExpiryDate(state.periodEnd)}`
  }
}

export function adminExpiryLabel(state: BillingState): string {
  switch (state.kind) {
    case 'free':
      return 'Gratis · no vence'
    case 'open_ended':
      return 'Sin vencimiento'
    case 'expired':
      return 'Vencido'
    default:
      return `Vence en ${daysLabel(state.daysLeft)}`
  }
}
