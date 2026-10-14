import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/admin/require-platform-admin'

export default async function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isPlatformAdmin(supabase))) notFound()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <ShieldCheck className="h-4 w-4 text-orange-600" aria-hidden="true" />
            CotizaPro · Plataforma
          </p>
          <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Ir a mi panel</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
    </div>
  )
}
