import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { WorkEventEditForm } from '@/components/dashboard/work-event-edit-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Editar Evento - CotizaPro',
  description: 'Edita un evento de trabajo',
}

interface Client {
  id: string
  name: string | null
  company_name: string | null
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const { data: event, error: eventError } = await supabase
    .from('work_events')
    .select('id, title, event_type, scheduled_start, scheduled_end, address, notes, client_id, quote_id, status')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name')
    .eq('organization_id', profile.organization_id)
    .order('name', { ascending: true })
    .limit(200)

  const typedClients: Client[] = (clients || []).map((c) => ({
    id: c.id,
    name: c.name,
    company_name: c.company_name,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/calendar">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Evento</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{event.title}</p>
        </div>
      </div>
      <WorkEventEditForm clients={typedClients} event={event} />
    </div>
  )
}
