'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatExpiryDate } from '@/lib/billing/expiry'
import { fetchActivations } from '@/lib/admin/admin-api'
import { describeActivation } from '@/lib/admin/history-copy'
import type { PlanActivationRow } from '@/lib/admin/types'
import { ModalShell } from './modal-shell'

interface ActivationHistoryProps {
  readonly organizationId: string
  readonly organizationName: string
  readonly onClose: () => void
}

type HistoryState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly rows: readonly PlanActivationRow[] }

function HistoryList({ rows }: { readonly rows: readonly PlanActivationRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400">Sin activaciones registradas.</p>
  return (
    <ul className="max-h-80 space-y-2 overflow-y-auto">
      {rows.map((row) => (
        <li key={row.id} className="rounded-md border border-gray-100 p-2 text-sm dark:border-gray-800">
          <p className="text-gray-900 dark:text-white">{describeActivation(row)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatExpiryDate(row.created_at)} · {row.activated_by_email ?? 'Sin registro'}{row.reference ? ` · Ref. ${row.reference}` : ''}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function ActivationHistory({ organizationId, organizationName, onClose }: ActivationHistoryProps) {
  const [state, setState] = useState<HistoryState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    fetchActivations(organizationId).then((rows) => {
      if (active) setState(rows ? { status: 'ready', rows } : { status: 'error' })
    })
    return () => {
      active = false
    }
  }, [organizationId])

  return (
    <ModalShell labelledBy="history-title" className="max-w-lg" onClose={onClose}>
      <div className="w-full max-w-lg space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 id="history-title" className="text-sm font-semibold text-gray-900 dark:text-white">Historial · {organizationName}</h3>
        {state.status === 'loading' && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>}
        {state.status === 'error' && <p role="alert" className="text-sm text-red-600">No se pudo cargar el historial.</p>}
        {state.status === 'ready' && <HistoryList rows={state.rows} />}
        <Button type="button" variant="outline" className="w-full" onClick={onClose}>Cerrar</Button>
      </div>
    </ModalShell>
  )
}
