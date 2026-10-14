'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

/** Rol del usuario en su empresa; null mientras carga o si no se pudo leer. */
export function useMemberRole(): string | null {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load(): Promise<void> {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (active && data) setRole(String(data.role))
    }
    load().catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  return role
}
