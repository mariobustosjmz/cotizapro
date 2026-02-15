'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Trash2, Save, FileDown, Send } from 'lucide-react'
import Link from 'next/link'

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Quote {
  id: string
  quote_number: string
  client_id: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  status: string
  subtotal: number
  tax: number
  total: number
  discount_rate: number
  notes: string | null
  terms: string | null
  valid_until: string
  created_at: string
  items: QuoteItem[]
}

export default function QuoteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    async function fetchQuote() {
      try {
        const response = await fetch(`/api/quotes/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setQuote(data.data)
        } else {
          setError('Cotización no encontrada')
        }
      } catch (err) {
        setError('Error al cargar cotización')
      }
    }

    fetchQuote()
  }, [params.id])

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar esta cotización? Esta acción no se puede deshacer.')) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar cotización')
      }

      router.push('/dashboard/quotes')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar cotización')
      setDeleting(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar estado')
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
      const response = await fetch(`/api/export/quote/${params.id}`)
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
    } catch (err) {
      setError('Error al exportar PDF')
    }
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/quotes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900">{quote.quote_number}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[quote.status as keyof typeof statusColors]}`}>
                {quote.status === 'draft' && 'Borrador'}
                {quote.status === 'sent' && 'Enviada'}
                {quote.status === 'accepted' && 'Aceptada'}
                {quote.status === 'rejected' && 'Rechazada'}
                {quote.status === 'expired' && 'Expirada'}
              </span>
            </div>
            <p className="text-gray-600">{quote.client_name}</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handleExportPDF}
            variant="outline"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>

          {quote.status === 'draft' && (
            <Button
              onClick={() => handleStatusChange('sent')}
              disabled={loading}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar
            </Button>
          )}

          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Client Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-sm text-gray-500">Nombre</Label>
              <p className="text-gray-900 font-medium">{quote.client_name}</p>
            </div>

            {quote.client_email && (
              <div>
                <Label className="text-sm text-gray-500">Email</Label>
                <p className="text-gray-900">{quote.client_email}</p>
              </div>
            )}

            {quote.client_phone && (
              <div>
                <Label className="text-sm text-gray-500">Teléfono</Label>
                <p className="text-gray-900">{quote.client_phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items de la Cotización</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Descripción</th>
                  <th className="text-right py-2 px-4">Cantidad</th>
                  <th className="text-right py-2 px-4">Precio Unitario</th>
                  <th className="text-right py-2 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, index) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-4">{item.description}</td>
                    <td className="text-right py-3 px-4">{item.quantity}</td>
                    <td className="text-right py-3 px-4">
                      ${item.unit_price.toLocaleString('es-MX')}
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      ${item.total.toLocaleString('es-MX')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-2 ml-auto max-w-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">${quote.subtotal.toLocaleString('es-MX')}</span>
            </div>

            {quote.discount_rate > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento ({quote.discount_rate}%):</span>
                <span>-${((quote.subtotal * quote.discount_rate) / 100).toLocaleString('es-MX')}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">IVA (16%):</span>
              <span className="font-semibold">${quote.tax.toLocaleString('es-MX')}</span>
            </div>

            <div className="flex justify-between pt-2 border-t">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-lg font-bold text-blue-600">
                ${quote.total.toLocaleString('es-MX')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {quote.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {quote.terms && (
          <Card>
            <CardHeader>
              <CardTitle>Términos y Condiciones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 whitespace-pre-wrap">{quote.terms}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Cotización</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-sm text-gray-500">Fecha de Creación</Label>
              <p className="text-gray-900">
                {new Date(quote.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div>
              <Label className="text-sm text-gray-500">Válida Hasta</Label>
              <p className="text-gray-900">
                {new Date(quote.valid_until).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div>
              <Label className="text-sm text-gray-500">Estado</Label>
              <div className="flex space-x-2 mt-1">
                {quote.status === 'sent' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange('accepted')}
                      disabled={loading}
                    >
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange('rejected')}
                      disabled={loading}
                    >
                      Rechazar
                    </Button>
                  </>
                )}
                {quote.status === 'draft' && (
                  <span className="text-gray-600">Pendiente de envío</span>
                )}
                {(quote.status === 'accepted' || quote.status === 'rejected') && (
                  <span className="text-gray-600">
                    {quote.status === 'accepted' ? 'Cotización aceptada' : 'Cotización rechazada'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
