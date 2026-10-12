'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface QuoteRequestFormProps {
  readonly slug: string
  readonly businessName: string
  readonly askMeasurements: boolean
}

type FieldErrors = Readonly<Record<string, string>>

const inputClass = (error?: string) =>
  `w-full px-3 py-2.5 rounded-xl border text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 ${
    error ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-700'
  }`

export function QuoteRequestForm({ slug, businessName, askMeasurements }: QuoteRequestFormProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    setFieldErrors({})
    const form = new FormData(e.currentTarget)
    const payload = {
      slug,
      name: String(form.get('name') ?? ''),
      phone: String(form.get('phone') ?? ''),
      email: String(form.get('email') ?? ''),
      message: String(form.get('message') ?? ''),
      measurements: String(form.get('measurements') ?? '') || undefined,
      website: String(form.get('website') ?? ''),
    }
    try {
      const res = await fetch('/api/public/quote-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body: { error?: string; fieldErrors?: FieldErrors } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFieldErrors(body.fieldErrors ?? {})
        setError(body.error ?? 'No pudimos enviar tu solicitud.')
        setStatus('idle')
        return
      }
      setStatus('sent')
    } catch {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.')
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <div className="text-center py-6" data-testid="quote-request-sent">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" aria-hidden />
        <p className="mt-3 font-semibold text-gray-900 dark:text-white">Solicitud enviada</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{businessName} te contactará pronto por teléfono o WhatsApp.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="qr-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
          <input id="qr-name" name="name" required autoComplete="name" className={inputClass(fieldErrors.name)} />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
        </div>
        <div>
          <label htmlFor="qr-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono o WhatsApp *</label>
          <input id="qr-phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" className={inputClass(fieldErrors.phone)} />
          {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="qr-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo</label>
        <input id="qr-email" name="email" type="email" autoComplete="email" className={inputClass(fieldErrors.email)} />
        {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
      </div>
      <div>
        <label htmlFor="qr-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">¿Qué necesitas? *</label>
        <textarea id="qr-message" name="message" rows={3} required className={inputClass(fieldErrors.message)} />
        {fieldErrors.message && <p className="mt-1 text-xs text-red-600">{fieldErrors.message}</p>}
      </div>
      {askMeasurements && (
        <div>
          <label htmlFor="qr-measurements" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medidas aproximadas</label>
          <input id="qr-measurements" name="measurements" placeholder="Ej. 1.20 x 1.80 m, 2 piezas" className={inputClass(fieldErrors.measurements)} />
        </div>
      )}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={status === 'sending'} className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-3 transition-colors">
        {status === 'sending' ? 'Enviando...' : 'Enviar solicitud'}
      </button>
    </form>
  )
}
