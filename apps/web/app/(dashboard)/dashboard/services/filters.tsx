'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

const UNIT_TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'fixed', label: 'Fijo' },
  { value: 'per_hour', label: 'Por Hora' },
  { value: 'per_sqm', label: 'Por m²' },
  { value: 'per_unit', label: 'Por Unidad' },
]

const ACTIVE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

interface ServiceFiltersProps {
  activeUnitType?: string
  activeFilter?: string
  defaultSearch?: string
}

export function ServiceFilters({ activeUnitType, activeFilter, defaultSearch }: ServiceFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateParam('q', e.target.value)
    },
    [updateParam]
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad:</span>
        <div className="flex flex-wrap gap-2">
          {UNIT_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParam('unit_type', opt.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeUnitType === opt.value || (!activeUnitType && opt.value === '')
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-2">Estado:</span>
        <div className="flex flex-wrap gap-2">
          {ACTIVE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParam('active', opt.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeFilter === opt.value || (!activeFilter && opt.value === '')
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar servicio..."
            className="pl-9 w-56"
            defaultValue={defaultSearch}
            onChange={handleSearch}
          />
        </div>
      </div>
    </div>
  )
}
