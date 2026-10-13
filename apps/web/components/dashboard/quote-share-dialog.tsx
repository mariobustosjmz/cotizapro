'use client'

import { useState, useEffect } from 'react'
import { X, Mail, MessageCircle, Send, Loader2, CheckCircle2, AlertCircle, Clock, FileDown, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface QuoteShareDialogProps {
  open: boolean
  onClose: () => void
  quoteId: string
  quoteNumber: string
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  onSent?: () => void
}

interface NotificationRecord {
  id: string
  notification_type: 'email' | 'whatsapp'
  recipient: string
  status: string
  sent_at: string
}

export function QuoteShareDialog({
  open,
  onClose,
  quoteId,
  quoteNumber,
  clientName,
  clientEmail,
  clientPhone,
  onSent,
}: QuoteShareDialogProps) {
  const { toast } = useToast()
  const [sendVia, setSendVia] = useState<Set<'email' | 'whatsapp'>>(new Set())
  const [emailOverride, setEmailOverride] = useState('')
  const [whatsappOverride, setWhatsappOverride] = useState('')
  const [sending, setSending] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [emailReady, setEmailReady] = useState<boolean | null>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSendVia(new Set())
    setEmailOverride('')
    setWhatsappOverride('')
    setPdfUrl(null)
    setWhatsappUrl(null)
    setLoadingPdf(true)

    fetch('/api/messaging/channels')
      .then(res => res.ok ? res.json() : { data: { email: false } })
      .then((json: { data?: { email?: boolean } }) => setEmailReady(Boolean(json.data?.email)))
      .catch(() => setEmailReady(false))

    // Fetch notifications
    fetch(`/api/quotes/${quoteId}/notifications`)
      .then(res => res.ok ? res.json() : { data: [] })
      .then(json => setNotifications(json.data ?? []))
      .catch(() => setNotifications([]))

    // Fetch PDF preview
    fetch(`/api/export/quote/${quoteId}`)
      .then(res => {
        if (res.ok) {
          return res.blob()
        }
        throw new Error('Failed to load PDF')
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob)
        setPdfUrl(url)
      })
      .catch(error => {
        console.error('Error loading PDF preview:', error)
        setPdfUrl(null)
      })
      .finally(() => setLoadingPdf(false))
  }, [open, quoteId])

  if (!open) return null

  async function handleSend() {
    if (sendVia.size === 0) {
      toast({ message: 'Selecciona al menos un metodo de envio', variant: 'warning' })
      return
    }

    setSending(true)
    try {
      const body: Record<string, unknown> = {
        send_via: Array.from(sendVia),
      }
      if (emailOverride.trim()) body.email_override = emailOverride.trim()
      if (whatsappOverride.trim()) body.whatsapp_override = whatsappOverride.trim()

      const res = await fetch(`/api/quotes/${quoteId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        toast({ message: json.error || 'Error al enviar', variant: 'error' })
        return
      }

      const emailOk = json.results?.email?.success
      const link: string | undefined = json.results?.whatsapp?.url
      if (emailOk) toast({ message: 'Cotización enviada por correo', variant: 'success' })
      else if (sendVia.has('email')) toast({ message: 'No se pudo enviar el correo', variant: 'warning' })

      onSent?.()
      if (link) {
        setWhatsappUrl(link)
        return
      }
      onClose()
    } catch {
      toast({ message: 'Error de conexion al enviar', variant: 'error' })
    } finally {
      setSending(false)
    }
  }

  function toggleMethod(method: 'email' | 'whatsapp') {
    setSendVia(prev => {
      const next = new Set(prev)
      if (next.has(method)) {
        next.delete(method)
      } else {
        next.add(method)
      }
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Enviar Cotizacion</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{quoteNumber} - {clientName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* PDF Preview */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
            {loadingPdf ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cargando vista previa...</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="h-64 relative">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title={`Preview de ${quoteNumber}`}
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <FileDown className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">No se pudo cargar la vista previa</p>
                </div>
              </div>
            )}
          </div>

          {/* Method toggles */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Metodo de envio</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleMethod('email')}
                disabled={emailReady === false}
                className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  sendVia.has('email')
                    ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Mail className="w-4 h-4" />
                {emailReady === false ? (
                  <span>Correo <span className="text-[10px] font-semibold uppercase text-orange-600 dark:text-orange-400">Próximamente</span></span>
                ) : 'Correo'}
              </button>
              <button
                type="button"
                onClick={() => toggleMethod('whatsapp')}
                className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                  sendVia.has('whatsapp')
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
            {sendVia.has('whatsapp') && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Se abre tu WhatsApp con el mensaje listo; adjunta el PDF en la conversación.</p>
            )}
          </div>

          {whatsappUrl && (
            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 space-y-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Mensaje listo. Ábrelo en WhatsApp y adjunta el PDF.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="share-open-whatsapp"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir WhatsApp
                </a>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    download={`${quoteNumber}.pdf`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    <FileDown className="w-4 h-4" /> Descargar PDF
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Email override */}
          {sendVia.has('email') && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Email destinatario
              </label>
              <input
                type="email"
                value={emailOverride}
                onChange={e => setEmailOverride(e.target.value)}
                placeholder={clientEmail || 'correo@ejemplo.com'}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/30 focus:border-orange-300 dark:focus:border-orange-700"
              />
              {!clientEmail && !emailOverride && (
                <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">Cliente sin email, ingresa uno</p>
              )}
            </div>
          )}

          {/* WhatsApp override */}
          {sendVia.has('whatsapp') && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                WhatsApp destinatario
              </label>
              <input
                type="tel"
                value={whatsappOverride}
                onChange={e => setWhatsappOverride(e.target.value)}
                placeholder={clientPhone || '+52 555 123 4567'}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:focus:ring-green-500/30 focus:border-green-300 dark:focus:border-green-700"
              />
              {!clientPhone && !whatsappOverride && (
                <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">Cliente sin telefono, ingresa uno</p>
              )}
            </div>
          )}

          {/* Notification history */}
          {notifications.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Historial de envios</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 py-1">
                    {n.notification_type === 'email' ? (
                      <Mail className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <MessageCircle className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    )}
                    <span className="truncate flex-1">{n.recipient}</span>
                    {n.status === 'sent' || n.status === 'delivered' ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500 dark:text-green-400" />
                    ) : n.status === 'failed' ? (
                      <AlertCircle className="w-3 h-3 text-red-500 dark:text-red-400" />
                    ) : (
                      <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    )}
                    <span className="text-gray-400 dark:text-gray-500 shrink-0">
                      {new Date(n.sent_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 shrink-0 bg-white dark:bg-gray-900">
          <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>
            {whatsappUrl ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || sendVia.size === 0 || whatsappUrl !== null}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 mr-1" />
            )}
            {sending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
