'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { validateProduct } from '@cotizapro/quoting'
import type { PriceList } from '@cotizapro/quoting'
import { Button } from '@/components/ui/button'
import { ConfigurableItemPanel } from '@/components/quoting/configurable-item-panel'
import { defaultInputs } from '@/lib/pricing/client-preview'
import type { ItemInput } from '@/lib/pricing/client-preview'
import { fetchPriceLists } from './price-list-api'
import { RulesSummary } from './rules-summary'

interface TestCalculatorDialogProps {
  readonly serviceName: string
  readonly definition: unknown
  readonly onClose: () => void
}

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly priceLists: readonly PriceList[] }

function useActivePriceLists(): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  useEffect(() => {
    fetchPriceLists().then((result) =>
      setState(
        result.ok
          ? { status: 'ready', priceLists: result.data.filter((list) => list.is_active) }
          : { status: 'error', message: result.error },
      ),
    )
  }, [])
  return state
}

function CalculatorBody({ serviceName, definition, priceLists }: { readonly serviceName: string; readonly definition: unknown; readonly priceLists: readonly PriceList[] }) {
  const validated = validateProduct(definition, priceLists)
  const [input, setInput] = useState<ItemInput>(() => (validated.ok ? defaultInputs(validated.value, priceLists) : {}))
  if (!validated.ok) {
    return <p className="text-xs text-red-600 dark:text-red-400">Este servicio tiene una configuración inválida: {validated.errors[0]}</p>
  }
  return (
    <div className="space-y-3">
      <div className="-mx-3">
        <ConfigurableItemPanel
          fieldPrefix="calc"
          serviceName={serviceName}
          definition={definition}
          priceLists={priceLists}
          value={input}
          onChange={(next) => setInput(next)}
        />
      </div>
      <RulesSummary definition={validated.value} priceLists={priceLists} />
    </div>
  )
}

export function TestCalculatorDialog({ serviceName, definition, onClose }: TestCalculatorDialogProps) {
  const state = useActivePriceLists()
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-left" role="dialog" aria-modal="true" aria-labelledby="calc-title">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700" data-testid="test-calculator">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <h3 id="calc-title" className="text-sm font-semibold text-gray-900 dark:text-white">Calculadora de prueba</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{serviceName} · nada de esto se guarda</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          {state.status === 'loading' && <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Cargando precios...</p>}
          {state.status === 'error' && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
          {state.status === 'ready' && <CalculatorBody serviceName={serviceName} definition={definition} priceLists={state.priceLists} />}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <Link href="/dashboard/price-lists" className="text-xs text-orange-600 dark:text-orange-400 hover:underline">Editar listas de precios</Link>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  )
}
