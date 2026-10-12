'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TRADE_TEMPLATES } from '@cotizapro/quoting'
import { Button } from '@/components/ui/button'
import { ACCOUNT_TYPE_OPTIONS } from '@/lib/onboarding/account-options'
import type { AccountType, Trade } from '@/lib/validations/onboarding'
import { OptionCards, type OptionCard } from './option-cards'

const TRADE_OPTIONS: readonly OptionCard<Trade>[] = TRADE_TEMPLATES.map((t) => ({ value: t.key, title: t.name, description: t.description }))

interface AccountSetupFormProps {
  readonly initialAccountType: AccountType | null
  readonly initialTrade: Trade | null
  readonly applyTemplateByDefault: boolean
  readonly redirectTo: string
  readonly cancelHref?: string
  readonly compact?: boolean
}

export function AccountSetupForm({ initialAccountType, initialTrade, applyTemplateByDefault, redirectTo, cancelHref, compact = false }: AccountSetupFormProps) {
  const router = useRouter()
  const [accountType, setAccountType] = useState<AccountType | null>(initialAccountType)
  const [trade, setTrade] = useState<Trade | null>(initialTrade)
  const [applyTemplate, setApplyTemplate] = useState(applyTemplateByDefault)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!accountType || !trade) {
      setError('Elige cómo trabajas y tu giro')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/organization/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_type: accountType, trade, apply_template: applyTemplate }),
      })
      const body: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'No se pudo guardar')
      router.push(redirectTo)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">¿Cómo trabajas? *</h2>
        <OptionCards name="account-type" options={ACCOUNT_TYPE_OPTIONS} value={accountType} onChange={setAccountType} columns={compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'} />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">¿Cuál es tu giro? *</h2>
        <OptionCards name="trade" options={TRADE_OPTIONS} value={trade} onChange={setTrade} columns={compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} />
      </section>
      <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={applyTemplate} onChange={(e) => setApplyTemplate(e.target.checked)} className="mt-0.5 accent-orange-500" />
        <span>
          Cargar productos y precios de ejemplo de mi giro
          <span className="block text-xs text-gray-500 dark:text-gray-400">Solo se cargan si aún no tienes productos configurables. Después puedes editar todos los precios.</span>
        </span>
      </label>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="flex gap-3">
        {cancelHref && (
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.push(cancelHref)} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button type="button" className="flex-1" onClick={submit} disabled={saving} data-testid="account-setup-submit">
          {saving ? 'Guardando...' : 'Guardar y continuar'}
        </Button>
      </div>
    </div>
  )
}
