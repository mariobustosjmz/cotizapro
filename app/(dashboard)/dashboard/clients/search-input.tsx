'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface ClientSearchInputProps {
  defaultValue?: string
  onSearch?: (term: string) => void
}

export function ClientSearchInput({ defaultValue, onSearch }: ClientSearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      debounceTimer.current = setTimeout(() => {
        if (onSearch) {
          onSearch(term)
        } else {
          const params = new URLSearchParams(searchParams.toString())
          if (term) {
            params.set('q', term)
          } else {
            params.delete('q')
          }
          router.replace(`${pathname}?${params.toString()}`)
        }
      }, 300)
    },
    [router, pathname, searchParams, onSearch]
  )

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="search"
        placeholder="Buscar por nombre o empresa..."
        className="pl-9 w-64"
        defaultValue={defaultValue}
        onChange={handleSearch}
      />
    </div>
  )
}
