'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Settings2 } from 'lucide-react'
import type { CustomFieldDefinition, EntityType } from '@/types/custom-fields'

const ENTITY_TABS: { label: string; value: EntityType }[] = [
  { label: 'Clientes', value: 'client' },
  { label: 'Servicios', value: 'service' },
  { label: 'Cotizaciones', value: 'quote' },
]

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  textarea: 'Texto largo',
  number: 'Numero',
  date: 'Fecha',
  select: 'Lista',
  checkbox: 'Checkbox',
  url: 'URL',
  phone: 'Telefono',
  email: 'Email',
}

export default function CustomFieldsSettingsPage() {
  const [activeTab, setActiveTab] = useState<EntityType>('client')
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadFields(entityType: EntityType) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/custom-fields?entity_type=${entityType}&active_only=false`)
      if (!res.ok) throw new Error('Error al cargar campos')
      const json = await res.json()
      setFields(json.data ?? [])
    } catch {
      setError('No se pudieron cargar los campos personalizados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFields(activeTab)
  }, [activeTab])

  async function handleDeactivate(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/custom-fields/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al desactivar campo')
      await loadFields(activeTab)
    } catch {
      setError('No se pudo desactivar el campo.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleReactivate(id: string) {
    try {
      const res = await fetch(`/api/custom-fields/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })
      if (!res.ok) throw new Error('Error al reactivar campo')
      await loadFields(activeTab)
    } catch {
      setError('No se pudo reactivar el campo.')
    }
  }

  const activeCount = fields.filter((f) => f.is_active).length
  const inactiveCount = fields.filter((f) => !f.is_active).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100">
            <Settings2 className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Campos Personalizados</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500">{fields.length} campos</span>
              <span className="text-green-600">{activeCount} activos</span>
              {inactiveCount > 0 && (
                <span className="text-gray-400">{inactiveCount} inactivos</span>
              )}
            </div>
          </div>
        </div>
        <Link href={`/dashboard/settings/custom-fields/new?entity_type=${activeTab}`}>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {ENTITY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">Cargando...</div>
      ) : fields.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-10">
          <Settings2 className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            No hay campos personalizados para{' '}
            {ENTITY_TABS.find((t) => t.value === activeTab)?.label.toLowerCase()}.
          </p>
          <Link
            href={`/dashboard/settings/custom-fields/new?entity_type=${activeTab}`}
            className="mt-2 inline-block text-xs font-medium text-orange-600 hover:text-orange-700"
          >
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Etiqueta</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Identificador</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Requerido</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fields.map((field) => (
                  <tr key={field.id} className={`hover:bg-orange-50/40 ${field.is_active ? '' : 'opacity-50'}`}>
                    <td className="py-2.5 px-4 font-medium text-gray-900">{field.field_label}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-gray-500 hidden md:table-cell">{field.field_key}</td>
                    <td className="py-2.5 px-4 text-gray-700">
                      {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                    </td>
                    <td className="py-2.5 px-4 hidden md:table-cell">
                      {field.is_required ? (
                        <span className="text-[10px] font-medium text-red-600">Si</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">No</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {field.is_active ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-[10px] font-medium text-green-700">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-500">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/settings/custom-fields/${field.id}`}
                          className="text-xs font-medium text-orange-600 hover:text-orange-700"
                        >
                          Editar
                        </Link>
                        {field.is_active ? (
                          <button
                            onClick={() => handleDeactivate(field.id)}
                            disabled={deletingId === field.id}
                            className="text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
                          >
                            {deletingId === field.id ? '...' : 'Desactivar'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(field.id)}
                            className="text-xs font-medium text-green-600 hover:text-green-500"
                          >
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
