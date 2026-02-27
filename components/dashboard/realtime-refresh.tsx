'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useRealtimeRefresh } from '@/hooks/use-realtime'

interface RealtimeRefreshProps {
  tables: string[]
}

export function RealtimeRefresh({ tables }: RealtimeRefreshProps) {
  const router = useRouter()
  const refresh = useCallback(() => router.refresh(), [router])

  useRealtimeRefresh(tables, refresh)

  return null
}
