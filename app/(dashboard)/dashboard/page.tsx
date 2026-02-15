import { createServerClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createServerClient()

  // Fetch dashboard data
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(name)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido a CotizaPro
          </h1>
          <p className="text-lg text-gray-600">
            {profile.full_name || user.email}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Organizacion: {profile.organizations?.name}
          </p>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Comienza a usar CotizaPro
          </h2>

          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-medium text-gray-900">1. Configura tu perfil</h3>
              <p className="text-sm text-gray-600">
                Personaliza tu informacion y preferencias
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-medium text-gray-900">2. Agrega clientes</h3>
              <p className="text-sm text-gray-600">
                Gestiona tu base de clientes y contactos
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-medium text-gray-900">3. Crea cotizaciones</h3>
              <p className="text-sm text-gray-600">
                Genera cotizaciones profesionales en minutos
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-medium text-gray-900">4. Haz seguimiento</h3>
              <p className="text-sm text-gray-600">
                Configura recordatorios automaticos para tus clientes
              </p>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Sistema configurado correctamente
              </p>
              <p className="text-xs text-green-700 mt-1">
                Autenticacion activa • Base de datos conectada • Multi-tenancy habilitado
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
