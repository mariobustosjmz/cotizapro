'use client'

import { Trash2 } from 'lucide-react'
import type { JobPhotoView } from '@/lib/showcase/job-photos'

const KIND_LABEL: Readonly<Record<JobPhotoView['kind'], string>> = { before: 'Antes', after: 'Después', other: 'Trabajo' }

interface PhotoTileProps {
  readonly photo: JobPhotoView
  readonly busy: boolean
  readonly onTogglePublic: (photo: JobPhotoView) => void
  readonly onDelete: (photo: JobPhotoView) => void
}

export function PhotoTile({ photo, busy, onTogglePublic, onDelete }: PhotoTileProps) {
  return (
    <figure className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" data-testid="job-photo">
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        {photo.url && (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Supabase Storage
          <img src={photo.url} alt={photo.caption ?? KIND_LABEL[photo.kind]} className="w-full h-full object-cover" loading="lazy" />
        )}
        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">{KIND_LABEL[photo.kind]}</span>
      </div>
      <figcaption className="flex items-center justify-between gap-2 px-2 py-1.5">
        <label className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={photo.is_public} disabled={busy} onChange={() => onTogglePublic(photo)} className="accent-orange-500" />
          En mi página
        </label>
        <button type="button" disabled={busy} onClick={() => onDelete(photo)} className="text-gray-400 hover:text-red-600 disabled:opacity-50" aria-label="Eliminar foto">
          <Trash2 className="w-3.5 h-3.5" aria-hidden />
        </button>
      </figcaption>
    </figure>
  )
}
