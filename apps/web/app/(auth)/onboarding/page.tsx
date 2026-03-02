import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function OnboardingPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (existingProfile) {
    redirect('/dashboard')
  }

  async function completeOnboarding(formData: FormData) {
    'use server'

    const orgName = formData.get('orgName') as string
    const fullName = formData.get('fullName') as string

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    // Create organization slug from name
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Create organization with owner using database function
    const { data: orgId, error: orgError } = await supabase.rpc('create_organization_with_owner', {
      org_name: orgName,
      org_slug: slug,
      owner_id: user.id,
      owner_email: user.email!,
      owner_full_name: fullName,
    })

    if (orgError) {
      console.error('Organization creation error:', orgError)
      redirect(`/onboarding?error=${encodeURIComponent(orgError.message)}`)
    }

    redirect('/dashboard?welcome=true')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Complete tu perfil
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Solo un paso mas para empezar a usar CotizaPro
          </p>
        </div>

        <form action={completeOnboarding} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md">
            <div>
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                defaultValue={user.user_metadata?.full_name || ''}
                placeholder="Juan Perez"
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
                placeholder="HVAC Pro Mexico"
                className="mt-1"
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Completar Configuracion
          </Button>
        </form>
      </div>
    </div>
  )
}
