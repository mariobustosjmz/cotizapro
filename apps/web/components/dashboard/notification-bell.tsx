'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Clock, AlertTriangle, Mail, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useRealtimeRefresh } from '@/hooks/use-realtime'

interface NotificationItem {
  id: string
  type: 'reminder' | 'send'
  title: string
  subtitle: string
  date: string
  priority: string
  read: boolean
  href: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const json = await res.json()
      setItems(json.data ?? [])
      setUnreadCount(json.unread_count ?? 0)
    } catch {
      // silent
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string, notificationType: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: notificationType }),
      })
      await fetchNotifications()
    } catch {
      // silent
    }
  }, [fetchNotifications])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Real-time: auto-refresh when reminders or quote notifications change
  useRealtimeRefresh(['follow_up_reminders', 'quote_notifications'], fetchNotifications)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60_000)

    if (diffMins < 60) return `hace ${diffMins}m`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `hace ${diffHours}h`
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative w-8 h-8 flex items-center justify-center rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-orange-500 dark:bg-orange-600 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Notificaciones</span>
            {unreadCount > 0 && (
              <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">{unreadCount} pendiente{unreadCount > 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Sin notificaciones</p>
              </div>
            ) : (
              items.map(item => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    setOpen(false)
                    if (!item.read) {
                      markAsRead(item.id, item.type)
                    }
                  }}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    !item.read ? 'bg-orange-50/40 dark:bg-orange-900/20' : ''
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                    item.type === 'reminder'
                      ? item.priority === 'high' || item.priority === 'urgent'
                        ? 'bg-orange-100 dark:bg-orange-900/30'
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {item.type === 'reminder' ? (
                      item.priority === 'high' || item.priority === 'urgent' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-yellow-600" />
                      )
                    ) : item.title.includes('Email') ? (
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">{formatDate(item.date)}</span>
                </Link>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700">
            <Link
              href="/dashboard/reminders"
              onClick={() => setOpen(false)}
              className="text-xs text-orange-500 dark:text-orange-400 hover:text-orange-400 dark:hover:text-orange-300 font-medium"
            >
              Ver todos los recordatorios
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
