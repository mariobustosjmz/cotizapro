'use client'

import { useEffect, useState } from 'react'
import { Info, Lock, Tags } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { fetchPriceLists } from './price-list-api'
import { PriceListCard } from './price-list-card'
import type { PriceListRecord } from './types'

interface PriceListsEditorProps {
  readonly canEdit: boolean
}

function FrozenQuotesNote() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/60 dark:bg-orange-950/20 px-3 py-2 text-xs text-orange-800 dark:text-orange-300">
      <Info className="w-4 h-4 flex-shrink-0 mt-px" />
      <p>Cambiar precios no modifica las cotizaciones ya guardadas: cada cotización conserva una copia congelada de los precios con los que se creó. Los cambios aplican a cotizaciones nuevas.</p>
    </div>
  )
}

function ReadOnlyNote() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-xs text-gray-600 dark:text-gray-300" data-testid="price-lists-readonly">
      <Lock className="w-4 h-4 flex-shrink-0 mt-px" />
      <p>Solo lectura: solo el dueño o un administrador pueden modificar las listas de precios.</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-center py-10">
      <Tags className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700" />
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Aún no tienes listas de precios activas</p>
    </div>
  )
}

export function PriceListsEditor({ canEdit }: PriceListsEditorProps) {
  const { toast } = useToast()
  const [lists, setLists] = useState<readonly PriceListRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [readOnly, setReadOnly] = useState(!canEdit)

  useEffect(() => {
    fetchPriceLists().then((result) => {
      if (result.ok) setLists(result.data.filter((list) => list.is_active))
      else setLoadError(result.error)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Cargando...</div>
  if (loadError) {
    return <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">{loadError}</div>
  }

  return (
    <div className="space-y-3">
      <FrozenQuotesNote />
      {readOnly && <ReadOnlyNote />}
      {lists.length === 0 ? (
        <EmptyState />
      ) : (
        lists.map((list) => (
          <PriceListCard
            key={list.id}
            list={list}
            readOnly={readOnly}
            onSuccess={(message) => toast({ message, variant: 'success' })}
            onError={(message) => toast({ message, variant: 'error' })}
            onForbidden={() => setReadOnly(true)}
            onArchived={(id) => {
              setLists((prev) => prev.filter((l) => l.id !== id))
              toast({ message: 'Lista archivada', variant: 'success' })
            }}
          />
        ))
      )}
    </div>
  )
}
