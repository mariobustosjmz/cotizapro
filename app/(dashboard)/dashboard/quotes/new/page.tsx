'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface QuoteItem {
  description: string
  quantity: number
  unit_price: number
  unit_type: 'fixed' | 'per_hour' | 'per_sqm' | 'per_unit'
  service_id: string | null
}

interface Client {
  id: string
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
}

interface Service {
  id: string
  name: string
  description: string | null
  default_price: number
  unit_type: string
}

export default function NewQuotePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [items, setItems] = useState<QuoteItem[]>([
    { description: '', quantity: 1, unit_price: 0, unit_type: 'per_unit', service_id: null }
  ])

  useEffect(() => {
    async function fetchData() {
      try {
        const [clientsRes, servicesRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/services')
        ])

        if (clientsRes.ok) {
          const data = await clientsRes.json()
          setClients(data.clients || [])
        }

        if (servicesRes.ok) {
          const data = await servicesRes.json()
          setServices(data.data || [])
        }
      } catch (err) {
        console.error('Error loading data:', err)
      }
    }

    fetchData()
  }, [])

  function addItem() {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, unit_type: 'per_unit', service_id: null }])
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  function updateItem(index: number, field: keyof QuoteItem, value: string | number) {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  function selectService(index: number, serviceId: string) {
    const service = services.find(s => s.id === serviceId)
    if (service) {
      const newItems = [...items]
      newItems[index] = {
        ...newItems[index],
        service_id: serviceId,
        description: service.name,
        unit_price: service.default_price,
        unit_type: service.unit_type as 'fixed' | 'per_hour' | 'per_sqm' | 'per_unit'
      }
      setItems(newItems)
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const discountRate = 0
  const discount = subtotal * (discountRate / 100)
  const taxableAmount = subtotal - discount
  const tax = taxableAmount * 0.16
  const total = taxableAmount + tax

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const clientId = formData.get('client_id') as string

    if (!clientId) {
      setError('Selecciona un cliente')
      setLoading(false)
      return
    }

    const selectedClient = clients.find(c => c.id === clientId)
    if (!selectedClient) {
      setError('Cliente no encontrado')
      setLoading(false)
      return
    }

    const validUntilDays = parseInt(formData.get('valid_until_days') as string) || 30
    const validUntilDate = new Date()
    validUntilDate.setDate(validUntilDate.getDate() + validUntilDays)

    const data = {
      client_id: clientId,
      items: items.filter(item => item.description && item.quantity > 0),
      notes: formData.get('notes') || null,
      terms_and_conditions: formData.get('terms') || null,
      valid_until: validUntilDate.toISOString(),
      discount_rate: discountRate,
    }

    if (data.items.length === 0) {
      setError('Agrega al menos un item a la cotización')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear cotización')
      }

      router.push('/dashboard/quotes')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cotización')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/quotes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nueva Cotización</h2>
          <p className="text-gray-600">Crea una cotización profesional en minutos</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Client Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="client_id">Selecciona un Cliente *</Label>
              <select
                id="client_id"
                name="client_id"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona un cliente...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.company_name ? `(${client.company_name})` : ''}
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="text-sm text-gray-500">
                  No hay clientes. <Link href="/dashboard/clients/new" className="text-blue-600 hover:underline">Crear cliente</Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Items de la Cotización</CardTitle>
              <Button type="button" onClick={addItem} size="sm" variant="outline" data-testid="add-quote-item-btn">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Item #{index + 1}</h4>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeItem(index)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Service Selection */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Servicio (Opcional)</Label>
                    <select
                      value={item.service_id || ''}
                      onChange={(e) => selectService(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecciona un servicio...</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} - ${service.default_price.toLocaleString('es-MX')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Descripción *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      required
                      placeholder="Instalación de minisplit 12000 BTU"
                      data-testid={`item-description-${index}`}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label>Cantidad *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      required
                      data-testid={`item-quantity-${index}`}
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="space-y-2">
                    <Label>Precio Unitario *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      required
                      data-testid={`item-unit-price-${index}`}
                    />
                  </div>
                </div>

                {/* Item Total */}
                <div className="text-right">
                  <span className="text-sm text-gray-500">Subtotal: </span>
                  <span className="font-semibold">${(item.quantity * item.unit_price).toLocaleString('es-MX')}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Totals Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">${subtotal.toLocaleString('es-MX')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">IVA (16%):</span>
              <span className="font-semibold">${tax.toLocaleString('es-MX')}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-lg font-bold text-blue-600" data-testid="quote-total">${total.toLocaleString('es-MX')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Valid Until */}
            <div className="space-y-2">
              <Label htmlFor="valid_until_days">Válida por (días)</Label>
              <Input
                id="valid_until_days"
                name="valid_until_days"
                type="number"
                min="1"
                defaultValue="30"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Información adicional para el cliente..."
              />
            </div>

            {/* Terms */}
            <div className="space-y-2">
              <Label htmlFor="terms">Términos y Condiciones</Label>
              <Textarea
                id="terms"
                name="terms"
                rows={3}
                placeholder="50% anticipo, 50% al terminar. Garantía de 1 año..."
                defaultValue="50% de anticipo al aceptar la cotización. 50% restante al completar el trabajo. Garantía de 1 año en mano de obra."
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link href="/dashboard/quotes" data-testid="cancel-quote-btn">
            <Button type="button" variant="outline" disabled={loading}>
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading} data-testid="submit-quote-btn">
            {loading ? 'Creando...' : 'Crear Cotización'}
          </Button>
        </div>
      </form>
    </div>
  )
}
