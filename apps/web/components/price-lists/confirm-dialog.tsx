'use client'

import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  readonly title: string
  readonly message: string
  readonly confirmLabel: string
  readonly busyLabel: string
  readonly busy: boolean
  readonly tone?: 'default' | 'danger'
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

export function ConfirmDialog({ title, message, confirmLabel, busyLabel, busy, tone = 'default', onCancel, onConfirm }: ConfirmDialogProps) {
  const confirmClass = tone === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 id="confirm-title" className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{message}</p>
        <div className="flex gap-3 px-4 pb-4">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" size="sm" className={`flex-1 ${confirmClass}`} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
