import type { createServerClient } from '@/lib/supabase/server'
import { PLANS, isPlanId } from '@/lib/plans/catalog'
import { buildChecklist, type ChecklistStep } from './checklist'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

/** Pasos pendientes de la cuenta; null si ya se ocultó o ya está todo hecho. */
export async function loadChecklist(supabase: ServerClient, organizationId: string): Promise<readonly ChecklistStep[] | null> {
  const { data: org } = await supabase.from('organizations').select('plan, settings').eq('id', organizationId).single()
  const settings = (org?.settings ?? {}) as { logo_url?: string | null; checklist_dismissed_at?: string | null }
  if (settings.checklist_dismissed_at) return null

  const count = { count: 'exact', head: true } as const
  const [services, quotes, page, members, invites] = await Promise.all([
    supabase.from('service_catalog').select('id', count).eq('organization_id', organizationId),
    supabase.from('quotes').select('id', count).eq('organization_id', organizationId),
    supabase.from('public_profiles').select('is_published').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('profiles').select('id', count).eq('organization_id', organizationId),
    supabase.from('invitations').select('id', count).eq('organization_id', organizationId).is('accepted_at', null).gt('expires_at', new Date().toISOString()),
  ])

  const plan = org?.plan && isPlanId(org.plan) ? PLANS[org.plan] : PLANS.free
  const steps = buildChecklist({
    hasLogo: Boolean(settings.logo_url),
    services: services.count ?? 0,
    quotes: quotes.count ?? 0,
    pagePublished: page.data?.is_published === true,
    teammates: Math.max((members.count ?? 1) - 1, 0),
    pendingInvites: invites.count ?? 0,
    includedUsers: plan.includedUsers,
  })
  return steps.every((s) => s.done) ? null : steps
}
