'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { OwnProfile } from '@/lib/showcase/get-own-profile'
import { AiShowcaseButton, type ShowcaseTextField } from './ai-showcase-button'
import { TextField, Toggle } from './profile-fields'

interface ProfileFormProps {
  readonly profile: OwnProfile | null
  readonly fallbackName: string
  readonly canEdit: boolean
}

type FieldErrors = Readonly<Record<string, string>>

function payloadFrom(form: FormData) {
  const text = (k: string) => String(form.get(k) ?? '').trim()
  const optional = (k: string) => text(k) || null
  return {
    display_name: text('display_name'),
    headline: optional('headline'),
    bio: optional('bio'),
    service_area: optional('service_area'),
    city: optional('city'),
    whatsapp_phone: text('whatsapp_phone'),
    contact_email: text('contact_email'),
    is_published: form.get('is_published') === 'on',
    show_prices: form.get('show_prices') === 'on',
  }
}

/** Los campos son no controlados (defaultValue): la propuesta aceptada se escribe en el DOM y se guarda solo con "Guardar página". */
function setFieldValue(form: HTMLFormElement, name: ShowcaseTextField, value: string): void {
  const field = form.elements.namedItem(name)
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.value = value
}

export function ProfileForm({ profile, fallbackName, canEdit }: ProfileFormProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const formRef = useRef<HTMLFormElement>(null)

  function applyAiText(field: ShowcaseTextField, value: string): void {
    if (status === 'saving' || !formRef.current) return
    setFieldValue(formRef.current, field, value)
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== field)))
    setStatus('idle')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('saving')
    setError('')
    setErrors({})
    try {
      const res = await fetch('/api/showcase/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFrom(new FormData(e.currentTarget))),
      })
      const body: { error?: string; fieldErrors?: FieldErrors } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors(body.fieldErrors ?? {})
        setError(body.error ?? 'No se pudo guardar')
        setStatus('idle')
        return
      }
      setStatus('saved')
      router.refresh()
    } catch {
      setError('Sin conexión. Intenta de nuevo.')
      setStatus('idle')
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
      {canEdit && <AiShowcaseButton onApply={applyAiText} disabled={status === 'saving'} />}
      <fieldset disabled={!canEdit || status === 'saving'} className="space-y-4">
        <TextField name="display_name" label="Nombre público" defaultValue={profile?.display_name ?? fallbackName} errors={errors} required maxLength={80} />
        <TextField name="headline" label="Frase corta" defaultValue={profile?.headline ?? null} errors={errors} maxLength={120} placeholder="Ej. Cancelería y vidrio templado en Monterrey" />
        <TextField name="bio" label="Sobre ti o tu negocio" defaultValue={profile?.bio ?? null} errors={errors} multiline maxLength={1500} />
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField name="city" label="Ciudad" defaultValue={profile?.city ?? null} errors={errors} maxLength={80} />
          <TextField name="service_area" label="Zona de servicio" defaultValue={profile?.service_area ?? null} errors={errors} maxLength={160} />
          <TextField name="whatsapp_phone" label="WhatsApp" type="tel" defaultValue={profile?.whatsapp_phone ?? null} errors={errors} maxLength={20} placeholder="52 81 1234 5678" />
          <TextField name="contact_email" label="Correo de contacto" type="email" defaultValue={profile?.contact_email ?? null} errors={errors} maxLength={160} />
        </div>
        <Toggle name="show_prices" label="Mostrar precios desde" hint="Muestra el precio base de cada servicio en tu página." defaultChecked={profile?.show_prices ?? true} />
        <Toggle name="is_published" label="Página publicada" hint="Si está apagada, tu liga muestra 'Página no encontrada'." defaultChecked={profile?.is_published ?? false} />
      </fieldset>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {status === 'saved' && <p className="text-sm text-emerald-600" role="status">Cambios guardados</p>}
      {canEdit ? (
        <Button type="submit" className="w-full" disabled={status === 'saving'} data-testid="vitrina-save">
          {status === 'saving' ? 'Guardando...' : 'Guardar página'}
        </Button>
      ) : (
        <p className="text-xs text-gray-500">Solo el dueño o un administrador puede editar la página.</p>
      )}
    </form>
  )
}
