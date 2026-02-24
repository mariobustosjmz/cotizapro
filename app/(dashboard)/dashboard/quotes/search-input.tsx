'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function QuoteSearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(searchParams.toString())
      if (e.target.value) {
        params.set('q', e.target.value)
      } else {
        params.delete('q')
      }
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="search"
        placeholder="Buscar por número..."
        className="pl-9 w-56"
        defaultValue={defaultValue}
        onChange={handleSearch}
      />
    </div>
  )
}
