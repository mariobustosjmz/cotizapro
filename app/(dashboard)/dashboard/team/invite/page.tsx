'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function InvitePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    role: 'member',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/team/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar invitación')
      }

      router.push('/dashboard/team')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/team">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invitar Nuevo Miembro</h2>
          <p className="text-gray-600">Envía una invitación por correo electrónico</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Invitación</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email del Miembro</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <p className="text-sm text-gray-500">
                Se enviará una invitación a este correo electrónico
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <select
                id="role"
                name="role"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="member">Miembro</option>
                <option value="admin">Administrador</option>
                <option value="viewer">Visualizador</option>
              </select>
              <p className="text-sm text-gray-500">
                {formData.role === 'admin' && 'Administrador: Puede gestionar miembros e invitaciones'}
                {formData.role === 'member' && 'Miembro: Puede crear y editar contenido'}
                {formData.role === 'viewer' && 'Visualizador: Solo puede ver contenido'}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/team">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información sobre Invitaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>• Las invitaciones expiran después de 7 días</p>
          <p>• El miembro invitado recibirá un correo con un enlace único</p>
          <p>• Puedes cancelar invitaciones pendientes en cualquier momento</p>
          <p>• Solo administradores y propietarios pueden invitar nuevos miembros</p>
        </CardContent>
      </Card>
    </div>
  )
}
