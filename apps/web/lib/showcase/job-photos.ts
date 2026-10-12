import type { MemberContext } from '@/lib/auth/require-member'

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PHOTO_TYPES: Readonly<Record<string, string>> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const SIGNED_TTL = 60 * 60

export interface JobPhotoView {
  readonly id: string
  readonly url: string | null
  readonly kind: 'before' | 'after' | 'other'
  readonly caption: string | null
  readonly is_public: boolean
}

export async function listJobPhotos(ctx: MemberContext, quoteId: string): Promise<readonly JobPhotoView[]> {
  const { data } = await ctx.supabase
    .from('job_photos')
    .select('id, storage_path, kind, caption, is_public')
    .eq('organization_id', ctx.organizationId)
    .eq('quote_id', quoteId)
    .order('sort_order')
    .order('created_at')
    .limit(50)
  const rows = data ?? []
  if (rows.length === 0) return []
  const { data: signed } = await ctx.supabase.storage.from('job-photos').createSignedUrls(rows.map((r) => r.storage_path as string), SIGNED_TTL)
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  return rows.map((r) => ({
    id: r.id as string,
    url: urlByPath.get(r.storage_path as string) ?? null,
    kind: r.kind as JobPhotoView['kind'],
    caption: (r.caption as string | null) ?? null,
    is_public: Boolean(r.is_public),
  }))
}
