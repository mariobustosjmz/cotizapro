import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SignupPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If already logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  async function signup(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const orgName = formData.get('orgName') as string

    const supabase = await createServerClient()

    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      redirect('/signup?error=signup-failed')
    }

    if (!data.user) {
      redirect('/signup?error=no-user')
    }

    // Create organization slug from name
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Create organization with owner using database function
    const { error: orgError } = await supabase.rpc('create_organization_with_owner', {
      org_name: orgName,
      org_slug: slug,
      owner_id: data.user.id,
      owner_email: email,
      owner_full_name: fullName,
    })

    if (orgError) {
      redirect('/signup?error=org-creation-failed')
    }

    redirect('/dashboard?welcome=true')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="text-3xl font-bold text-blue-600">
            CotizaPro
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Crea tu cuenta gratis
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Inicia sesión
            </Link>
          </p>
        </div>

        <form action={signup} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md">
            <div>
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="Juan Pérez"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="tu@email.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="orgName">Nombre de tu empresa</Label>
              <Input
                id="orgName"
                name="orgName"
                type="text"
                required
                placeholder="HVAC Pro México"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                minLength={8}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-500">Mínimo 8 caracteres</p>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Crear Cuenta Gratis
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              ✓ Sin tarjeta de crédito
            </p>
            <p className="text-sm text-gray-600">
              ✓ 14 días de prueba gratis
            </p>
            <p className="text-sm text-gray-600">
              ✓ Cancelación cuando quieras
            </p>
          </div>
        </form>

        <div className="text-center text-sm text-gray-600">
          <p>
            Al crear una cuenta, aceptas nuestros{' '}
            <Link href="/terminos" className="text-blue-600 hover:text-blue-500">
              Términos de Servicio
            </Link>{' '}
            y{' '}
            <Link href="/privacidad" className="text-blue-600 hover:text-blue-500">
              Política de Privacidad
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
