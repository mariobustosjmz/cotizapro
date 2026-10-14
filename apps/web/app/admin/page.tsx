import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { listAdminOrganizations } from '@/lib/admin/organizations'
import { ADMIN_PAGE_SIZE, listOrganizationsQuerySchema } from '@/lib/admin/schemas'
import { OrganizationsTable } from '@/components/admin/organizations-table'

export const metadata: Metadata = {
  title: 'Plataforma - CotizaPro',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

interface AdminPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

function pageHref(q: string, page: number): string {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `/admin?${query}` : '/admin'
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createServerClient()

  const parsed = listOrganizationsQuerySchema.safeParse(await searchParams)
  const { q, page } = parsed.success ? parsed.data : { q: '', page: 1 }
  const result = await listAdminOrganizations(supabase, { q, page })
  const lastPage = result.ok ? Math.max(1, Math.ceil(result.total / ADMIN_PAGE_SIZE)) : 1

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Empresas</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Activa, renueva o suspende planes pagados con Mercado Pago.</p>
      </div>
      <form action="/admin" method="get" role="search" className="flex gap-2">
        <label htmlFor="admin-search" className="sr-only">Buscar empresa</label>
        <input id="admin-search" name="q" defaultValue={q} placeholder="Buscar por nombre o slug"
          className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
        <button type="submit" className="h-10 rounded-md bg-orange-500 px-4 text-sm font-medium text-white hover:bg-orange-600">Buscar</button>
      </form>
      {result.ok
        ? <OrganizationsTable rows={result.rows} now={new Date()} />
        : <p role="alert" className="text-sm text-red-600">No se pudo cargar la lista de empresas.</p>}
      <nav aria-label="Paginación" className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        {page > 1 ? <Link href={pageHref(q, page - 1)}>Anterior</Link> : <span />}
        <span>Página {page} de {lastPage}</span>
        {page < lastPage ? <Link href={pageHref(q, page + 1)}>Siguiente</Link> : <span />}
      </nav>
    </div>
  )
}
