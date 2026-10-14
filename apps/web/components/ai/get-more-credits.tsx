'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { PackLink } from '@/lib/ai/packs'

function creditNote(links: readonly PackLink[]): string {
  const automatic = links.length > 0 && links.every((link) => link.kind === 'mercadopago')
  return automatic ? 'Te acreditamos los créditos al confirmar el pago.' : 'Te respondemos para acreditar tus créditos.'
}

export function GetMoreCredits({ links }: { readonly links: readonly PackLink[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        data-testid="ai-get-more"
        className="rounded-lg border border-orange-200 dark:border-orange-800 px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer"
      >
        Obtener más
      </button>
      {open && (
        <div id={panelId} className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2 shadow-lg">
          {links.map((link) => (
            <a
              key={link.pack.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              <span>+{link.pack.credits.toLocaleString('es-MX')} créditos</span>
              <span className="font-semibold">${link.pack.priceMxn} MXN</span>
            </a>
          ))}
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Vencen a fin de mes. {creditNote(links)}</p>
        </div>
      )}
    </div>
  )
}
