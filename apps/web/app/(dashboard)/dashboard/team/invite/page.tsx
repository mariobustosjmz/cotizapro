'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function InvitePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    email: '',
    role: 'member',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!formData.email || formData.email.trim().length === 0) {
      errors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/team/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
          setFieldErrors(data.fieldErrors)
          setError('Por favor corrige los errores marcados.')
          return
        }
        throw new Error(data.error || 'Error al enviar invitaci\u00f3n')
      }

      router.push('/dashboard/team')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar invitaci\u00f3n')
    } finally {
      setLoading(false)
    }
  }

  const selectClass = "w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/team">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Invitar Miembro</h2>
          <p className="text-xs text-gray-500">Env\u00eda una invitaci\u00f3n por correo</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200">
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <FormField label="Email del Miembro" htmlFor="email" required hint="Se enviará una invitación a este correo" error={fieldErrors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ejemplo@correo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className={fieldErrors.email ? 'border-red-500' : ''}
            />
          </FormField>

          <FormField label="Rol" htmlFor="role" required hint={
            formData.role === 'admin' ? 'Puede gestionar miembros e invitaciones' :
            formData.role === 'member' ? 'Puede crear y editar contenido' :
            'Solo puede ver contenido'
          }>
            <select
              id="role"
              name="role"
              className={selectClass}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <option value="member">Miembro</option>
              <option value="admin">Administrador</option>
              <option value="viewer">Visualizador</option>
            </select>
          </FormField>

          {/* Info */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p>Las invitaciones expiran en 7 d\u00edas</p>
            <p>Solo admins y propietarios pueden invitar</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Link href="/dashboard/team">
              <Button type="button" variant="outline" size="sm" disabled={loading}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" size="sm" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? 'Enviando...' : 'Enviar Invitaci\u00f3n'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
