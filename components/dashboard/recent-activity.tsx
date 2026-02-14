import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface RecentActivityProps {
  organizationId: string
}

export async function RecentActivity({ organizationId }: RecentActivityProps) {
  const supabase = await createServerClient()

  // Fetch recent quotes
  const { data: recentQuotes } = await supabase
    .from('quotes')
    .select('id, quote_number, client_name, total, status, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!recentQuotes || recentQuotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No hay actividad reciente</p>
            <Link
              href="/dashboard/quotes/new"
              className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
            >
              Crear tu primera cotización
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentQuotes.map((quote) => (
            <Link
              key={quote.id}
              href={`/dashboard/quotes/${quote.id}`}
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  Cotización #{quote.quote_number}
                </p>
                <p className="text-sm text-gray-500">{quote.client_name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  ${quote.total.toLocaleString('es-MX')}
                </p>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    quote.status === 'accepted'
                      ? 'bg-green-100 text-green-800'
                      : quote.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : quote.status === 'sent'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {quote.status === 'draft' && 'Borrador'}
                  {quote.status === 'sent' && 'Enviada'}
                  {quote.status === 'viewed' && 'Vista'}
                  {quote.status === 'accepted' && 'Aceptada'}
                  {quote.status === 'rejected' && 'Rechazada'}
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Link
            href="/dashboard/quotes"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Ver todas las cotizaciones →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
