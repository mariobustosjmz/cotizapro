import type { OrgSettings } from '@/lib/pdf/QuotePDF'
import type { QuotePdfData } from '@/lib/pdf/quote-pdf-types'
import type { PublicQuote } from './types'

/** El PDF público usa exactamente los datos de get_public_quote: sin contacto del cliente, notas ni costos. */
export function toPdfQuote(quote: PublicQuote): QuotePdfData {
  return {
    quote_number: quote.quote_number,
    created_at: quote.issued_on,
    valid_until: quote.valid_until,
    subtotal: quote.subtotal,
    discount_rate: quote.discount_rate,
    discount_amount: quote.discount_amount,
    tax_rate: quote.tax_rate,
    tax_amount: quote.tax_amount,
    total: quote.total,
    notes: null,
    terms_and_conditions: quote.terms,
    client: { name: quote.client_first_name ?? 'Cliente', email: null, phone: null },
    items: quote.items.map((item, index) => ({ id: `item-${index + 1}`, ...item })),
  }
}

export function toPdfOrgSettings(quote: PublicQuote): OrgSettings {
  const { phone, logo_url, brand_color } = quote.business
  return {
    ...(phone ? { company_phone: phone } : {}),
    ...(logo_url ? { logo_url } : {}),
    ...(brand_color ? { brand_color } : {}),
  }
}
