import { Calendar, Mail, Phone } from 'lucide-react'
import { DETAIL_LABELS, STATUS_BADGE_CLASSES, STATUS_LABELS } from './constants'
import { detailLabel, formatRequestDate } from './format'
import { RequestActions } from './request-actions'
import type { QuoteRequest } from './types'

interface RequestCardProps {
  readonly request: QuoteRequest
  readonly busy: boolean
  readonly onConvert: (id: string) => void
  readonly onDiscard: (id: string) => void
  readonly onRestore: (id: string) => void
}

function RequestDetails({ details }: { readonly details: QuoteRequest['details'] }) {
  const entries = Object.entries(details).filter(([, value]) => typeof value === 'string' && value.trim() !== '')
  if (entries.length === 0) return null
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-1">
          <dt className="text-gray-500 dark:text-gray-400">{detailLabel(key, DETAIL_LABELS)}:</dt>
          <dd className="font-medium text-gray-800 dark:text-gray-200">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ContactLine({ request }: { readonly request: QuoteRequest }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
      <a href={`tel:${request.phone}`} className="inline-flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400">
        <Phone className="w-3 h-3" />
        {request.phone}
      </a>
      {request.email && (
        <a href={`mailto:${request.email}`} className="inline-flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400 break-all">
          <Mail className="w-3 h-3" />
          {request.email}
        </a>
      )}
      <span className="inline-flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        <time dateTime={request.created_at}>{formatRequestDate(request.created_at)}</time>
      </span>
    </div>
  )
}

export function RequestCard({ request, ...actions }: RequestCardProps) {
  return (
    <article
      data-testid="quote-request-card"
      data-request-id={request.id}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="font-semibold text-gray-900 dark:text-white break-words">{request.name}</h3>
          <ContactLine request={request} />
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE_CLASSES[request.status]}`}>
          {STATUS_LABELS[request.status]}
        </span>
      </header>
      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line break-words">{request.message}</p>
      <RequestDetails details={request.details} />
      <RequestActions request={request} {...actions} />
    </article>
  )
}
