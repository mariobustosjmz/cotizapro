import { z } from 'zod'

export const publicQuoteItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_type: z.string(),
  unit_price: z.number(),
  subtotal: z.number(),
})

export const publicQuoteSchema = z.object({
  business: z.object({
    name: z.string(),
    brand_color: z.string().nullable(),
    logo_url: z.string().nullable(),
    phone: z.string().nullable(),
  }),
  client_first_name: z.string().nullable(),
  quote_number: z.string(),
  issued_on: z.string(),
  valid_until: z.string(),
  status: z.string(),
  is_expired: z.boolean(),
  accepted_at: z.string().nullable(),
  rejected_at: z.string().nullable(),
  accepted_by_name: z.string().nullable(),
  subtotal: z.number(),
  discount_rate: z.number(),
  discount_amount: z.number(),
  tax_rate: z.number(),
  tax_amount: z.number(),
  total: z.number(),
  terms: z.string().nullable(),
  items: z.array(publicQuoteItemSchema),
  deposit: z.object({
    percent: z.number().int().min(0).max(100),
    instructions: z.string().nullable(),
    payment_url: z.string().nullable(),
  }),
  is_owner_preview: z.boolean(),
})

export type PublicQuote = z.infer<typeof publicQuoteSchema>
export type PublicQuoteItem = z.infer<typeof publicQuoteItemSchema>
export type PublicQuoteState = 'open' | 'accepted' | 'rejected' | 'expired' | 'closed'
export type BannerTone = 'info' | 'success' | 'warning' | 'neutral'

export interface StatusBanner {
  readonly tone: BannerTone
  readonly text: string
}
