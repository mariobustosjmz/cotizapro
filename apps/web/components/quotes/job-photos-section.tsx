'use client'

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import type { JobPhotoView } from '@/lib/showcase/job-photos'
import { PhotoTile } from './photo-tile'
import { useJobPhotos } from './use-job-photos'

type Kind = JobPhotoView['kind']
const KINDS: readonly { readonly value: Kind; readonly label: string }[] = [
  { value: 'before', label: 'Antes' },
  { value: 'after', label: 'Después' },
  { value: 'other', label: 'Trabajo' },
]

export function JobPhotosSection({ quoteId }: { readonly quoteId: string }) {
  const { photos, busy, error, upload, togglePublic, remove } = useJobPhotos(quoteId)
  const [kind, setKind] = useState<Kind>('before')
  const inputRef = useRef<HTMLInputElement>(null)

  function onFiles(list: FileList | null) {
    const files = list ? Array.from(list) : []
    if (files.length > 0) void upload(files, kind)
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDelete(photo: JobPhotoView) {
    if (window.confirm('¿Eliminar esta foto? No se puede deshacer.')) void remove(photo)
  }

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3" data-testid="job-photos-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Fotos del trabajo</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Las que marques &quot;En mi página&quot; aparecen en tu portafolio cuando el trabajo esté completado o cobrado.</p>
        </div>
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="Tipo de foto" className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
            {KINDS.map((k) => (
              <button key={k.value} type="button" role="radio" aria-checked={kind === k.value} onClick={() => setKind(k.value)} className={`px-2.5 py-1.5 ${kind === k.value ? 'bg-orange-500 text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                {k.label}
              </button>
            ))}
          </div>
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white">
            <Camera className="w-3.5 h-3.5" aria-hidden /> {busy ? 'Subiendo...' : 'Agregar fotos'}
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} data-testid="job-photos-input" />
        </div>
      </div>
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      {photos.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Aún no hay fotos. Toma fotos antes y después: son tu mejor publicidad.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {photos.map((p) => (
            <PhotoTile key={p.id} photo={p} busy={busy} onTogglePublic={(x) => void togglePublic(x)} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  )
}
