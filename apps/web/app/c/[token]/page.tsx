import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { brandCssVars, brandPalette } from '@/lib/branding/color'
import { getPublicQuote } from '@/lib/public-quote/get-public-quote'
import { publicQuoteState, statusBanner } from '@/lib/public-quote/state'
import { quoteQuestionMessage, whatsappLink } from '@/lib/whatsapp/link'
import { PublicQuoteHeader } from '@/components/public-quote/public-quote-header'
import { PublicQuoteItems } from '@/components/public-quote/public-quote-items'
import { DepositCard } from '@/components/public-quote/deposit-card'
import { QuoteStatusBanner } from '@/components/public-quote/quote-status-banner'
import { QuoteActions } from '@/components/public-quote/quote-actions'
import { ViewBeacon } from '@/components/public-quote/view-beacon'
import { PublicQuoteFooter, QuestionLink, TermsSection } from '@/components/public-quote/quote-extras'

interface PageProps {
  readonly params: Promise<{ token: string }>
}

export const metadata: Metadata = { title: 'Cotización', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

function Unavailable() {
  return (
    <main className="min-h-screen bg-gray-50 grid place-items-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900">Liga no disponible</h1>
        <p className="mt-2 text-sm text-gray-500">La liga venció, se reemplazó por una nueva o está incompleta. Pide a quien te cotizó que te la mande otra vez.</p>
      </div>
    </main>
  )
}

export default async function PublicQuotePage({ params }: PageProps) {
  const { token } = await params
  const quote = await getPublicQuote(token)
  if (!quote) return <Unavailable />

  const state = publicQuoteState(quote)
  const banner = statusBanner(quote)
  const questionUrl = whatsappLink(quote.business.phone, quoteQuestionMessage(quote.quote_number, quote.client_first_name))
  const canRespond = state === 'open' && !quote.is_owner_preview
  const showDeposit = quote.deposit.percent > 0 && (state === 'open' || state === 'accepted')
  const brandStyle = brandCssVars(brandPalette(quote.business.brand_color)) as CSSProperties

  return (
    <main className="min-h-screen bg-gray-50" style={brandStyle}>
      {!quote.is_owner_preview && <ViewBeacon token={token} />}
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 space-y-4">
        <PublicQuoteHeader quote={quote} />
        {banner && <QuoteStatusBanner banner={banner} />}
        <PublicQuoteItems quote={quote} />
        {showDeposit && <DepositCard businessName={quote.business.name} total={quote.total} deposit={quote.deposit} />}
        {canRespond && <QuoteActions token={token} businessName={quote.business.name} questionUrl={questionUrl} />}
        {!canRespond && questionUrl && <QuestionLink href={questionUrl} />}
        {quote.terms && <TermsSection terms={quote.terms} />}
        <PublicQuoteFooter token={token} />
      </div>
    </main>
  )
}
