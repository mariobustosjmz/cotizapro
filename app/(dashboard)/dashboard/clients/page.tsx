import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Users, Plus, Phone, Mail } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes · {clients?.length || 0}</h2>
          <p className="text-gray-600">
            Gestiona tu cartera de clientes
          </p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lista de Clientes</CardTitle>
          <ClientSearchInput defaultValue={q} />
        </CardHeader>
        <CardContent>
          {!clients || clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {q ? `Sin resultados para "${q}"` : 'No hay clientes'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {q ? 'Intenta con otro término de búsqueda' : 'Comienza agregando tu primer cliente'}
              </p>
              {!q && (
                <div className="mt-6">
                  <Link href="/dashboard/clients/new">
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Cliente
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dirección
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Etiquetas
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {client.name}
                        </div>
                        {client.company_name && (
                          <div className="text-sm text-gray-500">
                            {client.company_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          {client.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-1" />
                              {client.phone}
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-1" />
                              {client.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {client.address || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {client.tags && client.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {client.tags.slice(0, 3).map((tag: string, idx: number) => (
                              <Badge key={idx} className="bg-orange-100 text-orange-800">{tag}</Badge>
                            ))}
                            {client.tags.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{client.tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          Ver detalles
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
