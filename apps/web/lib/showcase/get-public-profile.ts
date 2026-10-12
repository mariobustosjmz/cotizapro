import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { publicProfileSchema, type PublicProfileView, type ShowcaseJob } from './types'

const SIGNED_URL_TTL_SECONDS = 60 * 60
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/

function groupByJob(photos: readonly { job: string; url: string; kind: ShowcaseJob['photos'][number]['kind']; caption: string | null }[]): readonly ShowcaseJob[] {
  const jobs = new Map<string, ShowcaseJob['photos'][number][]>()
  for (const p of photos) jobs.set(p.job, [...(jobs.get(p.job) ?? []), { url: p.url, kind: p.kind, caption: p.caption }])
  const order = { before: 0, other: 1, after: 2 } as const
  return [...jobs.entries()].map(([job, list]) => ({ job, photos: [...list].sort((a, b) => order[a.kind] - order[b.kind]) }))
}

/** Lee la vitrina por RPC anónima (sin service role) y firma las URLs de fotos públicas. */
export const getPublicProfile = cache(async (slug: string): Promise<PublicProfileView | null> => {
  if (!SLUG_PATTERN.test(slug)) return null
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('get_public_profile', { p_slug: slug })
  if (error) {
    logger.error('get_public_profile failed', error, { slug })
    return null
  }
  const parsed = publicProfileSchema.safeParse(data)
  if (!parsed.success) return null

  const paths = parsed.data.photos.map((p) => p.path)
  const signed = paths.length ? await supabase.storage.from('job-photos').createSignedUrls(paths, SIGNED_URL_TTL_SECONDS) : { data: [], error: null }
  if (signed.error) logger.warn('signing showcase photos failed', { slug, message: signed.error.message })
  const urlByPath = new Map((signed.data ?? []).flatMap((s) => (s.signedUrl && s.path ? [[s.path, s.signedUrl] as const] : [])))
  const photos = parsed.data.photos.flatMap((p) => {
    const url = urlByPath.get(p.path)
    return url ? [{ ...p, url }] : []
  })
  const logoPath = parsed.data.profile.logo_path
  const logoUrl = logoPath ? supabase.storage.from('brand-assets').getPublicUrl(logoPath).data.publicUrl : null
  return { ...parsed.data, jobs: groupByJob(photos), logoUrl }
})
