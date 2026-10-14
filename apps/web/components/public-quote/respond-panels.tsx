'use client'

import { useState, type FormEvent } from 'react'

interface PanelProps {
  readonly businessName: string
  readonly sending: boolean
  readonly error: string
  readonly onCancel: () => void
}

const FIELD = 'w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const CANCEL = 'flex-1 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60'
const SUBMIT = 'flex-1 rounded-xl bg-[var(--brand)] py-3 text-sm font-semibold text-[var(--brand-ink)] hover:opacity-90 disabled:opacity-60'

function Buttons({ sending, onCancel, label, busyLabel }: { readonly sending: boolean; readonly onCancel: () => void; readonly label: string; readonly busyLabel: string }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onCancel} disabled={sending} className={CANCEL}>Cancelar</button>
      <button type="submit" disabled={sending} className={SUBMIT}>{sending ? busyLabel : label}</button>
    </div>
  )
}

export function AcceptPanel({ businessName, sending, error, onCancel, onConfirm }: PanelProps & { readonly onConfirm: (name: string | undefined) => void }) {
  const [name, setName] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onConfirm(name.trim() || undefined)
  }
  return (
    <form onSubmit={submit} aria-label="Confirmar aceptación" className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <p className="text-base font-semibold text-gray-900">¿Aceptas la cotización de {businessName}?</p>
      <p className="text-xs text-gray-500">Guardamos la fecha y hora en que la aceptas. No es una firma electrónica.</p>
      <div>
        <label htmlFor="accept-name" className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
        <input id="accept-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" className={FIELD} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Buttons sending={sending} onCancel={onCancel} label="Confirmar aceptación" busyLabel="Aceptando..." />
    </form>
  )
}

export function RejectPanel({ businessName, sending, error, onCancel, onConfirm }: PanelProps & { readonly onConfirm: (reason: string | undefined) => void }) {
  const [reason, setReason] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onConfirm(reason.trim() || undefined)
  }
  return (
    <form onSubmit={submit} aria-label="No me interesa" className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <p className="text-base font-semibold text-gray-900">¿Nos cuentas por qué no te interesa?</p>
      <p className="text-xs text-gray-500">Ayuda a {businessName} a mejorar su propuesta.</p>
      <div>
        <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
        <textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Por ejemplo: el precio, la fecha o ya lo resolví." className={FIELD} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Buttons sending={sending} onCancel={onCancel} label="Enviar respuesta" busyLabel="Enviando..." />
    </form>
  )
}
