'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { Plus, Trash2, Edit2, FileStack } from 'lucide-react'
import type { QuoteTemplate } from '@/lib/validations/cotizapro'

export default function TemplatesPage() {
  const { toast } = useToast()
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
      const action = editingId ? 'actualizado' : 'creado'
      toast({ message: `Template ${action} exitosamente`, variant: 'success' })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al guardar template'
      setError(errorMsg)
      toast({ message: errorMsg, variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm('Eliminar este template?')) return

    setDeleting(templateId)
    setError('')

    try {
      const response = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar template')
      }

      await fetchTemplates()
      toast({ message: 'Template eliminado exitosamente', variant: 'success' })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al eliminar template'
      setError(errorMsg)
      toast({ message: errorMsg, variant: 'error' })
    } finally {
      setDeleting(null)
    }
  }

  const activeCount = templates.filter((t) => t.is_active).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <FileStack className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Templates</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{templates.length} templates</span>
              <span className="text-green-600">{activeCount} activos</span>
            </div>
          </div>
        </div>
        <Button onClick={openCreateModal} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" />
          Nuevo
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">{error}</div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Cargando...</div>
      ) : templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-center py-10">
          <FileStack className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No hay templates aun</p>
          <div className="mt-4">
            <Button onClick={openCreateModal} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="w-4 h-4 mr-1" />
              Crear Primer Template
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nombre</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Descripcion</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Descuento</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Promo</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-orange-50/40 dark:hover:bg-gray-800/40">
                    <td className="py-2.5 px-4">
                      <span className="font-medium text-gray-900 dark:text-white">{template.name}</span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {template.description
                        ? template.description.length > 60
                          ? `${template.description.slice(0, 60)}...`
                          : template.description
                        : '\u2014'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                      {template.default_discount_rate ? `${Number(template.default_discount_rate)}%` : '\u2014'}
                    </td>
                    <td className="py-2.5 px-4 hidden lg:table-cell">
                      {template.promotional_label ? (
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-[10px] font-medium text-orange-700 dark:text-orange-400">
                          {template.promotional_label}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">\u2014</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {template.is_active ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-[10px] font-medium text-green-700 dark:text-green-400">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(template)}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={deleting === template.id}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {editingId ? 'Editar Template' : 'Nuevo Template'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <FormField label="Nombre" htmlFor="modal_name" required>
                <Input
                  id="modal_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Template HVAC Residencial"
                  required
                />
              </FormField>

              <FormField label="Descripcion" htmlFor="modal_description">
                <Textarea
                  id="modal_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripcion del template"
                  rows={2}
                />
              </FormField>

              <FormField label="Terminos y Condiciones" htmlFor="modal_terms">
                <Textarea
                  id="modal_terms"
                  value={formData.default_terms}
                  onChange={(e) => setFormData({ ...formData, default_terms: e.target.value })}
                  placeholder="Terminos por defecto en cotizaciones"
                  rows={2}
                />
              </FormField>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Descuento (%)" htmlFor="modal_discount">
                  <Input
                    id="modal_discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.default_discount_rate}
                    onChange={(e) => setFormData({ ...formData, default_discount_rate: e.target.value })}
                    placeholder="0"
                  />
                </FormField>

                <FormField label="Etiqueta Promo" htmlFor="modal_promo">
                  <Input
                    id="modal_promo"
                    value={formData.promotional_label}
                    onChange={(e) => setFormData({ ...formData, promotional_label: e.target.value })}
                    placeholder="Ej: Oferta de Primavera"
                  />
                </FormField>
              </div>

              {formData.promotional_label && (
                <FormField label="Promo valida hasta" htmlFor="modal_promo_date">
                  <Input
                    id="modal_promo_date"
                    type="date"
                    value={formData.promotional_valid_until}
                    onChange={(e) => setFormData({ ...formData, promotional_valid_until: e.target.value })}
                  />
                </FormField>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="modal_is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 accent-orange-500 focus:ring-orange-500 border-gray-300 dark:border-gray-600 rounded cursor-pointer dark:bg-gray-800"
                />
                <label htmlFor="modal_is_active" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  Template activo
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={submitting || !formData.name} className="bg-orange-500 hover:bg-orange-600 text-white">
                  {submitting ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
