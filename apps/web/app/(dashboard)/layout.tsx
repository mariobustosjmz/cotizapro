import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { ClientLayout } from '@/components/dashboard/client-layout'
import { FAB } from '@/components/dashboard/fab'
import type { CSSProperties } from 'react'
import { brandCssVars } from '@/lib/branding/color'
import { orgBranding } from '@/lib/branding/org-branding'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()

  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(name, settings)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  const organization = profile.organizations as unknown as { name: string | null; settings: unknown } | null
  const branding = orgBranding(organization?.name, organization?.settings)

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-gray-950" style={brandCssVars(branding.palette) as CSSProperties}>
      {/* Sidebar */}
      <DashboardSidebar
        user={user}
        profile={profile}
        branding={branding}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader user={user} profile={profile} />

        {/* Page Content — ClientLayout adds: ToastProvider, keyboard shortcuts, page transitions */}
        <ClientLayout>
          {children}
        </ClientLayout>

        {/* Mobile FAB */}
        <FAB />
      </div>
    </div>
  )
}
