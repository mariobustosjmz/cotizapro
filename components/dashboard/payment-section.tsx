'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, FileDown } from 'lucide-react'
import type { QuotePayment, PaymentType, PaymentMethod } from '@/lib/validations/cotizapro'

interface PaymentSectionProps {
  quoteId: string
  quoteTotal: number
}

const paymentTypeLabels: Record<PaymentType, string> = {
  anticipo: 'Anticipo',
  parcial: 'Parcial',
  liquidacion: 'Liquidación',
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  otro: 'Otro',
}

export function PaymentSection({ quoteId, quoteTotal }: PaymentSectionProps) {
  const [payments, setPayments] = useState<QuotePayment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    amount: '',
    payment_type: 'anticipo' as PaymentType,
    payment_method: 'efectivo' as PaymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    fetchPayments()
  }, [quoteId])

  async function fetchPayments() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/quotes/${quoteId}/payments`)
      if (response.ok) {
        const data = await response.json()
        setPayments(data.data || [])
      } else {
        setError('No se pudieron cargar los pagos')
      }
    } catch (err) {
      setError('Error al cargar los pagos')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const payload = {
        amount: Number(formData.amount),
        payment_type: formData.payment_type,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        notes: formData.notes || null,
      }

      const response = await fetch(`/api/quotes/${quoteId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al registrar pago')
      }

      await fetchPayments()
      setShowModal(false)
      setFormData({
        amount: '',
        payment_type: 'anticipo',
        payment_method: 'efectivo',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm('¿Estás seguro de eliminar este pago?')) {
      return
    }

    setDeleting(paymentId)
    setError('')

    try {
      const response = await fetch(`/api/quotes/${quoteId}/payments/${paymentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar pago')
      }

      await fetchPayments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar pago')
    } finally {
      setDeleting(null)
    }
  }

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const percentagePaid = (totalPaid / quoteTotal) * 100
  const isFullyPaid = totalPaid >= quoteTotal

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Pagado</span>
            <span className="font-semibold">
              ${Number(totalPaid).toLocaleString('es-MX')} / ${Number(quoteTotal).toLocaleString('es-MX')}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isFullyPaid ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(percentagePaid, 100)}%` }}
            />
          </div>
          <div className="text-sm text-gray-500">
            {isFullyPaid ? '100% pagado' : `${percentagePaid.toFixed(1)}% pagado`}
          </div>
        </div>

        {/* Full Payment Prompt */}
        {isFullyPaid && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            <p className="font-medium">Cotización pagada completamente</p>
            <p className="text-sm mt-1">Considera cambiar el estado a "Cobrado" cuando el cliente confirme el pago.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Add Payment Button */}
        <Button onClick={() => setShowModal(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Registrar Pago
        </Button>

        {/* Payments Table */}
        {payments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Fecha</th>
                  <th className="text-left py-2 px-3">Tipo</th>
                  <th className="text-left py-2 px-3">Método</th>
                  <th className="text-right py-2 px-3">Monto</th>
                  <th className="text-left py-2 px-3">Recibido por</th>
                  <th className="text-center py-2 px-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3">
                      {new Date(payment.payment_date).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-3 px-3">
                      {paymentTypeLabels[payment.payment_type]}
                    </td>
                    <td className="py-3 px-3">
                      {paymentMethodLabels[payment.payment_method]}
                    </td>
                    <td className="text-right py-3 px-3 font-semibold">
                      ${Number(payment.amount).toLocaleString('es-MX')}
                    </td>
                    <td className="py-3 px-3 text-gray-600">—</td>
                    <td className="text-center py-3 px-3">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          title="No disponible aún"
                        >
                          <FileDown className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeletePayment(payment.id)}
                          disabled={deleting === payment.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && payments.length === 0 && (
          <p className="text-center text-gray-500 py-8">No hay pagos registrados</p>
        )}

        {loading && (
          <p className="text-center text-gray-500 py-8">Cargando...</p>
        )}
      </CardContent>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Registrar Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount */}
                <div>
                  <Label htmlFor="amount">Monto *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                    className="mt-1"
                  />
                </div>

                {/* Payment Type */}
                <div>
                  <Label htmlFor="payment_type">Tipo de Pago *</Label>
                  <select
                    id="payment_type"
                    value={formData.payment_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_type: e.target.value as PaymentType,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="anticipo">Anticipo</option>
                    <option value="parcial">Parcial</option>
                    <option value="liquidacion">Liquidación</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <Label htmlFor="payment_method">Método de Pago *</Label>
                  <select
                    id="payment_method"
                    value={formData.payment_method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_method: e.target.value as PaymentMethod,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <Label htmlFor="payment_date">Fecha *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_date: e.target.value })
                    }
                    required
                    className="mt-1"
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notas adicionales..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Guardando...' : 'Registrar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  )
}
