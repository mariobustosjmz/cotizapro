'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trash2, FileDown, Send, MessageCircle, Mail, Calendar, Plus } from 'lucide-react'
import Link from 'next/link'
import { PaymentSection } from '@/components/dashboard/payment-section'

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

  function handleSendWhatsApp() {
    if (!quote?.client?.phone) {
      setError('No hay numero de telefono disponible para este cliente')
      return
    }
    const phoneNumber = quote.client.phone.replace(/\D/g, '')
    const message = encodeURIComponent(
      `Hola ${quote.client.name}, te envio la cotizacion #${quote.quote_number}. Valida hasta: ${new Date(quote.valid_until).toLocaleDateString('es-MX')}`
    )
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank')
  }

  function handleSendEmail() {
    if (!quote?.client?.email) {
      setError('No hay email disponible para este cliente')
      return
    }
    const subject = encodeURIComponent(`Cotizacion #${quote.quote_number}`)
    const body = encodeURIComponent(
      `Hola ${quote.client.name},\n\nTe envio la cotizacion #${quote.quote_number}.\n\nValor Total: $${Number(quote.total).toLocaleString('es-MX')}\nValida hasta: ${new Date(quote.valid_until).toLocaleDateString('es-MX')}\n\nQuedo atento a tus comentarios.`
    )
    window.location.href = `mailto:${quote.client.email}?subject=${subject}&body=${body}`
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">{error || 'Cargando...'}</p>
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
              <h2 className="text-xl font-bold text-gray-900">{quote.quote_number}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[quote.status]}`}>
                {statusLabels[quote.status] || quote.status}
              </span>
            </div>
            <p className="text-xs text-gray-500">{quote.client?.name || '\u2014'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <FileDown className="w-3.5 h-3.5 mr-1" />
            PDF
          </Button>
          {quote.status === 'draft' && (
            <Button onClick={() => handleStatusChange('sent')} size="sm" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              <Send className="w-3.5 h-3.5 mr-1" />
              Enviar
            </Button>
          )}
          <Button onClick={handleDelete} variant="destructive" size="sm" disabled={deleting}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {deleting ? '...' : 'Eliminar'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
      )}

      {/* Client Info */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Cliente</span>
        </div>
        <div className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Nombre</p>
              <p className="text-sm font-medium text-gray-900">{quote.client?.name || '\u2014'}</p>
            </div>
            {quote.client?.email && (
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{quote.client.email}</p>
              </div>
            )}
            {quote.client?.phone && (
              <div>
                <p className="text-xs text-gray-500">Telefono</p>
                <p className="text-sm text-gray-900">{quote.client.phone}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Items de la Cotizacion</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Descripcion</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">Cant.</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">Precio</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quote.items.map((item) => (
                <tr key={item.id} className="hover:bg-orange-50/40">
                  <td className="py-2.5 px-4 text-gray-900">{item.description}</td>
                  <td className="text-right py-2.5 px-4 text-gray-600">{item.quantity}</td>
                  <td className="text-right py-2.5 px-4 text-gray-600">
                    ${Number(item.unit_price).toLocaleString('es-MX')}
                  </td>
                  <td className="text-right py-2.5 px-4 font-medium text-gray-900">
                    ${Number(item.subtotal).toLocaleString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <div className="space-y-1 ml-auto max-w-xs text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-medium">${Number(quote.subtotal).toLocaleString('es-MX')}</span>
            </div>
            {Number(quote.discount_rate) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento ({Number(quote.discount_rate)}%):</span>
                <span>-${((Number(quote.subtotal) * Number(quote.discount_rate)) / 100).toLocaleString('es-MX')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">IVA ({Number(quote.tax_rate) || 16}%):</span>
              <span className="font-medium">${Number(quote.tax_amount).toLocaleString('es-MX')}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="font-bold text-orange-600">
                ${Number(quote.total).toLocaleString('es-MX')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments */}
      <PaymentSection quoteId={quote.id} quoteTotal={quote.total} />

      {/* Work Events */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-400" />
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
            <p className="text-xs text-gray-500">No hay eventos vinculados a esta cotizacion.</p>
          ) : (
            <div className="space-y-2">
              {workEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">
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
                    event.status === 'completado' ? 'bg-green-100 text-green-700' :
                    event.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                    event.status === 'en_camino' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
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
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">Notas</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            </div>
          )}
          {quote.terms_and_conditions && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">Terminos y Condiciones</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{quote.terms_and_conditions}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metadata & Status Actions */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Informacion</span>
        </div>
        <div className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Creada</p>
              <p className="text-sm text-gray-900">
                {new Date(quote.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Valida Hasta</p>
              <p className="text-sm text-gray-900">
                {new Date(quote.valid_until).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Acciones</p>
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
                  <span className="text-xs text-gray-500">Pendiente de envio</span>
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
                  <span className="text-xs text-gray-500">Cotizacion rechazada</span>
                )}
                {quote.status === 'cobrado' && (
                  <span className="text-xs text-gray-500">Cotizacion cobrada</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="h-16 lg:hidden" />

      {/* Mobile Sticky Send Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-30 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex gap-2">
          {quote.status === 'draft' && (
            <>
              <Button
                onClick={handleSendWhatsApp}
                disabled={loading || !quote.client?.phone}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
                WhatsApp
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={loading || !quote.client?.email}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Mail className="w-3.5 h-3.5 mr-1" />
                Email
              </Button>
            </>
          )}
          {quote.status !== 'draft' && (
            <Button onClick={handleExportPDF} variant="outline" size="sm" className="flex-1">
              <FileDown className="w-3.5 h-3.5 mr-1" />
              Descargar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
