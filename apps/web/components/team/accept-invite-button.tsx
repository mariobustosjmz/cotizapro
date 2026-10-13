'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AcceptInviteButton({ token }: { readonly token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const accept = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/team/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json: { error?: string } = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo aceptar la invitación')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aceptar la invitación')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <Button onClick={accept} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uniéndote...</> : 'Aceptar invitación'}
      </Button>
    </div>
  )
}
