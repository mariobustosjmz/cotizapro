'use client'

import { FILTER_OPTIONS } from './constants'
import type { QuoteRequestFilter } from './types'

interface StatusFilterProps {
  readonly value: QuoteRequestFilter
  readonly onChange: (value: QuoteRequestFilter) => void
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div role="tablist" aria-label="Filtrar solicitudes por estado" className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              active
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-orange-300 dark:hover:border-orange-700'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
