export type QuoteRequestStatus = 'new' | 'converted' | 'discarded'

export type QuoteRequestFilter = QuoteRequestStatus | 'all'

export type QuoteRequestDetails = Readonly<Record<string, string>>

export interface QuoteRequest {
  readonly id: string
  readonly name: string
  readonly phone: string
  readonly email: string | null
  readonly message: string
  readonly details: QuoteRequestDetails
  readonly status: QuoteRequestStatus
  readonly client_id: string | null
  readonly quote_id: string | null
  readonly created_at: string
}

export interface QuoteRequestListResponse {
  readonly data: readonly QuoteRequest[]
  readonly total: number
}

export interface ConvertQuoteRequestResponse {
  readonly data: { readonly client_id: string }
}

export interface ApiErrorBody {
  readonly error?: string
}
