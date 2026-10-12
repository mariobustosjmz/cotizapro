import type { SeedAccount, SeedUser } from '../data/accounts'
import { type Admin, check } from '../util'

export interface OrgUsers {
  readonly ownerId: string
  readonly userIds: readonly string[]
}

async function findUserId(admin: Admin, email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`listUsers: ${error.message}`)
    const found = data.users.find((u) => u.email === email)
    if (found) return found.id
    if (data.users.length < 200) return null
  }
  return null
}

async function createUser(admin: Admin, email: string, password: string, metadata: Record<string, string>): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata })
  if (error || !data.user) throw new Error(`create ${email}: ${error?.message ?? 'sin usuario'}`)
  return data.user.id
}

async function ensureUser(admin: Admin, orgId: string, user: SeedUser, password: string): Promise<string> {
  const metadata = { organization_id: orgId, full_name: user.fullName }
  const existing = await findUserId(admin, user.email)
  if (existing) {
    check(await admin.auth.admin.updateUserById(existing, { password, user_metadata: metadata, email_confirm: true }), `update ${user.email}`)
  }
  const id = existing ?? (await createUser(admin, user.email, password, metadata))
  check(
    await admin.from('profiles').upsert({ id, organization_id: orgId, role: user.role, email: user.email, full_name: user.fullName }, { onConflict: 'id' }),
    `profile ${user.email}`,
  )
  return id
}

async function removeStorageFolder(admin: Admin, bucket: string, orgId: string): Promise<void> {
  const { data: quotes } = await admin.storage.from(bucket).list(orgId, { limit: 1000 })
  for (const folder of quotes ?? []) {
    const { data: files } = await admin.storage.from(bucket).list(`${orgId}/${folder.name}`, { limit: 1000 })
    const paths = (files ?? []).map((f) => `${orgId}/${folder.name}/${f.name}`)
    if (paths.length > 0) await admin.storage.from(bucket).remove(paths)
  }
}

/** Borra todo lo de la org demo (cotizaciones primero por la FK RESTRICT de clientes) y la recrea. */
export async function resetOrg(admin: Admin, account: SeedAccount, password: string): Promise<OrgUsers> {
  await removeStorageFolder(admin, 'job-photos', account.id)
  check(await admin.from('quotes').delete().eq('organization_id', account.id), 'delete quotes')
  check(await admin.from('organizations').delete().eq('id', account.id), 'delete org')
  check(
    await admin.from('organizations').insert({
      id: account.id,
      name: account.name,
      slug: account.slug,
      subscription_status: 'active',
      plan: 'pro',
      account_type: account.accountType,
      trade: account.trade,
      onboarding_completed_at: new Date().toISOString(),
    }),
    'insert org',
  )
  const userIds: string[] = []
  for (const user of account.users) userIds.push(await ensureUser(admin, account.id, user, password))
  return { ownerId: userIds[0]!, userIds }
}
