import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface Service {
  id: string
  name: string
  description: string | null
  category: string
  default_price: number
  unit_type: string
  is_active: boolean
  created_at: string
}

export default async function ServicesPage() {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('category', { ascending: true })
    .order('name', { ascending: true })
    .limit(100)

  const servicesByCategory = (services || []).reduce((acc, service) => {
    const category = service.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  const categoryLabels: Record<string, string> = {
    hvac: 'HVAC',
    painting: 'Pintura',
    plumbing: 'Plomería',
    electrical: 'Eléctrico',
    other: 'Otros'
  }

  const activeServices = services?.filter(s => s.is_active) || []
  const inactiveServices = services?.filter(s => !s.is_active) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Servicios</h2>
          <p className="text-gray-600">Gestiona tu catálogo de servicios</p>
        </div>
        <Link href="/dashboard/services/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Servicio
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Servicios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{services?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Servicios Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeServices.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Categorías
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{Object.keys(servicesByCategory).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Services by Category */}
      {Object.keys(servicesByCategory).length > 0 ? (
        <div className="space-y-6">
          {(Object.entries(servicesByCategory) as [string, Service[]][]).map(([category, categoryServices]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{categoryLabels[category] || 'Otros'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Servicio</th>
                        <th className="text-left py-2 px-4">Descripción</th>
                        <th className="text-right py-2 px-4">Precio Base</th>
                        <th className="text-center py-2 px-4">Unidad</th>
                        <th className="text-center py-2 px-4">Estado</th>
                        <th className="text-right py-2 px-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryServices.map((service) => (
                        <tr key={service.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{service.name}</td>
                          <td className="py-3 px-4 text-gray-600 max-w-md truncate">
                            {service.description || '-'}
                          </td>
                          <td className="text-right py-3 px-4">
                            ${service.default_price.toLocaleString('es-MX')}
                          </td>
                          <td className="text-center py-3 px-4 text-gray-600">
                            {service.unit_type}
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              service.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {service.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="text-right py-3 px-4">
                            <Link href={`/dashboard/services/${service.id}`}>
                              <Button variant="outline" size="sm">
                                Ver
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No tienes servicios registrados</p>
              <Link href="/dashboard/services/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Servicio
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
