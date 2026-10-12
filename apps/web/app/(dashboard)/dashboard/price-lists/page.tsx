import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Tags } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { PriceListsEditor } from '@/components/price-lists/price-lists-editor'

const EDITOR_ROLES: readonly string[] = ['owner', 'admin']

export default async function PriceListsPage() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex-shrink-0">
            <Tags className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Listas de precios</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Precios que usan tus servicios configurables</p>
          </div>
        </div>
        <Link href="/dashboard/services" className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          Volver a servicios
        </Link>
      </div>
      <PriceListsEditor canEdit={EDITOR_ROLES.includes(String(profile.role))} />
    </div>
  )
}
