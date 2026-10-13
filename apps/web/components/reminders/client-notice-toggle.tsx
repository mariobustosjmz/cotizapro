'use client'

import { Mail } from 'lucide-react'
import { reminderNoticePreview } from '@/lib/email/reminder-email'
import { isClientNotifiable } from '@/lib/reminders/client-notice'

interface ClientNoticeToggleProps {
  readonly reminderType: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
}

/** Solo mantenimiento y renovación avisan al cliente; los demás tipos son tareas internas. */
export function ClientNoticeToggle({ reminderType, checked, onChange }: ClientNoticeToggleProps) {
  if (!isClientNotifiable(reminderType)) return null

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2" data-testid="client-notice-toggle">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="notify_client"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-orange-500 border-gray-300 rounded cursor-pointer"
        />
        <label htmlFor="notify_client" className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
          Avisar al cliente por correo
        </label>
      </div>
      {checked && (
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <p>Se envía el día anterior o el mismo día, a nombre de tu negocio, si el cliente tiene correo. Recibirá:</p>
          <p className="italic bg-gray-50 dark:bg-gray-800 rounded px-2 py-1.5">{reminderNoticePreview(reminderType)}</p>
        </div>
      )}
    </div>
  )
}
