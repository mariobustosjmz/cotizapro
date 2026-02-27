'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trash2, FileDown, Send, Calendar, Plus } from 'lucide-react'
import Link from 'next/link'
import { PaymentSection } from '@/components/dashboard/payment-section'
import { QuoteShareDialog } from '@/components/dashboard/quote-share-dialog'

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  company_name: string | null
}

interface Quote {
  id: string
  quote_number: string
  client_id: string
  client: Client | null
  status: string
  subtotal: number
  tax_amount: number
  tax_rate: number
  discount_rate: number
  discount_amount: number
  total: number
  notes: string | null
  terms_and_conditions: string | null
  valid_until: string
  created_at: string
  items: QuoteItem[]
}

interface WorkEvent {
  id: string
  title: string
  event_type: string
  scheduled_start: string
  status: string
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  en_instalacion: 'En Instalacion',
  completado: 'Completado',
  cobrado: 'Cobrado',
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-yellow-100 text-yellow-700',
  en_instalacion: 'bg-orange-100 text-orange-800',
  completado: 'bg-teal-100 text-teal-800',
  cobrado: 'bg-emerald-100 text-emerald-800',
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [workEvents, setWorkEvents] = useState<WorkEvent[]>([])
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    async function fetchQuote() {
      try {
        const response = await fetch(`/api/quotes/${id}`)
        if (response.ok) {
          const data = await response.json()
          setQuote(data.data)
        } else {
          setError('Cotizacion no encontrada')
        }
      } catch {
        setError('Error al cargar cotizacion')
      }
    }

    fetchQuote()
  }, [id])

  useEffect(() => {
    async function fetchWorkEvents() {
      try {
        const response = await fetch(`/api/calendar/events?quote_id=${id}`)
        if (response.ok) {
          const data = await response.json()
          setWorkEvents(data.data || [])
        }
      } catch {
        // non-critical
      }
    }

    fetchWorkEvents()
  }, [id])

  async function handleDelete() {
    if (!confirm('Estas seguro de eliminar esta cotizacion? Esta accion no se puede deshacer.')) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar cotizacion')
      }
      router.push('/dashboard/quotes')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar cotizacion')
      setDeleting(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar estado')
      }

      const updated = await response.json()
      setQuote(updated.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportPDF() {
    try {
      const response = await fetch(`/api/export/quote/${id}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cotizacion-${quote?.quote_number}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch {
      setError('Error al exportar PDF')
    }
  }

  function handleRefreshQuote() {
    fetch(`/api/quotes/${id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.data) setQuote(data.data) })
      .catch(() => {})
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400 text-sm">{error || 'Cargando...'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/quotes">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{quote.quote_number}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[quote.status]}`}>
                {statusLabels[quote.status] || quote.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{quote.client?.name || '\u2014'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <FileDown className="w-3.5 h-3.5 mr-1" />
            PDF
          </Button>
          <Button onClick={() => setShareOpen(true)} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
            <Send className="w-3.5 h-3.5 mr-1" />
            Enviar
          </Button>
          <Button onClick={handleDelete} variant="destructive" size="sm" disabled={deleting}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {deleting ? '...' : 'Eliminar'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">{error}</div>
      )}

      {/* Client Info */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Cliente</span>
        </div>
        <div className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{quote.client?.name || '\u2014'}</p>
            </div>
            {quote.client?.email && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm text-gray-900 dark:text-white">{quote.client.email}</p>
              </div>
            )}
            {quote.client?.phone && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Telefono</p>
                <p className="text-sm text-gray-900 dark:text-white">{quote.client.phone}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Items de la Cotizacion</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">Descripcion</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">Cant.</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">Precio</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {quote.items.map((item) => (
                <tr key={item.id} className="hover:bg-orange-50/40 dark:hover:bg-orange-900/10">
                  <td className="py-2.5 px-4 text-gray-900 dark:text-white">{item.description}</td>
                  <td className="text-right py-2.5 px-4 text-gray-600 dark:text-gray-300">{item.quantity}</td>
                  <td className="text-right py-2.5 px-4 text-gray-600 dark:text-gray-300">
                    ${Number(item.unit_price).toLocaleString('es-MX')}
                  </td>
                  <td className="text-right py-2.5 px-4 font-medium text-gray-900 dark:text-white">
                    ${Number(item.subtotal).toLocaleString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <div className="space-y-1 ml-auto max-w-xs text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
              <span className="font-medium dark:text-white">${Number(quote.subtotal).toLocaleString('es-MX')}</span>
            </div>
            {Number(quote.discount_rate) > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Descuento ({Number(quote.discount_rate)}%):</span>
                <span>-${((Number(quote.subtotal) * Number(quote.discount_rate)) / 100).toLocaleString('es-MX')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">IVA ({Number(quote.tax_rate) || 16}%):</span>
              <span className="font-medium dark:text-white">${Number(quote.tax_amount).toLocaleString('es-MX')}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">Total:</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">
                ${Number(quote.total).toLocaleString('es-MX')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments */}
      <PaymentSection quoteId={quote.id} quoteTotal={quote.total} />

      {/* Work Events */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            Eventos de Trabajo
          </span>
          <Link href={`/dashboard/calendar/new?client_id=${quote.client_id}&quote_id=${quote.id}`}>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Crear
            </Button>
          </Link>
        </div>
        <div className="p-4">
          {workEvents.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">No hay eventos vinculados a esta cotizacion.</p>
          ) : (
            <div className="space-y-2">
              {workEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-2.5 border border-gray-100 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(event.scheduled_start).toLocaleDateString('es-MX', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' \u2022 '}
                      {event.event_type}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    event.status === 'completado' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    event.status === 'cancelado' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                    event.status === 'en_camino' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  }`}>
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes & Terms */}
      {(quote.notes || quote.terms_and_conditions) && (
        <div className="grid gap-3 md:grid-cols-2">
          {quote.notes && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Notas</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{quote.notes}</p>
              </div>
            </div>
          )}
          {quote.terms_and_conditions && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Terminos y Condiciones</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{quote.terms_and_conditions}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metadata & Status Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Informacion</span>
        </div>
        <div className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Creada</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(quote.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Valida Hasta</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(quote.valid_until).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Acciones</p>
              <div className="flex flex-wrap gap-1.5">
                {quote.status === 'sent' && (
                  <>
                    <Button size="sm" onClick={() => handleStatusChange('accepted')} disabled={loading} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white">
                      Aceptar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange('rejected')} disabled={loading} className="h-7 text-xs">
                      Rechazar
                    </Button>
                  </>
                )}
                {quote.status === 'draft' && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">Pendiente de envio</span>
                )}
                {quote.status === 'accepted' && (
                  <Button size="sm" onClick={() => handleStatusChange('en_instalacion')} disabled={loading} className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white">
                    Iniciar Instalacion
                  </Button>
                )}
                {quote.status === 'en_instalacion' && (
                  <Button size="sm" onClick={() => handleStatusChange('completado')} disabled={loading} className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white">
                    Marcar Completado
                  </Button>
                )}
                {quote.status === 'completado' && (
                  <Button size="sm" onClick={() => handleStatusChange('cobrado')} disabled={loading} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                    Marcar Cobrado
                  </Button>
                )}
                {quote.status === 'rejected' && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">Cotizacion rechazada</span>
                )}
                {quote.status === 'cobrado' && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">Cotizacion cobrada</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="h-16 lg:hidden" />

      {/* Mobile Sticky Send Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex gap-2">
          <Button
            onClick={() => setShareOpen(true)}
            size="sm"
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            Enviar
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm" className="flex-1">
            <FileDown className="w-3.5 h-3.5 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Share Dialog */}
      <QuoteShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        quoteId={quote.id}
        quoteNumber={quote.quote_number}
        clientName={quote.client?.name || 'Sin cliente'}
        clientEmail={quote.client?.email || null}
        clientPhone={quote.client?.phone || null}
        onSent={handleRefreshQuote}
      />
    </div>
  )
}
