'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleAccept = async () => {
    setLoading(true)
    setStatus('idle')
    setMessage('')

    try {
      const response = await fetch('/api/team/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al aceptar invitación')
      }

      setStatus('success')
      setMessage('Invitación aceptada exitosamente. Redirigiendo al dashboard...')

      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Invitación a CotizaPro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600">
              Has sido invitado a unirte a una organización en CotizaPro.
            </p>
          </div>

          {status === 'idle' && (
            <div className="space-y-4">
              <Button
                onClick={handleAccept}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Aceptando...
                  </>
                ) : (
                  'Aceptar Invitación'
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                Al aceptar, te unirás a la organización con el rol asignado
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-green-600 font-medium">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-red-600">{message}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleAccept}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Intentar de Nuevo
                </Button>

                <Link href="/dashboard">
                  <Button variant="ghost" className="w-full">
                    Ir al Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-gray-500">
            <p>¿No tienes una cuenta?</p>
            <Link href="/signup" className="text-blue-600 hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
