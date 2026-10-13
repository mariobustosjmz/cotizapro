'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Combobox } from '@/components/ui/combobox'
import { InviteSharePanel } from '@/components/team/invite-share-panel'

interface InviteResult {
  readonly email: string
  readonly inviteUrl: string
  readonly whatsappUrl: string
  readonly emailSent: boolean
}

interface InviteResponse {
  readonly invitation?: { readonly email: string }
  readonly invite_url?: string
  readonly whatsapp_url?: string
  readonly email_sent?: boolean
  readonly error?: string
  readonly fieldErrors?: Record<string, string>
}

const ROLE_OPTIONS = [
  { value: 'member', label: 'Miembro' },
  { value: 'admin', label: 'Administrador' },
  { value: 'viewer', label: 'Visualizador' },
]

const ROLE_HINTS: Readonly<Record<string, string>> = {
  admin: 'Puede gestionar catálogo, página y equipo',
  member: 'Puede crear y editar cotizaciones',
  viewer: 'Solo puede ver contenido',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function InvitePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ email: '', phone: '', role: 'member' })
  const [result, setResult] = useState<InviteResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      setFieldErrors({ email: form.email.trim() ? 'Email inválido' : 'El email es requerido' })
      return
    }
    setFieldErrors({})
    setLoading(true)
    try {
      const response = await fetch('/api/team/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, role: form.role, ...(form.phone.trim() && { phone: form.phone }) }),
      })
      const data: InviteResponse = await response.json()
      if (!response.ok || !data.invite_url || !data.whatsapp_url) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors)
        throw new Error(data.error || 'Error al crear la invitación')
      }
      setResult({ email: data.invitation?.email ?? form.email, inviteUrl: data.invite_url, whatsappUrl: data.whatsapp_url, emailSent: data.email_sent === true })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la invitación')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setForm({ email: '', phone: '', role: 'member' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/team">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" aria-label="Volver a Equipo">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invitar miembro</h2>
          <p className="text-xs text-gray-500">Comparte la liga por WhatsApp o cópiala; si el correo está activo, también se envía por email.</p>
        </div>
      </div>

      {result ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4" data-testid="invite-result">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Invitación creada para {result.email}</p>
              <p className="text-xs text-gray-500">
                {result.emailSent ? 'También le enviamos un correo.' : 'El correo aún no está activo: mándale la liga por WhatsApp o cópiala.'} La liga vence en 7 días y solo funciona con ese correo.
              </p>
            </div>
          </div>
          <InviteSharePanel inviteUrl={result.inviteUrl} whatsappUrl={result.whatsappUrl} />
          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={reset}>Invitar a otra persona</Button>
            <Link href="/dashboard/team" className="flex-1">
              <Button type="button" size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white">Volver a Equipo</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}

            <FormField label="Email del miembro" htmlFor="email" required hint="Con este correo creará su acceso" error={fieldErrors.email}>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className={fieldErrors.email ? 'border-red-500 bg-red-50' : ''}
              />
            </FormField>

            <FormField label="WhatsApp" htmlFor="phone" hint="Para abrir el chat directo; si lo dejas vacío eliges el contacto en WhatsApp">
              <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="81 1234 5678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FormField>

            <FormField label="Rol" htmlFor="role" required hint={ROLE_HINTS[form.role]}>
              <Combobox id="role" name="role" options={ROLE_OPTIONS} defaultValue="member" required onChange={(role) => setForm((f) => ({ ...f, role }))} />
            </FormField>

            <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Link href="/dashboard/team" className="flex-1">
                <Button type="button" variant="outline" size="sm" className="w-full" disabled={loading}>Cancelar</Button>
              </Link>
              <Button type="submit" size="sm" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                {loading ? 'Creando...' : 'Crear invitación'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
