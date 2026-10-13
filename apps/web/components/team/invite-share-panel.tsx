'use client'

import { useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InviteSharePanelProps {
  readonly inviteUrl: string
  readonly whatsappUrl: string
  readonly compact?: boolean
}

/** Liga de invitación para copiar o mandar por WhatsApp; funciona aunque el correo no esté configurado. */
export function InviteSharePanel({ inviteUrl, whatsappUrl, compact = false }: InviteSharePanelProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-2'}>
      {!compact && <Input readOnly value={inviteUrl} aria-label="Liga de invitación" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy} className={compact ? '' : 'flex-1'}>
          {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
          {copied ? 'Copiada' : 'Copiar liga'}
        </Button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center justify-center rounded-md px-3 h-8 text-sm font-medium text-white bg-green-600 hover:bg-green-700 ${compact ? '' : 'flex-1'}`}
        >
          <MessageCircle className="w-4 h-4 mr-1.5" />
          WhatsApp
        </a>
      </div>
    </div>
  )
}
