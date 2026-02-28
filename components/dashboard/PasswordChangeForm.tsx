'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Save, Eye, EyeOff } from 'lucide-react'

interface PasswordChangeFormProps {
  disabled?: boolean
  onSuccess?: () => void
  onError?: (message: string) => void
}

export function PasswordChangeForm({ disabled = false, onSuccess, onError }: PasswordChangeFormProps) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const new_password = formData.get('new_password') as string
    const confirm_password = formData.get('confirm_password') as string

    // Client-side validation
    const newErrors: Record<string, string> = {}

    if (!new_password) {
      newErrors.new_password = 'La contraseña es requerida'
    } else if (new_password.length < 8) {
      newErrors.new_password = 'La contraseña debe tener al menos 8 caracteres'
    } else if (!/[A-Z]/.test(new_password)) {
      newErrors.new_password = 'Debe contener al menos una mayúscula'
    } else if (!/[a-z]/.test(new_password)) {
      newErrors.new_password = 'Debe contener al menos una minúscula'
    } else if (!/[0-9]/.test(new_password)) {
      newErrors.new_password = 'Debe contener al menos un número'
    } else if (!/[^A-Za-z0-9]/.test(new_password)) {
      newErrors.new_password = 'Debe contener al menos un carácter especial'
    }

    if (!confirm_password) {
      newErrors.confirm_password = 'Confirma tu contraseña'
    } else if (new_password !== confirm_password) {
      newErrors.confirm_password = 'Las contraseñas no coinciden'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      onError?.(Object.values(newErrors)[0])
      return
    }

    try {
      const response = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cambiar contraseña')
      }

      // Clear form
      ;(e.target as HTMLFormElement).reset()
      setShowPassword(false)
      setShowConfirm(false)

      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cambiar contraseña'
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <FormField label="Nueva Contraseña" htmlFor="new_password" error={errors.new_password}>
        <div className="relative">
          <Input
            id="new_password"
            name="new_password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Contraseña segura"
            disabled={disabled || loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </FormField>

      <FormField label="Confirmar Contraseña" htmlFor="confirm_password" error={errors.confirm_password}>
        <div className="relative">
          <Input
            id="confirm_password"
            name="confirm_password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repite tu contraseña"
            disabled={disabled || loading}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </FormField>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          size="sm"
          disabled={disabled || loading}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          {loading ? 'Guardando...' : 'Cambiar Contraseña'}
        </Button>
      </div>
    </form>
  )
}
