import type { BannerTone, StatusBanner } from '@/lib/public-quote/types'

const TONES: Readonly<Record<BannerTone, string>> = {
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  neutral: 'bg-gray-100 border-gray-200 text-gray-800',
}

export function QuoteStatusBanner({ banner }: { readonly banner: StatusBanner }) {
  return (
    <p role="status" data-testid="quote-status-banner" className={`rounded-xl border px-4 py-3 text-sm font-medium ${TONES[banner.tone]}`}>
      {banner.text}
    </p>
  )
}
