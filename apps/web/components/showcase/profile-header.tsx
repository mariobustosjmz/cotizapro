import { BadgeCheck, MapPin, MessageCircle } from 'lucide-react'
import type { PublicProfileView } from '@/lib/showcase/types'
import { RatingStars } from './rating-stars'

const ACCOUNT_LABEL: Readonly<Record<PublicProfileView['account_type'], string>> = {
  person: 'Profesional independiente',
  group: 'Equipo de trabajo',
  company: 'Empresa',
}

export function whatsappLink(phone: string, businessName: string): string {
  const text = `Hola ${businessName}, vi su página en CotizaPro y me gustaría una cotización.`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
}

export function ProfileHeader({ data }: { readonly data: PublicProfileView }) {
  const { profile, stats } = data
  const since = new Date(data.member_since).getFullYear()
  return (
    <header className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="h-2 bg-[var(--brand)]" aria-hidden />
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          {data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo servido desde Supabase Storage del propio proyecto
            <img src={data.logoUrl} alt={`Logo de ${profile.display_name}`} className="w-16 h-16 shrink-0 rounded-xl object-contain bg-white border border-gray-200" />
          ) : (
            <div className="w-16 h-16 shrink-0 rounded-xl bg-[var(--brand)] text-[var(--brand-ink)] grid place-items-center text-xl font-bold">{initials(profile.display_name)}</div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--brand-on-light)] dark:text-[var(--brand-on-dark)]">{ACCOUNT_LABEL[data.account_type]}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">{profile.display_name}</h1>
            {profile.headline && <p className="mt-1 text-gray-600 dark:text-gray-300">{profile.headline}</p>}
            {profile.city && (
              <p className="mt-2 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="w-4 h-4" aria-hidden /> {profile.city}
              </p>
            )}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
            <dt className="text-[11px] text-gray-500 dark:text-gray-400">Trabajos realizados</dt>
            <dd className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{stats.completed_jobs}</dd>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
            <dt className="text-[11px] text-gray-500 dark:text-gray-400">Calificación</dt>
            <dd className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{stats.rating_avg ? stats.rating_avg.toFixed(1) : 'Nuevo'}</dd>
            {stats.rating_avg && <RatingStars value={stats.rating_avg} />}
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
            <dt className="text-[11px] text-gray-500 dark:text-gray-400">En CotizaPro desde</dt>
            <dd className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{since}</dd>
          </div>
        </dl>

        <p className="mt-4 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
          Reseñas verificadas: cada una proviene de un trabajo cobrado y registrado en CotizaPro.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <a href="#pedir-cotizacion" className="flex-1 text-center rounded-xl bg-[var(--brand)] hover:brightness-95 text-[var(--brand-ink)] font-semibold py-3 transition">
            Pedir cotización
          </a>
          {profile.whatsapp_phone && (
            <a
              href={whatsappLink(profile.whatsapp_phone, profile.display_name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold py-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
            >
              <MessageCircle className="w-4 h-4" aria-hidden /> WhatsApp
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
