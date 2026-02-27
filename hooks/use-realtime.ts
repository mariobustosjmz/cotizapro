'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  table: string
  schema?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  onEvent: () => void
}

export function useRealtime(options: UseRealtimeOptions[]) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  const stableOnEvents = useRef(options.map(o => o.onEvent))
  stableOnEvents.current = options.map(o => o.onEvent)

  const channelKey = options.map(o => `${o.table}:${o.event ?? '*'}:${o.filter ?? ''}`).join('|')

  useEffect(() => {
    const supabase = createBrowserClient()
    let channel = supabase.channel(`realtime-${Date.now()}`)

    options.forEach((opt, idx) => {
      channel = channel.on(
        'postgres_changes' as never,
        {
          event: opt.event ?? '*',
          schema: opt.schema ?? 'public',
          table: opt.table,
          ...(opt.filter ? { filter: opt.filter } : {}),
        },
        () => {
          stableOnEvents.current[idx]?.()
        },
      )
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey])
}

export function useRealtimeRefresh(
  tables: string[],
  onRefresh: () => void,
  filter?: string,
) {
  const stableRefresh = useCallback(onRefresh, [onRefresh])

  const options: UseRealtimeOptions[] = tables.map(table => ({
    table,
    event: '*',
    filter,
    onEvent: stableRefresh,
  }))

  useRealtime(options)
}
