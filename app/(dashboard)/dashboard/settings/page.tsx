'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save, Building, User, Bell, Shield } from 'lucide-react'

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
      } catch (err) {
        setError('Error al cargar configuración')
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
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar perfil')
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
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar organización')
      }

      const updated = await response.json()
      setOrganization(updated.data)
      setSuccess('Organización actualizada correctamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar organización')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'organization', label: 'Organización', icon: Building },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
        <p className="text-gray-600">Gestiona tu cuenta y preferencias</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && profile && (
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500">
                    El email no se puede cambiar
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre Completo</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    defaultValue={profile.full_name || ''}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Input
                    id="role"
                    value={profile.role}
                    disabled
                    className="bg-gray-50 capitalize"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar_url">URL de Avatar</Label>
                  <Input
                    id="avatar_url"
                    name="avatar_url"
                    type="url"
                    defaultValue={profile.avatar_url || ''}
                    placeholder="https://ejemplo.com/avatar.jpg"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && organization && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrganizationSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre de la Empresa *</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      defaultValue={organization.name}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={organization.slug}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-sm text-gray-500">
                      El slug no se puede cambiar
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_email">Email de Contacto</Label>
                    <Input
                      id="company_email"
                      name="company_email"
                      type="email"
                      defaultValue={organization.settings?.company_email || ''}
                      placeholder="contacto@empresa.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_phone">Teléfono</Label>
                    <Input
                      id="company_phone"
                      name="company_phone"
                      type="tel"
                      defaultValue={organization.settings?.company_phone || ''}
                      placeholder="5512345678"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_address">Dirección</Label>
                  <Textarea
                    id="company_address"
                    name="company_address"
                    rows={3}
                    defaultValue={organization.settings?.company_address || ''}
                    placeholder="Calle, número, colonia, ciudad, estado, CP"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quote_valid_days">Validez de Cotizaciones (días)</Label>
                    <Input
                      id="quote_valid_days"
                      name="quote_valid_days"
                      type="number"
                      min="1"
                      max="365"
                      defaultValue={organization.settings?.quote_valid_days || 30}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Tasa de IVA (%)</Label>
                    <Input
                      id="tax_rate"
                      name="tax_rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      defaultValue={organization.settings?.tax_rate || 16}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quote_terms">Términos y Condiciones por Defecto</Label>
                  <Textarea
                    id="quote_terms"
                    name="quote_terms"
                    rows={4}
                    defaultValue={organization.settings?.quote_terms || ''}
                    placeholder="50% de anticipo al aceptar la cotización. 50% restante al completar el trabajo. Garantía de 1 año en mano de obra."
                  />
                  <p className="text-sm text-gray-500">
                    Estos términos se usarán por defecto en nuevas cotizaciones
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>Preferencias de Notificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Las notificaciones por email estarán disponibles próximamente.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Nuevas Cotizaciones</p>
                    <p className="text-sm text-gray-600">Recibe un email cuando se crea una cotización</p>
                  </div>
                  <input
                    type="checkbox"
                    disabled
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Recordatorios Pendientes</p>
                    <p className="text-sm text-gray-600">Recibe un email diario con recordatorios del día</p>
                  </div>
                  <input
                    type="checkbox"
                    disabled
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Cotizaciones Aceptadas</p>
                    <p className="text-sm text-gray-600">Recibe un email cuando un cliente acepta una cotización</p>
                  </div>
                  <input
                    type="checkbox"
                    disabled
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Cambiar Contraseña</h3>
                <p className="text-gray-600 mb-4">
                  Para cambiar tu contraseña, cierra sesión y usa la opción "¿Olvidaste tu contraseña?" en la página de inicio de sesión.
                </p>
                <Button variant="outline" asChild>
                  <a href="/forgot-password">
                    Cambiar Contraseña
                  </a>
                </Button>
              </div>

              <div className="pt-6 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Sesiones Activas</h3>
                <p className="text-gray-600 mb-4">
                  Gestiona las sesiones activas de tu cuenta.
                </p>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Esta sesión</p>
                      <p className="text-sm text-gray-600">Última actividad: Ahora</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Actual
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
