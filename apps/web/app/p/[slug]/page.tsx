import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicProfile } from '@/lib/showcase/get-public-profile'
import { ProfileHeader } from '@/components/showcase/profile-header'
import { QuoteRequestForm } from '@/components/showcase/quote-request-form'
import { AboutSection, PortfolioSection, ReviewsSection, ServicesSection } from '@/components/showcase/showcase-sections'

interface PageProps {
  readonly params: Promise<{ slug: string }>
}

const MEASUREMENT_TRADES = new Set(['glass', 'sewing', 'electrical', 'plumbing'])

export const revalidate = 300

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getPublicProfile(slug)
  if (!data) return { title: 'Página no encontrada' }
  const rating = data.stats.rating_avg ? ` · ${data.stats.rating_avg.toFixed(1)} estrellas` : ''
  const description = data.profile.headline ?? `${data.stats.completed_jobs} trabajos realizados${rating}`
  return {
    title: data.profile.display_name,
    description,
    openGraph: { title: data.profile.display_name, description, type: 'profile' },
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params
  const data = await getPublicProfile(slug)
  if (!data) notFound()

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10 space-y-4">
        <ProfileHeader data={data} />
        <AboutSection data={data} />
        <ServicesSection data={data} />
        <PortfolioSection data={data} />
        <ReviewsSection data={data} />
        <section id="pedir-cotizacion" className="bg-white dark:bg-gray-900 rounded-2xl border border-orange-200 dark:border-orange-900/50 p-5 sm:p-7 scroll-mt-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pedir cotización</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Sin costo ni compromiso. {data.profile.display_name} recibe tu solicitud al instante.</p>
          <QuoteRequestForm slug={data.slug} businessName={data.profile.display_name} askMeasurements={MEASUREMENT_TRADES.has(data.trade ?? '')} />
        </section>
        <footer className="text-center text-xs text-gray-400 py-4">
          Página creada con{' '}
          <Link href="/" className="font-semibold text-orange-600 hover:underline">
            CotizaPro
          </Link>
          . ¿Tienes un negocio u oficio? Crea la tuya gratis.
        </footer>
      </div>
    </main>
  )
}
