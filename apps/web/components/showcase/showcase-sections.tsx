import type { PublicProfileView } from '@/lib/showcase/types'
import { RatingStars } from './rating-stars'

const UNIT_LABEL: Readonly<Record<string, string>> = {
  fixed: 'servicio',
  per_hour: 'hora',
  per_sqm: 'm²',
  per_unit: 'pieza',
  per_lm: 'metro lineal',
}

const KIND_LABEL = { before: 'Antes', after: 'Después', other: 'Trabajo' } as const

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-7">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </section>
  )
}

export function AboutSection({ data }: { readonly data: PublicProfileView }) {
  if (!data.profile.bio && !data.profile.service_area) return null
  return (
    <Section title="Sobre nosotros">
      {data.profile.bio && <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.profile.bio}</p>}
      {data.profile.service_area && (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">Zona de servicio:</span> {data.profile.service_area}
        </p>
      )}
    </Section>
  )
}

export function ServicesSection({ data }: { readonly data: PublicProfileView }) {
  if (data.services.length === 0) return null
  return (
    <Section title="Servicios">
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {data.services.map((s) => (
          <li key={s.name} className="py-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
              {s.description && <p className="text-sm text-gray-500 dark:text-gray-400">{s.description}</p>}
            </div>
            {s.price_from !== null && (
              <p className="shrink-0 text-right text-sm text-gray-700 dark:text-gray-300">
                <span className="block text-[11px] text-gray-400">desde</span>
                <span className="font-semibold tabular-nums">${s.price_from.toLocaleString('es-MX')}</span>
                <span className="text-gray-400"> / {UNIT_LABEL[s.unit_type] ?? s.unit_type}</span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function PortfolioSection({ data }: { readonly data: PublicProfileView }) {
  if (data.jobs.length === 0) return null
  return (
    <Section title="Trabajos realizados">
      <div className="space-y-4">
        {data.jobs.map((job) => (
          <div key={job.job} className="grid grid-cols-2 gap-2">
            {job.photos.map((photo) => (
              <figure key={photo.url} className="relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Supabase Storage */}
                <img src={photo.url} alt={photo.caption ?? KIND_LABEL[photo.kind]} loading="lazy" className="w-full h-full object-cover" />
                <figcaption className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">{KIND_LABEL[photo.kind]}</figcaption>
              </figure>
            ))}
          </div>
        ))}
      </div>
    </Section>
  )
}

export function ReviewsSection({ data }: { readonly data: PublicProfileView }) {
  if (data.reviews.length === 0) return null
  return (
    <Section title={`Reseñas verificadas (${data.stats.review_count})`}>
      <ul className="space-y-4">
        {data.reviews.map((r) => (
          <li key={`${r.client}-${r.submitted_at}`} className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900 dark:text-white">{r.client}</p>
              <time className="text-xs text-gray-400" dateTime={r.submitted_at}>
                {new Date(r.submitted_at).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
              </time>
            </div>
            <RatingStars value={r.rating} />
            {r.comment && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{r.comment}</p>}
            {r.owner_reply && <p className="mt-2 ml-3 border-l-2 border-orange-300 pl-3 text-sm text-gray-500 dark:text-gray-400">Respuesta: {r.owner_reply}</p>}
          </li>
        ))}
      </ul>
    </Section>
  )
}
