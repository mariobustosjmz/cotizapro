import type { RoleKey } from './cuenta'

/** Día relativo a la fecha en que se corre el seed (0 = hoy) y hora local de pared. */
export interface When {
  readonly day: number
  readonly hour: number
}

export interface CaseClient {
  readonly key: string
  readonly name: string
  readonly company?: string
  readonly phone: string
  readonly email?: string
  readonly address: string
  readonly city: string
  readonly postalCode: string
  readonly tags: readonly string[]
  readonly notes?: string
}

export type ServiceName =
  | 'Cancel de baño templado' | 'Espejo a la medida' | 'Ventana de aluminio' | 'Vidrio a la medida'
  | 'Visita de medición' | 'Reposición de vidrio roto'

export interface CaseLine {
  readonly service: ServiceName
  readonly input?: Readonly<Record<string, number | string | boolean>>
  readonly quantity?: number
}

export type CaseStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'en_instalacion' | 'completado' | 'cobrado'

export interface CasePayment {
  readonly when: number
  readonly share: number | 'resto'
  readonly type: 'anticipo' | 'parcial' | 'liquidacion'
  readonly method: 'efectivo' | 'transferencia' | 'cheque' | 'otro'
  readonly notes: string
}

export interface CaseEvent {
  readonly title: string
  readonly type: 'instalacion' | 'medicion' | 'visita_tecnica' | 'mantenimiento' | 'otro'
  readonly start: When
  readonly hours: number
  readonly status: 'pendiente' | 'en_camino' | 'completado' | 'cancelado'
  readonly assignee: RoleKey
  readonly notes: string
}

export interface CasePhoto {
  readonly file: string
  readonly kind: 'before' | 'after' | 'other'
  readonly caption: string
  readonly isPublic: boolean
}

export interface CaseReview {
  readonly rating: number
  readonly comment: string
  readonly day: number
  readonly reply?: string
}

export interface CaseQuote {
  readonly key: string
  readonly client: string
  readonly story: string
  readonly created: When
  readonly status: CaseStatus
  readonly lines: readonly CaseLine[]
  readonly discountRate?: number
  readonly notes: string
  readonly sent?: number
  readonly viewed?: number
  readonly accepted?: number
  readonly rejected?: number
  readonly payments?: readonly CasePayment[]
  readonly events?: readonly CaseEvent[]
  readonly photos?: readonly CasePhoto[]
  readonly review?: CaseReview
}

export interface CaseReminder {
  readonly title: string
  readonly description: string
  readonly type: 'maintenance' | 'follow_up' | 'renewal' | 'custom'
  readonly day: number
  readonly priority: 'low' | 'normal' | 'high' | 'urgent'
  readonly quote: string
  readonly recurringMonths?: number
}

export interface CaseRequest {
  readonly name: string
  readonly phone: string
  readonly email?: string
  readonly message: string
  readonly details: Readonly<Record<string, string>>
  readonly when: When
  readonly status: 'new' | 'converted' | 'discarded'
  readonly convertedTo?: string
}
