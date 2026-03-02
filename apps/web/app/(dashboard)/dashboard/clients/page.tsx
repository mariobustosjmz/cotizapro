import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Users, Plus } from 'lucide-react'
import { ClientsListContent } from '@/components/dashboard/clients-list-content'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex-shrink-0">
            <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Clientes</h2>
            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Gestiona tu cartera de clientes</p>
          </div>
        </div>
        <Link href="/dashboard/clients/new" className="w-full sm:w-auto">
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        </Link>
      </div>

      {/* List with Pagination */}
      <ClientsListContent initialSearch={q} />
    </div>
  )
}
