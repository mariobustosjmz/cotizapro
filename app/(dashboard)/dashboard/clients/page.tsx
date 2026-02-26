import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Users, Plus, Phone, Mail, Search } from 'lucide-react'
import { ClientSearchInput } from './search-input'
import { Badge } from '@/components/ui/badge'

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

  let query = supabase
    .from('clients')
    .select('id, name, company_name, email, phone, address, tags, created_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (q) {
    query = query.or(`name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data: clients } = await query

  return (
    <div className="space-y-4">
      {/* Header + Stats inline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100">
            <Users className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Clientes</h2>
            <p className="text-sm text-gray-500">{clients?.length || 0} registrados</p>
          </div>
        </div>
        <Link href="/dashboard/clients/new">
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Search + Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Lista de Clientes</span>
          <ClientSearchInput defaultValue={q} />
        </div>

        {!clients || clients.length === 0 ? (
          <div className="text-center py-10">
            <Users className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {q ? `Sin resultados para "${q}"` : 'No hay clientes'}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {q ? 'Intenta con otro término' : 'Comienza agregando tu primer cliente'}
            </p>
            {!q && (
              <div className="mt-4">
                <Link href="/dashboard/clients/new">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="w-4 h-4 mr-1" />
                    Nuevo Cliente
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/60">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Nombre
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                    Contacto
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                    Dirección
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                    Etiquetas
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-orange-50/40 cursor-pointer group">
                    <td className="px-4 py-2.5">
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      {client.company_name && (
                        <div className="text-xs text-gray-500">{client.company_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        {client.phone && (
                          <div className="flex items-center text-xs text-gray-600">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" />
                            {client.phone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center text-xs text-gray-600">
                            <Mail className="w-3 h-3 mr-1 text-gray-400" />
                            {client.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <div className="text-xs text-gray-600 max-w-xs truncate">
                        {client.address || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      {client.tags && client.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {client.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <Badge key={idx} className="bg-orange-100 text-orange-800 text-[10px] px-1.5 py-0">{tag}</Badge>
                          ))}
                          {client.tags.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{client.tags.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
