import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus, Wrench, CheckCircle, Layers } from 'lucide-react'
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

  return (
    <div className="space-y-4">
      {/* Header + inline stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100">
            <Wrench className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Servicios</h2>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{services?.length || 0} total</span>
              <span className="text-green-600">{activeServices.length} activos</span>
              <span>{Object.keys(servicesByCategory).length} categorías</span>
            </div>
          </div>
        </div>
        <Link href="/dashboard/services/new">
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <ServiceFilters activeUnitType={unit_type} activeFilter={active} defaultSearch={q} />
      </div>

      {/* Services by Category */}
      {Object.keys(servicesByCategory).length > 0 ? (
        <div className="space-y-3">
          {(Object.entries(servicesByCategory) as [string, Service[]][]).map(([category, categoryServices]) => (
            <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50/60 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">{categoryLabels[category] || 'Otros'}</span>
                <span className="ml-2 text-xs text-gray-400">{categoryServices.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Servicio</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Descripción</th>
                      <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase">Precio</th>
                      <th className="text-center py-2 px-4 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Unidad</th>
                      <th className="text-center py-2 px-4 text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryServices.map((service) => (
                      <tr key={service.id} className="border-b border-gray-50 last:border-0 hover:bg-orange-50/40 cursor-pointer">
                        <td className="py-2 px-4 text-sm font-medium text-gray-900">{service.name}</td>
                        <td className="py-2 px-4 text-xs text-gray-500 max-w-xs truncate hidden md:table-cell">
                          {service.description || '-'}
                        </td>
                        <td className="text-right py-2 px-4 text-sm font-medium text-gray-900">
                          ${Number(service.unit_price).toLocaleString('es-MX')}
                        </td>
                        <td className="text-center py-2 px-4 text-xs text-gray-500 hidden sm:table-cell">
                          {unitTypeLabels[service.unit_type] || service.unit_type}
                        </td>
                        <td className="text-center py-2 px-4">
                          <Badge variant={service.is_active ? 'active' : 'inactive'} className="text-[10px]">
                            {service.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="text-right py-2 px-4">
                          <Link href={`/dashboard/services/${service.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                              Ver
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 py-10">
          <div className="text-center">
            <Wrench className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No tienes servicios registrados</p>
            <div className="mt-4">
              <Link href="/dashboard/services/new">
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="w-4 h-4 mr-1" />
                  Crear Primer Servicio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
