'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { postAdminAction } from '@/lib/admin/admin-api'
import type { AdminOrganizationSummary } from '@/lib/admin/types'
import { ModalShell } from './modal-shell'

interface SuspendPlanDialogProps {
  readonly organization: AdminOrganizationSummary
  readonly onCancel: () => void
  readonly onDone: () => void
}

export function SuspendPlanDialog({ organization, onCancel, onDone }: SuspendPlanDialogProps) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const result = await postAdminAction(`/api/admin/organizations/${organization.id}/suspend`, { reason })
    setBusy(false)
    if (result.ok) {
      onDone()
      return
    }
    setMessage(result.fieldErrors.reason ?? result.error)
  }

  return (
    <ModalShell labelledBy="suspend-title" className="max-w-sm" onClose={onCancel}>
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 id="suspend-title" className="text-sm font-semibold text-gray-900 dark:text-white">Suspender · {organization.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          La cuenta queda en solo lectura de inmediato. Sus datos no se borran y se reactiva al renovar.
        </p>
        <div>
          <label htmlFor="suspend-reason" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo *</label>
          <Textarea id="suspend-reason" value={reason} maxLength={300} required onChange={(event) => setReason(event.target.value)} />
        </div>
        {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="destructive" className="flex-1" disabled={busy}>{busy ? 'Suspendiendo...' : 'Suspender'}</Button>
        </div>
      </form>
    </ModalShell>
  )
}
