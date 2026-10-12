import { createServerClient } from '@/lib/supabase/server'
import { ACCOUNT_TYPES, TRADES, type AccountType, type Trade } from '@/lib/validations/onboarding'

export interface AccountSetupState {
  readonly organizationId: string
  readonly role: string
  readonly accountType: AccountType | null
  readonly trade: Trade | null
  readonly onboardingCompleted: boolean
}

function asAccountType(v: unknown): AccountType | null {
  return ACCOUNT_TYPES.find((t) => t === v) ?? null
}

function asTrade(v: unknown): Trade | null {
  return TRADES.find((t) => t === v) ?? null
}

export async function getAccountSetup(): Promise<AccountSetupState | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('organization_id, role, organizations(account_type, trade, onboarding_completed_at)')
    .eq('id', user.id)
    .single()
  if (!data) return null
  const org = data.organizations as unknown as { account_type: string | null; trade: string | null; onboarding_completed_at: string | null } | null
  return {
    organizationId: data.organization_id as string,
    role: data.role as string,
    accountType: asAccountType(org?.account_type),
    trade: asTrade(org?.trade),
    onboardingCompleted: Boolean(org?.onboarding_completed_at),
  }
}
