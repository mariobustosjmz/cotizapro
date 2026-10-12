'use client'

import { useState } from 'react'
import { Copy, Download, ExternalLink } from 'lucide-react'

interface SharePanelProps {
  readonly url: string
  readonly qrPng: string
  readonly published: boolean
}

export function SharePanel({ url, qrPng, published }: SharePanelProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-3">
      {!published && (
        <p className="text-xs rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-3 py-2">
          Tu página está en borrador. Actívala con &quot;Página publicada&quot; para que otros la vean.
        </p>
      )}
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
        <span className="flex-1 min-w-0 truncate text-sm text-gray-700 dark:text-gray-300" data-testid="vitrina-url">{url}</span>
        <button type="button" onClick={copy} className="shrink-0 text-orange-600 hover:text-orange-700" aria-label="Copiar liga">
          <Copy className="w-4 h-4" aria-hidden />
        </button>
      </div>
      {copied && <p className="text-xs text-emerald-600" role="status">Liga copiada</p>}
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL generado en servidor */}
      <img src={qrPng} alt="Código QR de tu página pública" className="mx-auto w-44 h-44 rounded-lg border border-gray-200 bg-white p-2" />
      <div className="grid grid-cols-2 gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ExternalLink className="w-4 h-4" aria-hidden /> Ver página
        </a>
        <a href="/api/showcase/qr-card" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 py-2 text-sm font-semibold text-white" data-testid="vitrina-qr-card">
          <Download className="w-4 h-4" aria-hidden /> Tarjeta QR
        </a>
      </div>
    </div>
  )
}
