import Link from 'next/link'
import { AlertTriangle, Lock } from 'lucide-react'
import type { ExpiryBanner } from '@/lib/billing/types'

const TONE_CLASS: Readonly<Record<ExpiryBanner['tone'], string>> = {
  warning: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-100',
  danger: 'bg-red-600 border-red-700 text-white',
}

const CTA_CLASS: Readonly<Record<ExpiryBanner['tone'], string>> = {
  warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  danger: 'bg-white hover:bg-red-50 text-red-700',
}

export function PlanExpiryBanner({ banner }: { readonly banner: ExpiryBanner }) {
  const Icon = banner.tone === 'danger' ? Lock : AlertTriangle
  return (
    <div
      role={banner.tone === 'danger' ? 'alert' : 'status'}
      data-testid={`plan-banner-${banner.tone}`}
      className={`flex flex-wrap items-center gap-3 border-b px-4 py-2 text-sm ${TONE_CLASS[banner.tone]}`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">{banner.message}</p>
      <Link href={banner.ctaHref} className={`rounded-md px-3 py-1 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${CTA_CLASS[banner.tone]}`}>
        {banner.ctaLabel}
      </Link>
    </div>
  )
}
