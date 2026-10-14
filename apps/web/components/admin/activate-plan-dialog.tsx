'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { PLANS, PLAN_ORDER, isPlanId } from '@/lib/plans/catalog'
import { formatMxn } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'
import { activationAmount } from '@/lib/billing/activation'
import { postAdminAction } from '@/lib/admin/admin-api'
import type { AdminOrganizationSummary } from '@/lib/admin/types'
import { ModalShell } from './modal-shell'

const PLAN_OPTIONS = PLAN_ORDER.map((id) => ({ value: id, label: PLANS[id].name }))
const LABEL = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const FIELD_ERROR = 'mt-1 text-xs text-red-600'

interface NumberFieldProps {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly error?: string
  readonly onChange: (value: number) => void
}

function NumberField({ id, label, value, min, max, error, onChange }: NumberFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>{label}</label>
      <Input id={id} type="number" inputMode="numeric" min={min} max={max} value={value} required hasError={Boolean(error)}
        onChange={(event) => onChange(Number(event.target.value))} />
      {error && <p className={FIELD_ERROR}>{error}</p>}
    </div>
  )
}

interface ReferenceFieldProps {
  readonly value: string
  readonly error?: string
  readonly onChange: (value: string) => void
}

function ReferenceField({ value, error, onChange }: ReferenceFieldProps) {
  return (
    <div>
      <label htmlFor="activate-reference" className={LABEL}>Referencia de Mercado Pago *</label>
      <Input id="activate-reference" value={value} maxLength={120} required hasError={Boolean(error)}
        onChange={(event) => onChange(event.target.value)} />
      {error && <p className={FIELD_ERROR}>{error}</p>}
    </div>
  )
}

function inRange(value: number, max: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= max
}

function ActivationTotal({ plan, users, months }: { readonly plan: PlanId; readonly users: number; readonly months: number }) {
  const valid = inRange(users, 500) && inRange(months, 12)
  return (
    <p data-testid="activation-total" className="text-sm text-gray-700 dark:text-gray-300">
      {valid ? <>Total a registrar: <strong>{formatMxn(activationAmount(plan, users, months))}</strong></> : 'Revisa usuarios y meses'}
    </p>
  )
}

interface ActivatePlanDialogProps {
  readonly organization: AdminOrganizationSummary
  readonly onCancel: () => void
  readonly onDone: () => void
}

export function ActivatePlanDialog({ organization, onCancel, onDone }: ActivatePlanDialogProps) {
  const [plan, setPlan] = useState<PlanId>(organization.planId === 'free' ? 'starter' : organization.planId)
  const [users, setUsers] = useState(Math.max(1, organization.memberCount))
  const [months, setMonths] = useState(1)
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const result = await postAdminAction(`/api/admin/organizations/${organization.id}/activate`, { plan, users, months, reference })
    setBusy(false)
    if (result.ok) {
      onDone()
      return
    }
    setMessage(result.error)
    setErrors(result.fieldErrors)
  }

  return (
    <ModalShell labelledBy="activate-title" className="max-w-md" onClose={onCancel}>
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 id="activate-title" className="text-sm font-semibold text-gray-900 dark:text-white">Activar o renovar · {organization.name}</h3>
        <div>
          <label htmlFor="activate-plan" className={LABEL}>Plan *</label>
          <Combobox id="activate-plan" name="plan" options={PLAN_OPTIONS} defaultValue={plan} required fieldError={errors.plan}
            onChange={(value) => { if (isPlanId(value)) setPlan(value) }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="activate-users" label="Usuarios *" value={users} min={1} max={500} error={errors.users} onChange={setUsers} />
          <NumberField id="activate-months" label="Meses *" value={months} min={1} max={12} error={errors.months} onChange={setMonths} />
        </div>
        {plan !== 'free' && <ReferenceField value={reference} error={errors.reference} onChange={setReference} />}
        <ActivationTotal plan={plan} users={users} months={months} />
        {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={busy}>{busy ? 'Activando...' : 'Activar'}</Button>
        </div>
      </form>
    </ModalShell>
  )
}
