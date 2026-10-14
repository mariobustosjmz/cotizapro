import type { ItemInput } from '@/lib/pricing/client-preview'

export type QuoteUnitType = 'fixed' | 'per_hour' | 'per_sqm' | 'per_unit' | 'per_lm'

/** Partida del formulario de cotización (nueva y edición). `needs_catalog` solo vive en el navegador. */
export interface QuoteFormItem {
  readonly description: string
  readonly quantity: number
  readonly unit_price: number
  readonly unit_type: QuoteUnitType
  readonly service_id: string | null
  readonly input?: ItemInput | null
  readonly needs_catalog?: boolean
  /** Solo navegador: la persona debe revisar la partida antes de guardar. */
  readonly needs_review?: boolean
  readonly review_reason?: string
}
