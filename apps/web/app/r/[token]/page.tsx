import type { Metadata } from 'next'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { ReviewForm } from '@/components/showcase/review-form'

interface PageProps {
  readonly params: Promise<{ token: string }>
}

const reviewRequestSchema = z.object({
  status: z.enum(['open', 'submitted', 'expired']),
  business: z.string(),
  slug: z.string(),
  quote_number: z.string().nullable(),
  client: z.string().nullable(),
})

export const metadata: Metadata = { title: 'Califica el servicio', robots: { index: false } }
export const dynamic = 'force-dynamic'

function Shell({ children }: { readonly children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 grid place-items-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">{children}</div>
    </main>
  )
}

export default async function ReviewPage({ params }: PageProps) {
  const { token } = await params
  const valid = /^[a-f0-9]{48}$/.test(token)
  const supabase = await createServerClient()
  const { data } = valid ? await supabase.rpc('get_review_request', { p_token: token }) : { data: null }
  const request = reviewRequestSchema.safeParse(data)

  if (!request.success) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-gray-900">Liga no válida</h1>
        <p className="mt-2 text-sm text-gray-500">Revisa que la liga esté completa o pide una nueva a quien te atendió.</p>
      </Shell>
    )
  }
  const r = request.data
  const profileUrl = `/p/${r.slug}`
  if (r.status !== 'open') {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-gray-900">{r.status === 'submitted' ? 'Esta reseña ya fue enviada' : 'Esta liga expiró'}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {r.status === 'submitted' ? `Gracias por calificar a ${r.business}.` : `Pide a ${r.business} una liga nueva.`}
        </p>
        <a href={profileUrl} className="mt-4 inline-block text-sm font-semibold text-orange-600 hover:underline">Ver su página</a>
      </Shell>
    )
  }
  return (
    <Shell>
      <p className="text-xs font-medium text-orange-600">Reseña verificada{r.quote_number ? ` · ${r.quote_number}` : ''}</p>
      <h1 className="mt-1 text-xl font-bold text-gray-900">
        {r.client ? `${r.client}, ¿` : '¿'}cómo calificas el trabajo de {r.business}?
      </h1>
      <p className="mt-1 mb-5 text-sm text-gray-500">Tu opinión aparece en su página pública con tu nombre abreviado.</p>
      <ReviewForm token={token} business={r.business} profileUrl={profileUrl} />
    </Shell>
  )
}
