'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'

interface ReminderRowActionsProps {
  reminderId: string
}

export function ReminderRowActions({ reminderId }: ReminderRowActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowSnoozeMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleComplete() {
    setLoading(true)
    try {
      const response = await fetch(`/api/reminders/${reminderId}/complete`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Error al completar')
      }

      toast({ message: 'Recordatorio completado exitosamente', variant: 'success' })
      router.refresh()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al completar recordatorio'
      toast({ message: errorMsg, variant: 'error' })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSnooze(days: number) {
    setLoading(true)
    try {
      const today = new Date()
      today.setDate(today.getDate() + days)
      const snoozeUntil = today.toISOString().split('T')[0]

      const response = await fetch(`/api/reminders/${reminderId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snooze_until: snoozeUntil }),
      })

      if (!response.ok) {
        throw new Error('Error al posponer')
      }

      toast({ message: 'Recordatorio pospuesto exitosamente', variant: 'success' })
      setShowSnoozeMenu(false)
      router.refresh()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al posponer recordatorio'
      toast({ message: errorMsg, variant: 'error' })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5 relative" ref={menuRef}>
      <Button
        onClick={handleComplete}
        disabled={loading}
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 text-xs"
        title="Completar"
      >
        <CheckCircle className="w-3.5 h-3.5" />
      </Button>

      <div className="relative">
        <Button
          onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
          disabled={loading}
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs"
          title="Posponer"
        >
          <Clock className="w-3.5 h-3.5" />
        </Button>

        {showSnoozeMenu && (
          <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
            <div className="py-1">
              <button
                onClick={() => handleSnooze(1)}
                disabled={loading}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                1 día
              </button>
              <button
                onClick={() => handleSnooze(3)}
                disabled={loading}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                3 días
              </button>
              <button
                onClick={() => handleSnooze(7)}
                disabled={loading}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                1 semana
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
