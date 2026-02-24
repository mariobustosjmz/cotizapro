import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { ClientLayout } from '@/components/dashboard/client-layout'

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
    .select('*, organizations(name)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <DashboardSidebar
        user={user}
        profile={profile}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader user={user} profile={profile} />

        {/* Page Content — ClientLayout adds: ToastProvider, keyboard shortcuts, page transitions */}
        <ClientLayout>
          {children}
        </ClientLayout>
      </div>
    </div>
  )
}
