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
