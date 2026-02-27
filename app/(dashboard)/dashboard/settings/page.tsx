'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { Save, Building, User, Bell, Shield, Settings2 } from 'lucide-react'

interface Profile {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  organization_id: string
  role: string
}

interface Organization {
  id: string
  name: string
  slug: string
  settings: {
    company_address?: string
    company_phone?: string
    company_email?: string
    quote_terms?: string
    quote_valid_days?: number
    tax_rate?: number
  } | null
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'notifications' | 'security'>('profile')

  useEffect(() => {
    async function fetchSettings() {
      try {
        const [profileRes, orgRes] = await Promise.all([
          fetch('/api/auth/profile'),
          fetch('/api/auth/organization')
        ])

        if (profileRes.ok) {
          const data = await profileRes.json()
          setProfile(data.data)
        }

        if (orgRes.ok) {
          const data = await orgRes.json()
          setOrganization(data.data)
        }
      } catch {
        setError('Error al cargar configuracion')
      }
    }

    fetchSettings()
  }, [])

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const formData = new FormData(e.currentTarget)

    const data = {
      full_name: formData.get('full_name'),
      avatar_url: formData.get('avatar_url'),
    }

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar perfil')
      }

      const updated = await response.json()
      setProfile(updated.data)
      setSuccess('Perfil actualizado correctamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  async function handleOrganizationSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const formData = new FormData(e.currentTarget)

    const data = {
      name: formData.get('name'),
      settings: {
        company_address: formData.get('company_address'),
        company_phone: formData.get('company_phone'),
        company_email: formData.get('company_email'),
        quote_terms: formData.get('quote_terms'),
        quote_valid_days: parseInt(formData.get('quote_valid_days') as string) || 30,
        tax_rate: parseFloat(formData.get('tax_rate') as string) || 16,
      }
    }

    try {
      const response = await fetch('/api/auth/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar organizacion')
      }

      const updated = await response.json()
      setOrganization(updated.data)
      setSuccess('Organizacion actualizada correctamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar organizacion')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile' as const, label: 'Perfil', icon: User },
    { id: 'organization' as const, label: 'Empresa', icon: Building },
    { id: 'notifications' as const, label: 'Notificaciones', icon: Bell },
    { id: 'security' as const, label: 'Seguridad', icon: Shield },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30">
          <Settings2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuracion</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Gestiona tu cuenta y preferencias</p>
        </div>
      </div>

      {/* Pill Tabs */}
      <div className="flex gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(''); setSuccess('') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-900 dark:bg-gray-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 px-3 py-2 rounded text-sm">{success}</div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && profile && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Informacion Personal</h3>
          </div>
          <form onSubmit={handleProfileSubmit} className="p-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Email" htmlFor="email" hint="No se puede cambiar">
                <Input id="email" value={profile.email} disabled className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100" />
              </FormField>

              <FormField label="Nombre Completo" htmlFor="full_name">
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={profile.full_name || ''}
                  placeholder="Juan Perez"
                />
              </FormField>

              <FormField label="Rol" htmlFor="role">
                <Input id="role" value={profile.role} disabled className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100 capitalize" />
              </FormField>

              <FormField label="URL de Avatar" htmlFor="avatar_url">
                <Input
                  id="avatar_url"
                  name="avatar_url"
                  type="url"
                  defaultValue={profile.avatar_url || ''}
                  placeholder="https://ejemplo.com/avatar.jpg"
                />
              </FormField>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button type="submit" size="sm" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Save className="w-3.5 h-3.5 mr-1" />
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && organization && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Informacion de la Empresa</h3>
          </div>
          <form onSubmit={handleOrganizationSubmit} className="p-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Nombre de la Empresa" htmlFor="name" required>
                <Input id="name" name="name" required defaultValue={organization.name} />
              </FormField>

              <FormField label="Slug" htmlFor="slug" hint="No se puede cambiar">
                <Input id="slug" value={organization.slug} disabled className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100" />
              </FormField>

              <FormField label="Email de Contacto" htmlFor="company_email">
                <Input
                  id="company_email"
                  name="company_email"
                  type="email"
                  defaultValue={organization.settings?.company_email || ''}
                  placeholder="contacto@empresa.com"
                />
              </FormField>

              <FormField label="Telefono" htmlFor="company_phone">
                <Input
                  id="company_phone"
                  name="company_phone"
                  type="tel"
                  defaultValue={organization.settings?.company_phone || ''}
                  placeholder="5512345678"
                />
              </FormField>
            </div>

            <FormField label="Direccion" htmlFor="company_address">
              <Textarea
                id="company_address"
                name="company_address"
                rows={2}
                defaultValue={organization.settings?.company_address || ''}
                placeholder="Calle, numero, colonia, ciudad, estado, CP"
              />
            </FormField>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Validez de Cotizaciones (dias)" htmlFor="quote_valid_days">
                <Input
                  id="quote_valid_days"
                  name="quote_valid_days"
                  type="number"
                  min="1"
                  max="365"
                  defaultValue={organization.settings?.quote_valid_days || 30}
                />
              </FormField>

              <FormField label="Tasa de IVA (%)" htmlFor="tax_rate">
                <Input
                  id="tax_rate"
                  name="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue={organization.settings?.tax_rate || 16}
                />
              </FormField>
            </div>

            <FormField label="Terminos y Condiciones" htmlFor="quote_terms" hint="Se usaran por defecto en nuevas cotizaciones">
              <Textarea
                id="quote_terms"
                name="quote_terms"
                rows={3}
                defaultValue={organization.settings?.quote_terms || ''}
                placeholder="50% de anticipo al aceptar la cotizacion. 50% restante al completar el trabajo."
              />
            </FormField>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button type="submit" size="sm" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Save className="w-3.5 h-3.5 mr-1" />
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Preferencias de Notificaciones</h3>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Las notificaciones por email estaran disponibles proximamente.</p>

            {[
              { title: 'Nuevas Cotizaciones', desc: 'Email cuando se crea una cotizacion' },
              { title: 'Recordatorios Pendientes', desc: 'Email diario con recordatorios del dia' },
              { title: 'Cotizaciones Aceptadas', desc: 'Email cuando un cliente acepta' },
            ].map((item) => (
              <div key={item.title} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  disabled
                  className="h-4 w-4 accent-orange-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Seguridad</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Cambiar Contrasena</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Usa la opcion &quot;Olvidaste tu contrasena?&quot; en la pagina de inicio de sesion.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="/forgot-password">Cambiar Contrasena</a>
              </Button>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Sesiones Activas</p>
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Esta sesion</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ultima actividad: Ahora</p>
                </div>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-medium">
                  Actual
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
