/** Identificadores internos; coinciden con el CHECK de organizations.plan en la base. */
export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise'

export interface Plan {
  readonly id: PlanId
  readonly name: string
  readonly tagline: string
  readonly monthlyPrice: number
  readonly includedUsers: number
  /** false: el plan no admite usuarios adicionales; hay que cambiar de plan. */
  readonly allowsExtraUsers: boolean
  /** Créditos de IA incluidos al mes; espejo de ai_monthly_allowance() en la migración 043. */
  readonly aiCreditsMonthly: number
  readonly highlighted: boolean
  readonly features: readonly string[]
  readonly upcoming: readonly string[]
}

export interface MonthlyCost {
  readonly planId: PlanId
  readonly basePrice: number
  readonly includedUsers: number
  readonly activeUsers: number
  readonly extraUsers: number
  readonly extraUsersCost: number
  readonly total: number
  /** Usuarios por encima de lo que el plan permite (solo planes sin usuarios adicionales). */
  readonly overLimit: number
}

export type PlanFeature = 'templates' | 'analytics' | 'reminders' | 'team_roles' | 'job_photos' | 'kanban_board'

export interface PlanLimits {
  readonly planId: PlanId
  readonly includedUsers: number
  readonly allowsExtraUsers: boolean
  /** null: cotizaciones ilimitadas. */
  readonly monthlyQuotes: number | null
  readonly features: readonly PlanFeature[]
}

export type LimitCode = 'SEAT_LIMIT' | 'MONTHLY_QUOTES'

export type LimitCheck =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly code: LimitCode; readonly message: string; readonly upgradeTo: PlanId }
