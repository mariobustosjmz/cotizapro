import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ServiceFilters } from './filters'

interface Service {
  id: string
  name: string
  description: string | null
  category: string
  unit_price: number
  unit_type: string
  is_active: boolean
  created_at: string
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_type?: string; active?: string; q?: string }>
}) {
  const { unit_type, active, q } = await searchParams

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

  let servicesQuery = supabase
    .from('service_catalog')
    .select('id, name, description, category, unit_price, unit_type, is_active, created_at')
    .eq('organization_id', profile.organization_id)
    .order('category', { ascending: true })
    .order('name', { ascending: true })
    .limit(100)

  if (unit_type) {
    servicesQuery = servicesQuery.eq('unit_type', unit_type)
  }
  if (active !== undefined && active !== '') {
    servicesQuery = servicesQuery.eq('is_active', active === 'true')
  }
  if (q) {
    servicesQuery = servicesQuery.ilike('name', `%${q}%`)
  }

  const { data: services } = await servicesQuery

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

  const unitTypeLabels: Record<string, string> = {
    fixed: 'Fijo',
    per_hour: 'Por Hora',
    per_sqm: 'Por m²',
    per_unit: 'Por Unidad',
  }

  const activeServices = services?.filter(s => s.is_active) || []
  const inactiveServices = services?.filter(s => !s.is_active) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Servicios · {services?.length || 0}</h2>
          <p className="text-gray-600">Gestiona tu catálogo de servicios</p>
        </div>
        <Link href="/dashboard/services/new">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
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
            <p className="text-3xl font-bold text-orange-600">{Object.keys(servicesByCategory).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <ServiceFilters activeUnitType={unit_type} activeFilter={active} defaultSearch={q} />
        </CardContent>
      </Card>

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
                            ${Number(service.unit_price).toLocaleString('es-MX')}
                          </td>
                          <td className="text-center py-3 px-4 text-gray-600">
                            {unitTypeLabels[service.unit_type] || service.unit_type}
                          </td>
                          <td className="text-center py-3 px-4">
                            <Badge variant={service.is_active ? 'active' : 'inactive'}>
                              {service.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
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
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
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
