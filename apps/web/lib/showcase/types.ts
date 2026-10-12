import { z } from 'zod'

export const publicProfileSchema = z.object({
  slug: z.string(),
  account_type: z.enum(['person', 'group', 'company']),
  trade: z.string().nullable(),
  member_since: z.string(),
  profile: z.object({
    display_name: z.string(),
    headline: z.string().nullable(),
    bio: z.string().nullable(),
    service_area: z.string().nullable(),
    city: z.string().nullable(),
    whatsapp_phone: z.string().nullable(),
    contact_email: z.string().nullable(),
    logo_path: z.string().nullable(),
    cover_path: z.string().nullable(),
  }),
  stats: z.object({
    completed_jobs: z.number(),
    review_count: z.number(),
    rating_avg: z.number().nullable(),
  }),
  services: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      category: z.string(),
      unit_type: z.string(),
      price_from: z.number().nullable(),
    }),
  ),
  photos: z.array(z.object({ path: z.string(), kind: z.enum(['before', 'after', 'other']), caption: z.string().nullable(), job: z.string() })),
  reviews: z.array(
    z.object({
      rating: z.number(),
      comment: z.string().nullable(),
      owner_reply: z.string().nullable(),
      submitted_at: z.string(),
      client: z.string(),
    }),
  ),
})

export type PublicProfileData = z.infer<typeof publicProfileSchema>

export interface ShowcasePhoto {
  readonly url: string
  readonly kind: 'before' | 'after' | 'other'
  readonly caption: string | null
}

export interface ShowcaseJob {
  readonly job: string
  readonly photos: readonly ShowcasePhoto[]
}

export interface PublicProfileView extends PublicProfileData {
  readonly jobs: readonly ShowcaseJob[]
  readonly logoUrl: string | null
}
