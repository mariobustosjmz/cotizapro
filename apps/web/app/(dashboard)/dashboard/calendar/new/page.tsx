import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { WorkEventForm } from '@/components/dashboard/work-event-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  name: string | null
  company_name: string | null
}

export const metadata = {
  title: 'Nuevo Evento - CotizaPro',
  description: 'Crea un nuevo evento de trabajo',
}

export default async function NewEventPage(props: {
  searchParams: Promise<{ date?: string; hour?: string; client_id?: string; quote_id?: string }>
}) {
  const searchParams = await props.searchParams

  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, company_name')
    .eq('organization_id', profile.organization_id)
    .order('name', { ascending: true })
    .limit(200)

  if (clientsError) {
    console.error('Error fetching clients:', clientsError)
  }

  const typedClients: Client[] = (clients || []).map((c) => ({
    id: c.id,
    name: c.name,
    company_name: c.company_name,
  }))

  const rawHour = Number(searchParams.hour)
  const validatedHour = Number.isFinite(rawHour) && rawHour >= 0 && rawHour <= 23 ? rawHour : 9

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/calendar">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Nuevo Evento</h2>
          <p className="text-xs text-gray-500">Crea un evento de trabajo</p>
        </div>
      </div>
      <WorkEventForm
        clients={typedClients}
        defaultDate={searchParams.date}
        defaultHour={validatedHour}
        defaultClientId={searchParams.client_id}
        quoteId={searchParams.quote_id}
      />
    </div>
  )
}
