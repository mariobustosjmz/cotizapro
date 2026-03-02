'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { useRealtimeRefresh } from '@/hooks/use-realtime'
import { useToast } from '@/components/ui/toast'

interface RealtimeRefreshProps {
  tables: string[]
  showNotification?: boolean
}

export function RealtimeRefresh({ tables, showNotification = true }: RealtimeRefreshProps) {
  const router = useRouter()
  const { toast } = useToast()
  const toastShownRef = useRef(false)

  const refresh = useCallback(() => {
    // Debounce toast notifications to avoid spam (one per 3 seconds)
    if (showNotification && !toastShownRef.current) {
      toastShownRef.current = true
      toast({
        message: 'Datos actualizados',
        variant: 'info'
      })

      setTimeout(() => {
        toastShownRef.current = false
      }, 3000)
    }

    router.refresh()
  }, [router, showNotification, toast])

  useRealtimeRefresh(tables, refresh)

  return null
}
