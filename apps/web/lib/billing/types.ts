import type { PlanId } from '@/lib/plans/types'

export interface OrganizationBillingRow {
  readonly plan: string | null
  readonly current_period_end: string | null
  readonly billing_provider?: string | null
}

export interface BillingSnapshot {
  readonly planId: PlanId
  readonly currentPeriodEnd: string | null
}

export type PaidPlanId = Exclude<PlanId, 'free'>

export type BillingState =
  | { readonly kind: 'free' }
  | { readonly kind: 'open_ended'; readonly planId: PaidPlanId }
  | { readonly kind: 'active'; readonly planId: PaidPlanId; readonly periodEnd: string; readonly daysLeft: number }
  | { readonly kind: 'expiring'; readonly planId: PaidPlanId; readonly periodEnd: string; readonly daysLeft: number }
  | { readonly kind: 'expired'; readonly planId: PaidPlanId; readonly periodEnd: string }

export type BillingNoticeKind = 'd7' | 'd3' | 'd1' | 'd0'

export interface ExpiryBanner {
  readonly tone: 'warning' | 'danger'
  readonly message: string
  readonly ctaLabel: string
  readonly ctaHref: string
}

export interface BillingBadge {
  readonly label: string
  readonly tone: 'success' | 'info' | 'neutral' | 'danger'
}

export type PlanCheckoutOption =
  | { readonly kind: 'current' }
  | { readonly kind: 'included' }
  | { readonly kind: 'too_small' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'stripe' }
  | { readonly kind: 'auto_renewal' }
  | { readonly kind: 'mercadopago'; readonly url: string; readonly renewing: boolean }
  | { readonly kind: 'whatsapp'; readonly url: string | null; readonly total: number }

export interface CheckoutEnv {
  readonly MP_LINK_STARTER?: string
  readonly MP_LINK_PRO?: string
  readonly MP_LINK_ENTERPRISE?: string
  readonly SUPPORT_WHATSAPP_PHONE?: string
}

export interface DueNotice {
  readonly organizationId: string
  readonly organizationName: string
  readonly planId: PaidPlanId
  /** Texto tal como lo regresa PostgREST; se devuelve igual al reclamar para que la llave coincida al microsegundo. */
  readonly periodEnd: string
  readonly ownerEmail: string | null
  readonly ownerName: string | null
  readonly sentKinds: readonly BillingNoticeKind[]
}
