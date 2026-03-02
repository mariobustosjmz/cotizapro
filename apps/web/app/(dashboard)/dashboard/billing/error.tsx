'use client'

import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <AlertTriangle className="h-12 w-12 text-red-400 dark:text-red-500 mb-4" />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Algo salio mal
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
        Ocurrio un error inesperado. Intenta de nuevo o contacta soporte si el problema persiste.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
