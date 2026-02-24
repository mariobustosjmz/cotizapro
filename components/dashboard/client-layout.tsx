'use client'

import { ToastProvider } from '@/components/ui/toast'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

function KeyboardShortcutsInit() {
  useKeyboardShortcuts()
  return null
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <KeyboardShortcutsInit />
      <main
        className="flex-1 overflow-y-auto p-6 page-transition"
        id="main-content"
        tabIndex={-1}
      >
        {children}
      </main>
    </ToastProvider>
  )
}
