'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { WORK_EVENT_TYPE_LABELS } from '@/lib/constants/work-events'

interface CalendarEvent {
  id: string
  title: string
  event_type: 'instalacion' | 'medicion' | 'visita_tecnica' | 'mantenimiento' | 'otro'
  scheduled_start: string
  scheduled_end: string
  status: string
  clients: { name: string | null; company_name: string | null } | null
}

interface CalendarWeekViewProps {
  events: CalendarEvent[]
  initialDate: Date
}

const EVENT_TYPE_COLORS: Record<CalendarEvent['event_type'], { bg: string; border: string; text: string }> = {
  instalacion: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900' },
  medicion: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900' },
  visita_tecnica: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-900' },
  mantenimiento: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-900' },
  otro: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900' },
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8am to 8pm

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getEventPosition(event: CalendarEvent, dayStart: Date, dayEnd: Date) {
  const eventStart = new Date(event.scheduled_start)
  const eventEnd = new Date(event.scheduled_end)

  if (eventStart >= dayEnd || eventEnd <= dayStart) return null

  const displayStart = eventStart < dayStart ? dayStart : eventStart
  const displayEnd = eventEnd > dayEnd ? dayEnd : eventEnd

  const topPercent = ((displayStart.getHours() - 8 + displayStart.getMinutes() / 60) / 12) * 100
  const heightPercent = ((displayEnd.getTime() - displayStart.getTime()) / (12 * 60 * 60 * 1000)) * 100

  return { topPercent, heightPercent }
}

export function CalendarWeekView({ events, initialDate }: CalendarWeekViewProps) {
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(initialDate))

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      return date
    })
  }, [weekStart])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const prevWeek = () => {
    const prev = new Date(weekStart)
    prev.setDate(prev.getDate() - 7)
    setWeekStart(prev)
  }

  const nextWeek = () => {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + 7)
    setWeekStart(next)
  }

  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  // Check if there are any events in the current week
  const hasEvents = events.length > 0

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {weekStart.toLocaleDateString('es-MX', { month: 'long', day: 'numeric' })} -{' '}
          {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('es-MX', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={prevWeek} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextWeek} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Empty state or Calendar grid */}
      {!hasEvents ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay eventos esta semana</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Comienza creando tu primer evento</p>
            <div className="mt-4">
              <Link href="/dashboard/calendar/new" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600">
                <Plus className="h-4 w-4" />
                Nuevo Evento
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
        <div className="flex min-w-min">
          {/* Time column */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="h-12 border-b border-gray-200 dark:border-gray-700" />
            {HOURS.map((hour) => (
              <div key={hour} className="h-12 border-b border-gray-100 dark:border-gray-700 flex items-start justify-end pr-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                {hour}:00
              </div>
            ))}
          </div>

          {/* Days columns */}
          <div className="flex-1 flex">
            {weekDays.map((day, dayIndex) => {
              const dayStart = new Date(day)
              dayStart.setHours(8, 0, 0, 0)
              const dayEnd = new Date(day)
              dayEnd.setHours(20, 0, 0, 0)

              // Filter events that overlap with the day (not just start time)
              const dayEvents = events.filter((e) => {
                const eStart = new Date(e.scheduled_start)
                const eEnd = new Date(e.scheduled_end)
                return eStart < dayEnd && eEnd > dayStart
              })

              const isToday = day.toDateString() === today.toDateString()

              return (
                <div key={day.toISOString()} className="flex-1 border-r border-gray-200 dark:border-gray-700 relative">
                  {/* Day header */}
                  <div className={`h-12 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex flex-col justify-center ${isToday ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-900'}`}>
                    <div className={`text-xs font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>{dayLabels[dayIndex]}</div>
                    <div className={`text-sm font-semibold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                      {day.getDate()}
                    </div>
                    {isToday && <div className={`text-xs font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>Hoy</div>}
                  </div>

                  {/* Hour grid */}
                  <div className="relative">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="h-12 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors"
                        onClick={() => {
                          const dateISO = formatDateISO(day)
                          window.location.href = `/dashboard/calendar/new?date=${dateISO}&hour=${hour}`
                        }}
                      />
                    ))}

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const position = getEventPosition(event, dayStart, dayEnd)
                      if (!position) return null

                      const colors = EVENT_TYPE_COLORS[event.event_type]
                      const clientDisplay = event.clients?.company_name || event.clients?.name || 'Sin cliente'
                      const eventTypeLabel = WORK_EVENT_TYPE_LABELS[event.event_type]

                      return (
                        <div
                          key={event.id}
                          className={`absolute left-0.5 right-0.5 ${colors.bg} border-l-4 ${colors.border} rounded px-2 py-1 text-xs overflow-hidden`}
                          style={{
                            top: `${position.topPercent}%`,
                            height: `${position.heightPercent}%`,
                            minHeight: '24px',
                          }}
                          title={`${event.title} - ${clientDisplay}`}
                        >
                          <div className={`${colors.text} font-semibold truncate`}>{event.title}</div>
                          <div className={`${colors.text} text-[10px] truncate opacity-75`}>{clientDisplay}</div>
                          <div className={`${colors.text} text-[10px] opacity-60`}>{eventTypeLabel}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
