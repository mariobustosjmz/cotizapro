'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  title?: string
}

interface ToastContextValue {
  toast: (opts: { message: string; variant?: ToastVariant; title?: string }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const TOAST_ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const TOAST_STYLES: Record<ToastVariant, string> = {
  success: 'border-emerald-500/30 bg-[#0F1117] text-emerald-400',
  error: 'border-red-500/30 bg-[#0F1117] text-red-400',
  warning: 'border-orange-500/30 bg-[#0F1117] text-orange-400',
  info: 'border-blue-500/30 bg-[#0F1117] text-blue-400',
}

const TOAST_DISMISS_MS = 4000

function SingleToast({
  item,
  onRemove,
}: {
  item: ToastItem
  onRemove: (id: string) => void
}) {
  const Icon = TOAST_ICONS[item.variant]

  useEffect(() => {
    const timer = setTimeout(() => onRemove(item.id), TOAST_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [item.id, onRemove])

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm',
        'shadow-lg w-80 max-w-[calc(100vw-2rem)]',
        'animate-toast-in',
        TOAST_STYLES[item.variant],
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {item.title && (
          <p className="text-sm font-semibold text-white/90 leading-tight mb-0.5">
            {item.title}
          </p>
        )}
        <p className="text-sm text-white/70 leading-snug">{item.message}</p>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        aria-label="Cerrar notificación"
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({
      message,
      variant = 'info',
      title,
    }: {
      message: string
      variant?: ToastVariant
      title?: string
    }) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev.slice(-4), { id, message, variant, title }])
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-label="Notificaciones"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <SingleToast item={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
