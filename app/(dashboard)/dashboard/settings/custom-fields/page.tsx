'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CustomFieldDefinition, EntityType } from '@/types/custom-fields'

const ENTITY_TABS: { label: string; value: EntityType }[] = [
  { label: 'Clientes', value: 'client' },
  { label: 'Servicios', value: 'service' },
  { label: 'Cotizaciones', value: 'quote' },
]

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  textarea: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  select: 'Lista',
  checkbox: 'Checkbox',
  url: 'URL',
  phone: 'Teléfono',
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campos Personalizados</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define campos adicionales para capturar información específica de tu negocio.
          </p>
        </div>
        <Link
          href={`/dashboard/settings/custom-fields/new?entity_type=${activeTab}`}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          + Agregar Campo
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {ENTITY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
      ) : fields.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-500">
            No hay campos personalizados para{' '}
            {ENTITY_TABS.find((t) => t.value === activeTab)?.label.toLowerCase()}.
          </p>
          <Link
            href={`/dashboard/settings/custom-fields/new?entity_type=${activeTab}`}
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Etiqueta</th>
                <th className="px-4 py-3 text-left">Identificador</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Requerido</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fields.map((field) => (
                <tr key={field.id} className={field.is_active ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium text-gray-900">{field.field_label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{field.field_key}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                  </td>
                  <td className="px-4 py-3">
                    {field.is_required ? (
                      <span className="text-xs font-medium text-red-600">Sí</span>
                    ) : (
                      <span className="text-xs text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {field.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/settings/custom-fields/${field.id}`}
                        className="text-xs font-medium text-blue-600 hover:text-blue-500"
                      >
                        Editar
                      </Link>
                      {field.is_active ? (
                        <button
                          onClick={() => handleDeactivate(field.id)}
                          disabled={deletingId === field.id}
                          className="text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
                        >
                          {deletingId === field.id ? 'Desactivando...' : 'Desactivar'}
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
      )}
    </div>
  )
}
