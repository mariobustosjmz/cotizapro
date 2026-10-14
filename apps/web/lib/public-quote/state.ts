import { formatDateTime } from './format'
import type { PublicQuote, PublicQuoteState, StatusBanner } from './types'

const ACCEPTED: ReadonlySet<string> = new Set(['accepted', 'en_instalacion', 'completado', 'cobrado'])
const OPEN: ReadonlySet<string> = new Set(['sent', 'viewed'])
const PREVIEW_TEXT = 'Vista previa: así ve tu cliente esta cotización. Solo tu cliente puede aceptarla o rechazarla.'

type BannerInput = Pick<PublicQuote, 'status' | 'is_expired' | 'accepted_at' | 'accepted_by_name' | 'is_owner_preview'> & {
  readonly business: Pick<PublicQuote['business'], 'name'>
}

export function publicQuoteState(quote: Pick<PublicQuote, 'status' | 'is_expired'>): PublicQuoteState {
  if (ACCEPTED.has(quote.status)) return 'accepted'
  if (quote.status === 'rejected') return 'rejected'
  if (quote.status === 'expired') return 'expired'
  if (!OPEN.has(quote.status)) return 'closed'
  return quote.is_expired ? 'expired' : 'open'
}

function acceptedText(quote: BannerInput): string {
  const when = quote.accepted_at ? ` el ${formatDateTime(quote.accepted_at)}` : ''
  const who = quote.accepted_by_name ? ` por ${quote.accepted_by_name}` : ''
  return `Cotización aceptada${when}${who}.`
}

export function statusBanner(quote: BannerInput): StatusBanner | null {
  const business = quote.business.name
  switch (publicQuoteState(quote)) {
    case 'accepted':
      return { tone: 'success', text: acceptedText(quote) }
    case 'rejected':
      return { tone: 'neutral', text: `Esta cotización fue rechazada. Si cambias de opinión, escríbele a ${business}.` }
    case 'expired':
      return { tone: 'warning', text: `Vencida: pide una actualización a ${business}.` }
    case 'closed':
      return { tone: 'neutral', text: `Esta cotización todavía no se puede aceptar en línea. Escríbele a ${business} si tienes dudas.` }
    case 'open':
      return quote.is_owner_preview ? { tone: 'info', text: PREVIEW_TEXT } : null
  }
}
