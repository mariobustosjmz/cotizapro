'use client'

import { useCallback, useEffect, useState } from 'react'
import type { JobPhotoView } from '@/lib/showcase/job-photos'

type Kind = JobPhotoView['kind']

async function readError(res: Response, fallback: string): Promise<string> {
  const body: { error?: string } = await res.json().catch(() => ({}))
  return body.error ?? fallback
}

export function useJobPhotos(quoteId: string) {
  const [photos, setPhotos] = useState<readonly JobPhotoView[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    const res = await fetch(`/api/quotes/${quoteId}/photos`)
    if (!res.ok) return setError(await readError(res, 'No se pudieron cargar las fotos'))
    const body: { data: readonly JobPhotoView[] } = await res.json()
    setPhotos(body.data)
  }, [quoteId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function run(action: () => Promise<Response>, fallback: string) {
    setBusy(true)
    setError('')
    try {
      const res = await action()
      if (!res.ok) setError(await readError(res, fallback))
      await reload()
    } catch {
      setError('Sin conexión. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const upload = (files: readonly File[], kind: Kind) =>
    run(async () => {
      let last = new Response(null, { status: 204 })
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        form.append('quote_id', quoteId)
        form.append('kind', kind)
        last = await fetch('/api/upload/job-photos', { method: 'POST', body: form })
        if (!last.ok) break
      }
      return last
    }, 'No se pudo subir la foto')

  const togglePublic = (photo: JobPhotoView) =>
    run(() => fetch(`/api/job-photos/${photo.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_public: !photo.is_public }) }), 'No se pudo actualizar la foto')

  const remove = (photo: JobPhotoView) => run(() => fetch(`/api/job-photos/${photo.id}`, { method: 'DELETE' }), 'No se pudo eliminar la foto')

  return { photos, busy, error, upload, togglePublic, remove }
}
