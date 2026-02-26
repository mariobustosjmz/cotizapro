import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { CalendarWeekView } from '@/components/dashboard/calendar-week-view'
import { Button } from '@/components/ui/button'
import { Plus, Calendar } from 'lucide-react'

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

  const typedEvents: CalendarEvent[] = (events || []).map((event) => ({
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100">
            <Calendar className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Agenda</h2>
            <span className="text-sm text-gray-500">{typedEvents.length} eventos esta semana</span>
          </div>
        </div>
        <Link href="/dashboard/calendar/new">
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        </Link>
      </div>
      <CalendarWeekView events={typedEvents} initialDate={new Date()} />
    </div>
  )
}
