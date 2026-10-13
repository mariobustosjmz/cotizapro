'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export function DismissChecklistButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const dismiss = async () => {
    setBusy(true)
    const res = await fetch('/api/onboarding/checklist', { method: 'DELETE' }).catch(() => null)
    if (res?.ok) router.refresh()
    else setBusy(false)
  }

  return (
    <button type="button" onClick={dismiss} disabled={busy} aria-label="Ocultar primeros pasos" className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50">
      <X className="w-4 h-4" />
    </button>
  )
}
