'use client'

import { useState } from 'react'
import { useQuoteResponse } from '@/hooks/use-quote-response'
import { AcceptPanel, RejectPanel } from './respond-panels'

interface QuoteActionsProps {
  readonly token: string
  readonly businessName: string
  readonly questionUrl: string | null
}

type OpenPanel = 'none' | 'accept' | 'reject'

const SECONDARY = 'flex items-center justify-center rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50'

export function QuoteActions({ token, businessName, questionUrl }: QuoteActionsProps) {
  const [panel, setPanel] = useState<OpenPanel>('none')
  const { status, error, respond } = useQuoteResponse(token)
  const sending = status !== 'idle'
  const close = () => setPanel('none')

  if (panel === 'accept') {
    return <AcceptPanel businessName={businessName} sending={sending} error={error} onCancel={close} onConfirm={(name) => void respond({ action: 'accept', name })} />
  }
  if (panel === 'reject') {
    return <RejectPanel businessName={businessName} sending={sending} error={error} onCancel={close} onConfirm={(reason) => void respond({ action: 'reject', reason })} />
  }
  return (
    <section className="space-y-2" data-testid="quote-actions">
      <button type="button" onClick={() => setPanel('accept')} className="w-full rounded-xl bg-[var(--brand)] py-3.5 text-base font-semibold text-[var(--brand-ink)] hover:opacity-90">
        Aceptar cotización
      </button>
      <div className={`grid gap-2 ${questionUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {questionUrl && <a href={questionUrl} target="_blank" rel="noopener noreferrer" className={SECONDARY}>Tengo dudas</a>}
        <button type="button" onClick={() => setPanel('reject')} className={SECONDARY}>No me interesa</button>
      </div>
    </section>
  )
}
