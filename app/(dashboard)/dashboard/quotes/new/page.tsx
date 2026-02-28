'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, Trash2, ChevronDown, FileText, Zap, User, LayoutTemplate, Percent, Calendar, Hash } from 'lucide-react'
import Link from 'next/link'
import { DynamicFieldsSection } from '@/components/forms/DynamicFieldsSection'
import type { CustomFieldValues } from '@/types/custom-fields'

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
  unit_price: number
  unit_type: string
}

interface TemplateItem {
  description: string
  quantity: number
  unit_price: number
  unit_type: 'fixed' | 'per_hour' | 'per_sqm' | 'per_unit'
  service_id?: string | null
}

interface QuoteTemplate {
  id: string
  name: string
  description: string | null
  default_items: TemplateItem[] | null
  default_terms: string | null
  default_discount_rate: string | null
  promotional_label: string | null
}

const UNIT_TYPE_LABELS: Record<string, string> = {
  fixed: 'Fijo',
  per_hour: 'Por Hora',
  per_sqm: 'Por m\u00B2',
  per_unit: 'Por Unidad',
}

export default function NewQuotePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [items, setItems] = useState<QuoteItem[]>([
    { description: '', quantity: 1, unit_price: 0, unit_type: 'per_unit', service_id: null }
  ])
  const [discountRate, setDiscountRate] = useState(0)
  const [customFields, setCustomFields] = useState<CustomFieldValues>({})
  const [validDays, setValidDays] = useState(30)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('50% de anticipo al aceptar la cotizaci\u00F3n. 50% restante al completar el trabajo. Garant\u00EDa de 1 a\u00F1o en mano de obra.')
  const [showExtras, setShowExtras] = useState(false)
  const itemsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [clientsRes, servicesRes, templatesRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/services'),
          fetch('/api/templates'),
        ])

        if (clientsRes.ok) {
          const data = await clientsRes.json()
          setClients(data.clients || [])
        }

        if (servicesRes.ok) {
          const data = await servicesRes.json()
          setServices(data.data || [])
        }

        if (templatesRes.ok) {
          const data = await templatesRes.json()
          setTemplates(data.data || [])
        }
      } catch (err) {
        console.error('Error loading data:', err)
      }
    }

    fetchData()
  }, [])

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, unit_type: 'per_unit', service_id: null }])
    setTimeout(() => itemsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }, [])

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
        unit_price: Number(service.unit_price),
        unit_type: service.unit_type as 'fixed' | 'per_hour' | 'per_sqm' | 'per_unit'
      }
      setItems(newItems)
    }
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId)
    if (!templateId) return

    const template = templates.find(t => t.id === templateId)
    if (!template) return

    if (template.default_items && template.default_items.length > 0) {
      setItems(template.default_items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_type: item.unit_type,
        service_id: item.service_id || null,
      })))
    }

    if (template.default_discount_rate) {
      setDiscountRate(Number(template.default_discount_rate))
    }

    if (template.default_terms) {
      setTerms(template.default_terms)
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const discount = subtotal * (discountRate / 100)
  const taxableAmount = subtotal - discount
  const tax = taxableAmount * 0.16
  const total = taxableAmount + tax
  const itemCount = items.filter(i => i.description && i.quantity > 0).length

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!selectedClientId) {
      setError('Selecciona un cliente')
      setLoading(false)
      return
    }

    const selectedClient = clients.find(c => c.id === selectedClientId)
    if (!selectedClient) {
      setError('Cliente no encontrado')
      setLoading(false)
      return
    }

    const validUntilDate = new Date()
    validUntilDate.setDate(validUntilDate.getDate() + validDays)

    const data = {
      client_id: selectedClientId,
      items: items.filter(item => item.description && item.quantity > 0),
      notes: notes || null,
      terms_and_conditions: terms || null,
      valid_until: validUntilDate.toISOString(),
      discount_rate: discountRate,
      custom_fields: customFields,
    }

    if (data.items.length === 0) {
      setError('Agrega al menos un item a la cotizaci\u00F3n')
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear cotizaci\u00F3n')
      }

      if (selectedTemplateId) {
        fetch(`/api/templates/${selectedTemplateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usage_count_increment: true }),
        }).catch(() => { /* best-effort */ })
      }

      router.push('/dashboard/quotes')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cotizaci\u00F3n')
    } finally {
      setLoading(false)
    }
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Link href="/dashboard/quotes">
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer flex-shrink-0" type="button">
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </Link>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Nueva Cotizaci&oacute;n</h2>
            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Completa los datos y revisa el resumen</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* LEFT COLUMN */}
          <div className="md:col-span-2 space-y-4">

            {/* Client + Template — compact cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <User className="w-3.5 h-3.5 text-orange-500" />
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente *
                  </label>
                </div>
                <select
                  id="client_id"
                  name="client_id"
                  required
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow cursor-pointer"
                >
                  <option value="">Selecciona un cliente...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.company_name ? `(${client.company_name})` : ''}
                    </option>
                  ))}
                </select>
                {selectedClient && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {selectedClient.email && <span>{selectedClient.email}</span>}
                    {selectedClient.phone && <span>| {selectedClient.phone}</span>}
                  </div>
                )}
                {clients.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    No hay clientes. <Link href="/dashboard/clients/new" className="text-orange-600 dark:text-orange-400 hover:underline cursor-pointer">Crear cliente</Link>
                  </p>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <LayoutTemplate className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plantilla (opcional)
                  </label>
                </div>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow cursor-pointer"
                >
                  <option value="">Sin plantilla</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {template.promotional_label ? ` — ${template.promotional_label}` : ''}
                    </option>
                  ))}
                </select>
                {selectedTemplateId && templates.find(t => t.id === selectedTemplateId)?.description && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {templates.find(t => t.id === selectedTemplateId)?.description}
                  </p>
                )}
              </div>
            </div>

            {/* Items table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Items de la cotizaci&oacute;n</h3>
                  <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full font-medium">{items.length}</span>
                </div>
                <Button type="button" onClick={addItem} size="sm" variant="outline" data-testid="add-quote-item-btn"
                  className="text-xs h-7 px-2.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Agregar
                </Button>
              </div>

              {/* Table Header (desktop) */}
              <div className="hidden md:grid grid-cols-[1fr_2fr_80px_120px_100px_36px] gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <div>Servicio</div>
                <div>Descripci&oacute;n</div>
                <div className="text-right">Cant.</div>
                <div className="text-right">P. Unit.</div>
                <div className="text-right">Subtotal</div>
                <div></div>
              </div>

              {/* Items rows */}
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {items.map((item, index) => {
                  const lineTotal = item.quantity * item.unit_price
                  return (
                    <div key={index} className="group">
                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-[1fr_2fr_80px_120px_100px_36px] gap-2 px-4 py-2 items-center hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-colors">
                        <select
                          value={item.service_id || ''}
                          onChange={(e) => selectService(index, e.target.value)}
                          className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 transition-all truncate cursor-pointer"
                        >
                          <option value="">{'— Libre —'}</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                        <input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          required
                          placeholder="Descripción del item..."
                          data-testid={`item-description-${index}`}
                          className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 transition-all"
                        />
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          required
                          data-testid={`item-quantity-${index}`}
                          className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 transition-all tabular-nums"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          required
                          data-testid={`item-unit-price-${index}`}
                          className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 transition-all tabular-nums"
                        />
                        <div className="text-sm font-medium text-right tabular-nums text-gray-700 dark:text-gray-300">
                          ${lineTotal.toLocaleString('es-MX')}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className={`p-1 rounded hover:bg-red-50 transition-colors cursor-pointer ${items.length <= 1 ? 'invisible' : 'opacity-0 group-hover:opacity-100'}`}
                          tabIndex={-1}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>

                      {/* Mobile card */}
                      <div className="md:hidden p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">Item #{index + 1}</span>
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(index)} className="p-1 cursor-pointer">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                        <select
                          value={item.service_id || ''}
                          onChange={(e) => selectService(index, e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-sm cursor-pointer"
                        >
                          <option value="">Selecciona servicio...</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name} - ${Number(service.unit_price).toLocaleString('es-MX')}
                            </option>
                          ))}
                        </select>
                        <input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          required
                          placeholder="Descripción"
                          data-testid={`item-description-${index}`}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-gray-400 dark:text-gray-500 mb-1 block">Cantidad</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              required
                              data-testid={`item-quantity-${index}`}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-400 dark:text-gray-500 mb-1 block">Precio Unit.</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              required
                              data-testid={`item-unit-price-${index}`}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <div className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                          Subtotal: ${lineTotal.toLocaleString('es-MX')}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Quick-add row */}
              <div ref={itemsEndRef} className="px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar otro item
                </button>
              </div>
            </div>

            {/* Discount + Validity — always visible inline row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Percent className="w-3.5 h-3.5 text-green-500" />
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descuento</label>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                    className="h-9 text-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vigencia</label>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    value={validDays}
                    onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
                    className="h-9 text-sm pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">d&iacute;as</span>
                </div>
              </div>
              <div className="col-span-2 md:col-span-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <Hash className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items v&aacute;lidos</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{itemCount} <span className="text-sm font-normal text-gray-400 dark:text-gray-500">de {items.length}</span></p>
              </div>
            </div>

            {/* Notes & Terms — collapsible */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowExtras(!showExtras)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">Notas y T&eacute;rminos</span>
                  {(notes || terms) && (
                    <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${showExtras ? 'rotate-180' : ''}`} />
              </button>
              {showExtras && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Notas
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Informaci&oacute;n adicional para el cliente..."
                      className="text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      T&eacute;rminos y Condiciones
                    </label>
                    <Textarea
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Custom Fields */}
            <DynamicFieldsSection
              entityType="quote"
              values={customFields}
              onChange={setCustomFields}
            />
          </div>

          {/* RIGHT COLUMN — Sticky summary */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 space-y-3">
              {/* Summary card */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Resumen</h3>
                </div>
                <div className="px-4 py-4 space-y-3">
                  {/* Client preview */}
                  {selectedClient ? (
                    <div className="pb-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Para</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedClient.name}</p>
                      {selectedClient.company_name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{selectedClient.company_name}</p>
                      )}
                    </div>
                  ) : (
                    <div className="pb-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sin cliente seleccionado</p>
                    </div>
                  )}

                  {/* Line items count */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                      <span className="tabular-nums text-gray-700 dark:text-gray-300">${subtotal.toLocaleString('es-MX')}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Descuento ({discountRate}%)</span>
                        <span className="tabular-nums text-green-600 dark:text-green-400">-${discount.toLocaleString('es-MX')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">IVA (16%)</span>
                      <span className="tabular-nums text-gray-700 dark:text-gray-300">${tax.toLocaleString('es-MX')}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="font-bold text-gray-900 dark:text-white">Total</span>
                      <span className="font-bold text-lg tabular-nums text-orange-600 dark:text-orange-400" data-testid="quote-total">
                        ${total.toLocaleString('es-MX')}
                      </span>
                    </div>
                  </div>

                  {/* Validity */}
                  <div className="pt-2 text-xs text-gray-400 dark:text-gray-500">
                    V&aacute;lida por {validDays} d&iacute;as
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="submit-quote-btn"
                  className="w-full h-11 font-semibold cursor-pointer"
                >
                  {loading ? 'Creando...' : 'Crear Cotizaci\u00F3n'}
                </Button>
                <Link href="/dashboard/quotes" className="block" data-testid="cancel-quote-btn">
                  <Button type="button" variant="outline" disabled={loading} className="w-full h-10 text-sm cursor-pointer">
                    Cancelar
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
