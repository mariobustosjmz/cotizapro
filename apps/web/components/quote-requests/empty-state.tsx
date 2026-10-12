import Link from 'next/link'
import { Inbox } from 'lucide-react'
import type { QuoteRequestFilter } from './types'

interface EmptyStateProps {
  readonly filter: QuoteRequestFilter
}

const FILTERED_MESSAGES: Readonly<Record<Exclude<QuoteRequestFilter, 'all' | 'new'>, string>> = {
  converted: 'Aún no has convertido ninguna solicitud en cliente.',
  discarded: 'No hay solicitudes descartadas.',
}

export function EmptyState({ filter }: EmptyStateProps) {
  const isFiltered = filter === 'converted' || filter === 'discarded'
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-center py-10 px-6">
      <Inbox className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700" />
      {isFiltered ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{FILTERED_MESSAGES[filter]}</p>
      ) : (
        <>
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">No tienes solicitudes nuevas</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Las solicitudes llegan cuando un cliente llena el formulario de tu página pública
            (<span className="font-mono text-xs">/p/tu-negocio</span>). Publica y comparte tu página para empezar a recibirlas.
          </p>
          <Link
            href="/dashboard/vitrina"
            className="inline-flex mt-4 items-center rounded-md bg-orange-500 hover:bg-orange-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Configurar mi página pública
          </Link>
        </>
      )}
    </div>
  )
}
