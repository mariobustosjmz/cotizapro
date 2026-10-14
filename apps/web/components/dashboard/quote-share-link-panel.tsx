'use client'

import { Copy, Link2, Loader2, RefreshCw, ShieldOff } from 'lucide-react'
import { useQuoteShareLink, type ActiveShare } from '@/hooks/use-quote-share-link'
import { formatDateOnly, formatDateTime } from '@/lib/public-quote/format'

interface QuoteShareLinkPanelProps {
  readonly quoteId: string
  readonly freshUrl: string | null
  readonly onLinkChanged?: (url: string | null) => void
}

const BUTTON = 'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60'
const DANGER = 'inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60'

function describe(active: ActiveShare | null): string {
  if (!active) return 'Aún no hay liga activa. Se crea al enviar, o genérala aquí para copiarla.'
  const viewed = active.first_viewed_at ? ` Tu cliente la abrió el ${formatDateTime(active.first_viewed_at)}.` : ''
  return `Hay una liga activa que vence el ${formatDateOnly(active.expires_at)}. Por seguridad solo se muestra al crearla.${viewed}`
}

export function QuoteShareLinkPanel({ quoteId, freshUrl, onLinkChanged }: QuoteShareLinkPanelProps) {
  const link = useQuoteShareLink(quoteId, freshUrl, onLinkChanged)
  const busy = link.action !== 'idle'
  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3" data-testid="share-link-panel">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-orange-500" aria-hidden />
        <p className="text-sm font-medium text-gray-900 dark:text-white">Liga para ver y aceptar</p>
        {link.action === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" aria-hidden />}
      </div>
      {link.url ? (
        <input
          readOnly
          value={link.url}
          aria-label="Liga de la cotización"
          onFocus={(e) => e.currentTarget.select()}
          data-testid="share-link-url"
          className="w-full px-3 py-2 text-xs font-mono border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">{describe(link.active)}</p>
      )}
      {link.error && <p role="alert" className="text-xs text-red-600">{link.error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {link.url ? (
          <button type="button" onClick={() => void link.copy()} className={BUTTON}>
            <Copy className="w-3.5 h-3.5" aria-hidden /> {link.copied ? 'Liga copiada' : 'Copiar'}
          </button>
        ) : (
          <button type="button" onClick={() => void link.generate()} disabled={busy} className={BUTTON}>
            <RefreshCw className="w-3.5 h-3.5" aria-hidden />
            {link.action === 'generating' ? 'Generando...' : link.active ? 'Generar liga nueva' : 'Generar liga'}
          </button>
        )}
        {!link.url && link.active && (
          <span className="text-xs text-gray-500 dark:text-gray-400">La liga anterior dejará de funcionar.</span>
        )}
        {(link.url || link.active) && (
          <button type="button" onClick={() => void link.revoke()} disabled={busy} className={DANGER}>
            <ShieldOff className="w-3.5 h-3.5" aria-hidden /> {link.action === 'revoking' ? 'Revocando...' : 'Revocar liga'}
          </button>
        )}
      </div>
    </section>
  )
}
