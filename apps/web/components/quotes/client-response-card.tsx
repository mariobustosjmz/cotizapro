'use client'

import { useState } from 'react'
import { Eye, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { useToast } from '@/components/ui/toast'
import { clientActivityLines, type ClientActivity } from '@/lib/public-quote/activity'
import { parseDepositOverride } from '@/lib/deposit/override'

export interface ClientResponseQuote extends ClientActivity {
  readonly id: string
  readonly status: string
  readonly deposit_percent: number | null
}

interface ClientResponseCardProps {
  readonly quote: ClientResponseQuote
  readonly onSaved: () => void
}

function emptyText(status: string): string {
  return status === 'draft'
    ? 'Envía la cotización para que tu cliente la revise y la acepte desde su celular.'
    : 'Tu cliente todavía no abre la liga.'
}

export function ClientResponseCard({ quote, onSaved }: ClientResponseCardProps) {
  const { toast } = useToast()
  const [percent, setPercent] = useState(quote.deposit_percent === null ? '' : String(quote.deposit_percent))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const lines = clientActivityLines(quote)

  async function save() {
    const parsed = parseDepositOverride(percent)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deposit_percent: parsed.value }),
      })
      if (!res.ok) throw new Error('No se pudo guardar el anticipo')
      toast({ message: 'Anticipo actualizado', variant: 'success' })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el anticipo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section data-testid="client-response-card" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
        <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Respuesta del cliente</span>
      </div>
      <div className="p-4 space-y-4">
        {lines.length > 0 ? (
          <ul className="space-y-1">
            {lines.map((line) => <li key={line} className="text-sm text-gray-700 dark:text-gray-300">{line}</li>)}
          </ul>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">{emptyText(quote.status)}</p>
        )}
        <div className="flex items-end gap-2">
          <FormField label="Anticipo de esta cotización (%)" htmlFor="quote_deposit_percent" hint="Vacío: usa el porcentaje de Configuración → Empresa." error={error || undefined} className="flex-1">
            <Input id="quote_deposit_percent" type="number" min="0" max="100" step="1" inputMode="numeric" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="Igual que la empresa" hasError={Boolean(error)} />
          </FormField>
          <Button type="button" size="sm" onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white mb-6">
            <Save className="w-3.5 h-3.5 mr-1" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </section>
  )
}
