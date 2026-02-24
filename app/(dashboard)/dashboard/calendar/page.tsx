import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { CalendarWeekView } from '@/components/dashboard/calendar-week-view'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  event_type: 'instalacion' | 'medicion' | 'visita_tecnica' | 'mantenimiento' | 'otro'
  scheduled_start: string
  scheduled_end: string
  status: string
  clients: { name: string | null; company_name: string | null } | null
}

export const metadata = {
  title: 'Agenda - CotizaPro',
  description: 'Gestiona tu calendario de eventos de trabajo',
}

export default async function CalendarPage() {
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

  const now = new Date()
  const weekStart = new Date(now)
  const day = weekStart.getDay()
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
  weekStart.setDate(diff)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const { data: events, error: eventsError } = await supabase
    .from('work_events')
    .select('id, title, event_type, scheduled_start, scheduled_end, status, clients(name, company_name)')
    .eq('organization_id', profile.organization_id)
    .gte('scheduled_start', weekStart.toISOString())
    .lt('scheduled_start', weekEnd.toISOString())
    .order('scheduled_start', { ascending: true })
    .limit(200)

  if (eventsError) {
    console.error('Error fetching calendar events:', eventsError)
  }

  const typedEvents: CalendarEvent[] = (events || []).map((event: any) => ({
    id: event.id,
    title: event.title,
    event_type: event.event_type,
    scheduled_start: event.scheduled_start,
    scheduled_end: event.scheduled_end,
    status: event.status,
    clients:
      event.clients && typeof event.clients === 'object' && !Array.isArray(event.clients)
        ? event.clients
        : null,
  }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <Link href="/dashboard/calendar/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Evento
          </Button>
        </Link>
      </div>
      <CalendarWeekView events={typedEvents} initialDate={new Date()} />
    </div>
  )
}
