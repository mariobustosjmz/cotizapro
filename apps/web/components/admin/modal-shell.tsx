'use client'

import { useEffect, useRef, type ReactNode } from 'react'

interface ModalShellProps {
  readonly labelledBy: string
  readonly className: string
  readonly onClose: () => void
  readonly children: ReactNode
}

/**
 * <dialog> nativo en modal: aporta Escape y contención del foco; aquí se restaura el foco al disparador.
 * Se escucha `cancel` y no `close`: el `close` del ciclo de montaje de StrictMode llega tarde y desmontaría el diálogo.
 */
export function ModalShell({ labelledBy, className, onClose, children }: ModalShellProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onCloseRef.current()
    }
    dialog.addEventListener('cancel', handleCancel)
    dialog.showModal()
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
      if (dialog.open) dialog.close()
      trigger?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      className={`m-auto w-full bg-transparent p-4 text-left backdrop:bg-black/50 ${className}`}
    >
      {children}
    </dialog>
  )
}
