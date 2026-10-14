import { createServerClient } from '@/lib/supabase/server'
import type { AccountType, Trade } from '@/lib/validations/onboarding'

export interface OwnProfile {
  readonly display_name: string
  readonly headline: string | null
  readonly bio: string | null
  readonly service_area: string | null
  readonly city: string | null
  readonly whatsapp_phone: string | null
  readonly contact_email: string | null
  readonly is_published: boolean
  readonly show_prices: boolean
}

export interface OwnShowcase {
  readonly role: string
  readonly organizationId: string
  readonly db: Awaited<ReturnType<typeof createServerClient>>
  readonly orgName: string
  readonly slug: string
  readonly accountType: AccountType | null
  readonly trade: Trade | null
  readonly profile: OwnProfile | null
}

const PROFILE_COLUMNS = 'display_name, headline, bio, service_area, city, whatsapp_phone, contact_email, is_published, show_prices'

export async function getOwnShowcase(): Promise<OwnShowcase | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: member } = await supabase
    .from('profiles')
    .select('role, organization_id, organizations(name, slug, account_type, trade)')
    .eq('id', user.id)
    .single()
  if (!member) return null
  const org = member.organizations as unknown as { name: string; slug: string; account_type: AccountType | null; trade: Trade | null } | null
  if (!org) return null
  const { data: profile } = await supabase
    .from('public_profiles')
    .select(PROFILE_COLUMNS)
    .eq('organization_id', member.organization_id as string)
    .maybeSingle()
  return {
    role: member.role as string,
    organizationId: member.organization_id as string,
    db: supabase,
    orgName: org.name,
    slug: org.slug,
    accountType: org.account_type,
    trade: org.trade,
    profile: (profile as OwnProfile | null) ?? null,
  }
}
