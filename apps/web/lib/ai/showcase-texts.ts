import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { MemberContext } from '@/lib/auth/require-member'
import { AiError } from './errors'
import { showcaseTextsMessages, type ShowcaseFacts } from './prompts/showcase-texts'
import type { AiOrgInfo } from './route-context'
import { jsonCall, type AiCall, type AiRunDeps } from './run'
import { sanitizeText } from './sanitize'

/** Debajo de los límites de la vitrina (frase 120, descripción 1500) para que una propuesta siempre se pueda guardar. */
export const SHOWCASE_HEADLINE_MAX = 90
export const SHOWCASE_BIO_MAX = 600
const SERVICES_LIMIT = 8

export const rawShowcaseSchema = z.object({ headline: z.string().default(''), bio: z.string().default('') })

export interface ShowcaseTexts {
  readonly headline: string
  readonly bio: string
}

function cleanTexts(raw: z.infer<typeof rawShowcaseSchema>): ShowcaseTexts {
  const headline = sanitizeText(raw.headline.replace(/\s+/g, ' '), SHOWCASE_HEADLINE_MAX)
  return { headline, bio: sanitizeText(raw.bio, SHOWCASE_BIO_MAX) }
}

/** Vacío tras limpiar cuenta como esquema inválido: chatJson hace su único reintento y, si persiste, la reserva se reembolsa. */
const cleanedShowcaseSchema = rawShowcaseSchema.transform(cleanTexts).refine((texts) => texts.headline !== '' || texts.bio !== '')

export function cleanShowcaseTexts(raw: z.infer<typeof rawShowcaseSchema>): ShowcaseTexts {
  const texts = cleanTexts(raw)
  if (!texts.headline && !texts.bio) throw new AiError('invalid_output', 'empty_showcase')
  return texts
}

export function showcaseTextsCall(deps: AiRunDeps, org: AiOrgInfo, facts: ShowcaseFacts): AiCall<ShowcaseTexts> {
  return jsonCall(deps, 'showcase_texts', showcaseTextsMessages(org, facts), cleanedShowcaseSchema)
}

const profileSchema = z.object({
  display_name: z.string(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  city: z.string().nullable(),
  service_area: z.string().nullable(),
})
const serviceRowSchema = z.object({ name: z.string() })

export async function loadShowcaseFacts(db: MemberContext['supabase'], organizationId: string, fallbackName: string): Promise<ShowcaseFacts> {
  const [profileRes, servicesRes] = await Promise.all([
    db.from('public_profiles').select('display_name, headline, bio, city, service_area').eq('organization_id', organizationId).maybeSingle(),
    db.from('service_catalog').select('name').eq('organization_id', organizationId).eq('is_active', true).order('name').limit(SERVICES_LIMIT),
  ])
  if (profileRes.error) logger.warn('showcase facts: profile query failed', { code: profileRes.error.code })
  if (servicesRes.error) logger.warn('showcase facts: services query failed', { code: servicesRes.error.code })
  const parsed = profileSchema.safeParse(profileRes.data)
  const profile = parsed.success ? parsed.data : null
  const services = (servicesRes.data ?? []).flatMap((row: unknown) => {
    const service = serviceRowSchema.safeParse(row)
    return service.success ? [service.data.name] : []
  })
  return {
    displayName: profile?.display_name || fallbackName,
    city: profile?.city ?? null,
    serviceArea: profile?.service_area ?? null,
    services,
    currentHeadline: profile?.headline ?? null,
    currentBio: profile?.bio ?? null,
  }
}
