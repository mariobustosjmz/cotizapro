/** Datos mínimos que dibuja QuotePDF. Una QuoteWithItems completa también cumple esta forma. */
export interface QuotePdfItem {
  readonly id: string
  readonly description: string
  readonly quantity: number
  readonly unit_type: string
  readonly unit_price: number
  readonly subtotal: number
  readonly breakdown?: unknown
}

export interface QuotePdfData {
  readonly quote_number: string
  readonly created_at: string
  readonly valid_until: string
  readonly subtotal: number
  readonly discount_rate: number
  readonly discount_amount: number
  readonly tax_rate: number
  readonly tax_amount: number
  readonly total: number
  readonly notes: string | null
  readonly terms_and_conditions: string | null
  readonly client: { readonly name: string; readonly email: string | null; readonly phone: string | null }
  readonly items: readonly QuotePdfItem[]
}
