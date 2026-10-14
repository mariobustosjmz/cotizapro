import { formatDateOnly } from '@/lib/public-quote/format'
import { formatMxPhone } from '@/lib/showcase/format-phone'
import { normalizeWhatsappPhone } from '@/lib/whatsapp/link'
import type { PublicQuote } from '@/lib/public-quote/types'

function Fact({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-semibold text-gray-900">{children}</dd>
    </div>
  )
}

export function PublicQuoteHeader({ quote }: { readonly quote: PublicQuote }) {
  const { business } = quote
  return (
    <header className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 bg-[var(--brand)] text-[var(--brand-ink)]">
        {business.logo_url && (
          <span className="w-12 h-12 shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo servido desde Storage del negocio */}
            <img src={business.logo_url} alt="" className="w-full h-full object-contain" />
          </span>
        )}
        <h1 className="text-lg font-bold leading-tight">{business.name}</h1>
      </div>
      <dl className="grid grid-cols-2 gap-3 px-4 py-4">
        <Fact label="Cotización">{quote.quote_number}</Fact>
        <Fact label="Para">{quote.client_first_name ?? 'Cliente'}</Fact>
        <Fact label="Fecha">{formatDateOnly(quote.issued_on)}</Fact>
        <Fact label="Válida hasta">{formatDateOnly(quote.valid_until)}</Fact>
        {business.phone && (
          <div className="col-span-2">
            <dt className="text-xs text-gray-500">Teléfono</dt>
            <dd>
              <a href={`tel:+${normalizeWhatsappPhone(business.phone)}`} className="text-sm font-semibold text-[var(--brand-on-light)]">
                {formatMxPhone(business.phone)}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </header>
  )
}
