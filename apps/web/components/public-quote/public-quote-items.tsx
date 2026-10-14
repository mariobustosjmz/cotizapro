import { formatAmount } from '@/lib/format/money'
import { ITEM_UNIT_LABEL } from '@/lib/pdf/quote-materials'
import type { PublicQuote } from '@/lib/public-quote/types'

function Row({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value < 0 ? '-' : ''}${formatAmount(Math.abs(value))}</dd>
    </div>
  )
}

function Totals({ quote }: { readonly quote: PublicQuote }) {
  return (
    <dl className="border-t border-gray-100 px-4 py-3 space-y-1 text-sm">
      <Row label="Subtotal" value={quote.subtotal} />
      {quote.discount_amount > 0 && <Row label={`Descuento (${quote.discount_rate} %)`} value={-quote.discount_amount} />}
      <Row label={`IVA (${quote.tax_rate} %)`} value={quote.tax_amount} />
      <div className="flex justify-between pt-2 border-t border-gray-100" data-testid="public-quote-total">
        <dt className="font-bold text-gray-900">Total</dt>
        <dd className="text-lg font-bold text-[var(--brand-on-light)]">${formatAmount(quote.total)} MXN</dd>
      </div>
    </dl>
  )
}

export function PublicQuoteItems({ quote }: { readonly quote: PublicQuote }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200">
      <h2 className="px-4 pt-4 text-base font-bold text-gray-900">Conceptos</h2>
      <ul className="divide-y divide-gray-100">
        {quote.items.map((item, index) => (
          <li key={`${index}-${item.description}`} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.description}</p>
              <p className="text-xs text-gray-500">
                {item.quantity} {ITEM_UNIT_LABEL[item.unit_type] ?? item.unit_type} × ${formatAmount(item.unit_price)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-gray-900">${formatAmount(item.subtotal)}</p>
          </li>
        ))}
      </ul>
      <Totals quote={quote} />
    </section>
  )
}
