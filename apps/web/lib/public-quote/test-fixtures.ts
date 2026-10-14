import type { PublicQuote } from './types'

export const publicQuoteFixture: PublicQuote = {
  business: { name: 'MEGAGLASS', brand_color: '#0E7490', logo_url: 'https://example.com/logo.png', phone: '528112345678' },
  client_first_name: 'Laura',
  quote_number: 'COT-2026-0007',
  issued_on: '2026-10-13',
  valid_until: '2026-10-28',
  status: 'sent',
  is_expired: false,
  accepted_at: null,
  rejected_at: null,
  accepted_by_name: null,
  subtotal: 1500,
  discount_rate: 0,
  discount_amount: 0,
  tax_rate: 16,
  tax_amount: 240,
  total: 1740,
  terms: '50 % de anticipo al aceptar.',
  items: [{ description: 'Cancel de baño templado', quantity: 1, unit_type: 'fixed', unit_price: 1500, subtotal: 1500 }],
  deposit: { percent: 50, instructions: null, payment_url: null },
  is_owner_preview: false,
}
