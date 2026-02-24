'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import type { QuoteTemplate } from '@/lib/validations/cotizapro'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_terms: '',
    default_discount_rate: '',
    is_active: true,
    promotional_label: '',
    promotional_valid_until: '',
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.data || [])
      } else {
        setError('No se pudieron cargar los templates')
      }
    } catch (err) {
      setError('Error al cargar los templates')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingId(null)
    setFormData({
      name: '',
      description: '',
      default_terms: '',
      default_discount_rate: '',
      is_active: true,
      promotional_label: '',
      promotional_valid_until: '',
    })
    setShowModal(true)
  }

  function openEditModal(template: QuoteTemplate) {
    setEditingId(template.id)
    setFormData({
      name: template.name,
      description: template.description || '',
      default_terms: template.default_terms || '',
      default_discount_rate: template.default_discount_rate ? String(template.default_discount_rate) : '',
      is_active: template.is_active,
      promotional_label: template.promotional_label || '',
      promotional_valid_until: template.promotional_valid_until || '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        default_terms: formData.default_terms || null,
        default_discount_rate: formData.default_discount_rate ? Number(formData.default_discount_rate) : null,
        is_active: formData.is_active,
        promotional_label: formData.promotional_label || null,
        promotional_valid_until: formData.promotional_valid_until || null,
      }

      const method = editingId ? 'PATCH' : 'POST'
      const url = editingId ? `/api/templates/${editingId}` : '/api/templates'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar template')
      }

      await fetchTemplates()
      setShowModal(false)
      setFormData({
        name: '',
        description: '',
        default_terms: '',
        default_discount_rate: '',
        is_active: true,
        promotional_label: '',
        promotional_valid_until: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar template')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm('¿Estás seguro de eliminar este template?')) {
      return
    }

    setDeleting(templateId)
    setError('')

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar template')
      }

      await fetchTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar template')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Templates · {templates.length}</h2>
          <p className="text-gray-600">Gestiona tus templates de cotizaciones</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Template
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">Cargando templates...</p>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      {!loading && templates.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">No hay templates aún</p>
            <Button onClick={openCreateModal} variant="outline">
              Crear primer template
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && templates.length > 0 && (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {template.name}
                    {template.is_active ? (
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                        Inactivo
                      </span>
                    )}
                  </CardTitle>
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {template.description.length > 100
                        ? `${template.description.slice(0, 100)}...`
                        : template.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(template)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    disabled={deleting === template.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.promotional_label && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Etiqueta Promocional:</span>
                    <span className="font-semibold text-sm">{template.promotional_label}</span>
                  </div>
                )}
                {template.promotional_valid_until && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Válido hasta:</span>
                    <span className="text-sm">{template.promotional_valid_until}</span>
                  </div>
                )}
                {template.default_discount_rate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Descuento por defecto:</span>
                    <span className="font-semibold text-sm">{template.default_discount_rate}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingId ? 'Editar Template' : 'Nuevo Template'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Template HVAC Residencial"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del template"
                    rows={3}
                  />
                </div>

                {/* Default Terms */}
                <div className="space-y-2">
                  <Label htmlFor="default_terms">Términos y Condiciones por defecto</Label>
                  <Textarea
                    id="default_terms"
                    value={formData.default_terms}
                    onChange={(e) => setFormData({ ...formData, default_terms: e.target.value })}
                    placeholder="Términos que aparecerán por defecto en las cotizaciones"
                    rows={4}
                  />
                </div>

                {/* Default Discount Rate */}
                <div className="space-y-2">
                  <Label htmlFor="default_discount_rate">Descuento por defecto (%)</Label>
                  <Input
                    id="default_discount_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.default_discount_rate}
                    onChange={(e) => setFormData({ ...formData, default_discount_rate: e.target.value })}
                    placeholder="0"
                  />
                </div>

                {/* Promotional Label */}
                <div className="space-y-2">
                  <Label htmlFor="promotional_label">Etiqueta Promocional</Label>
                  <Input
                    id="promotional_label"
                    value={formData.promotional_label}
                    onChange={(e) => setFormData({ ...formData, promotional_label: e.target.value })}
                    placeholder="Ej: Oferta de Primavera"
                  />
                </div>

                {/* Promotional Valid Until */}
                {formData.promotional_label && (
                  <div className="space-y-2">
                    <Label htmlFor="promotional_valid_until">Válido hasta</Label>
                    <Input
                      id="promotional_valid_until"
                      type="date"
                      value={formData.promotional_valid_until}
                      onChange={(e) => setFormData({ ...formData, promotional_valid_until: e.target.value })}
                    />
                  </div>
                )}

                {/* Is Active */}
                <div className="flex items-center gap-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Template activo
                  </Label>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !formData.name}
                  >
                    {submitting ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
