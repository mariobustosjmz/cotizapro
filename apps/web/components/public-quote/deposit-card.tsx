import { depositAmount } from '@/lib/deposit/amount'
import { formatAmount } from '@/lib/format/money'
import type { PublicQuote } from '@/lib/public-quote/types'

interface DepositCardProps {
  readonly businessName: string
  readonly total: number
  readonly deposit: PublicQuote['deposit']
}

export function DepositCard({ businessName, total, deposit }: DepositCardProps) {
  const amount = depositAmount(total, deposit.percent)
  return (
    <section data-testid="deposit-card" className="bg-white rounded-2xl border-2 border-[color-mix(in_srgb,var(--brand)_35%,transparent)] p-4 space-y-3">
      <h2 className="text-base font-bold text-gray-900">Anticipo: ${formatAmount(amount)} ({deposit.percent} %)</h2>
      {deposit.instructions && <p className="text-sm text-gray-700 whitespace-pre-line">{deposit.instructions}</p>}
      {deposit.payment_url && (
        <a
          href={deposit.payment_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex items-center justify-center rounded-xl bg-[var(--brand)] py-3 text-sm font-semibold text-[var(--brand-ink)] hover:opacity-90"
        >
          Pagar anticipo
        </a>
      )}
      <p className="text-xs text-gray-500">El pago lo recibe directamente {businessName}.</p>
    </section>
  )
}
