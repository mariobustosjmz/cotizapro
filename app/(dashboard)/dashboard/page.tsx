import { createServerClient } from '@/lib/supabase/server'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { RecentActivity } from '@/components/dashboard/recent-activity'

export default async function DashboardPage() {
  const supabase = await createServerClient()

  // Fetch dashboard data
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return null
  }

  // Fetch analytics
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/dashboard`, {
    headers: {
      'Cookie': `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
    cache: 'no-store',
  })

  const analytics = response.ok ? await response.json() : null

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">
          Resumen de tu negocio
        </p>
      </div>

      {/* Stats Cards */}
      {analytics && <DashboardStats data={analytics} />}

      {/* Recent Activity */}
      <RecentActivity organizationId={profile.organization_id} />
    </div>
  )
}
