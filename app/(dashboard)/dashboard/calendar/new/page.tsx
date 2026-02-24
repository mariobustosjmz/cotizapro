import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { WorkEventForm } from '@/components/dashboard/work-event-form'

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
  searchParams: Promise<{ date?: string; hour?: string; client_id?: string }>
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

  const typedClients: Client[] = (clients || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    company_name: c.company_name,
  }))

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Nuevo Evento</h1>
      <WorkEventForm
        clients={typedClients}
        defaultDate={searchParams.date}
        defaultHour={searchParams.hour ? Number(searchParams.hour) : undefined}
        defaultClientId={searchParams.client_id}
      />
    </div>
  )
}
