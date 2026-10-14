'use client'

import { useEffect } from 'react'

/** Marca la vista desde el navegador: los generadores de vista previa no ejecutan JavaScript. */
export function ViewBeacon({ token }: { readonly token: string }) {
  useEffect(() => {
    // Sin efecto visible si falla: la vista es informativa y no debe interrumpir al cliente.
    fetch(`/api/public/quotes/${token}/view`, { method: 'POST', keepalive: true }).catch(() => undefined)
  }, [token])
  return null
}
